const fs = require("fs");
const pm2 = require("pm2");
const path = require("path");

/** @type {pm2.StartOptions[]} */
const DefaultProcesses = [
    {
        name: "Server1",
        env: {
            OGARX_MODE: "default/mega",
            OGARX_PORT: process.env.PORT,
            OGARX_SERVER: "Megasplit",
            OGARX_ENDPOINT: "mega",
            OGARX_TOKEN: process.env.OGARX_TOKEN
        }
    },
    // {
    //     name: "Instant",
    //     env: {
    //         OGARX_MODE: "default/instant",
    //         OGARX_PORT: process.env.PORT,
    //         OGARX_SERVER: "Instant",
    //         OGARX_ENDPOINT: "instant",
    //         OGARX_TOKEN: process.env.OGARX_TOKEN
    //     }
    // },
    // {
    //     name: "Ex-Geminia",
    //     env: {
    //         OGARX_MODE: "default/extreme-omega",
    //         OGARX_PORT: process.env.PORT,
    //         OGARX_SERVER: "extreme-omega",
    //         OGARX_ENDPOINT: "ex-geminia",
    //         OGARX_TOKEN: process.env.OGARX_TOKEN
    //     }
    // },
    {
        name: "Geminia",
        env: {
            OGARX_MODE: "default/selfeed2",
            OGARX_PORT: process.env.PORT,
            OGARX_SERVER: "Selfeed",
            OGARX_ENDPOINT: "selfeed",
            OGARX_TOKEN: process.env.OGARX_TOKEN
        }
    },
    // {
    //     name: "Geminia",
    //     env: {
    //         OGARX_MODE: "default/mega",
    //         OGARX_PORT: process.env.PORT,
    //         OGARX_SERVER: "Megasplit",
    //         OGARX_ENDPOINT: "geminia",
    //         OGARX_TOKEN: process.env.OGARX_TOKEN
    //     }
    // }
];

/** @type {pm2.StartOptions[]} */
let config = null;

if (!fs.existsSync("config.json")) {
    fs.writeFileSync("config.json", JSON.stringify(DefaultProcesses, null, 4));
    config = DefaultProcesses;
} else {
    config = require("./config.json");
}

const validateMode = mode => fs.existsSync(path.resolve(__dirname, "src", "modes", `${mode}.js`));

const { GATEWAY_PORT, GATEWAY_ORIGIN } = process.env;

/** @type {pm2.StartOptions[]} */
const procToStart = [];

for (const proc of config) {
    proc.cwd = __dirname;
    proc.script = "./src/index.js";
    proc.max_memory_restart = "300M";
    proc.kill_timeout = 7000;

    if (validateMode(proc.env.OGARX_MODE)) {
        procToStart.push(proc);
    } else {
        console.warn(`Unable to find mode "${proc.env.OGARX_MODE}", aborting process "${proc.name}"`);
    }
}

pm2.connect(err => {
    if (err) return console.error("Failed to connect to pm2", err);
    pm2.start({
        name: "Gateway",
        cwd: __dirname,
        script: "./src/gateway.js",
        wait_ready: true,
        env: { GATEWAY_PORT:3001, GATEWAY_ORIGIN }
    }, e => {
        if (e) console.error(e);
        else console.log("Gateway Process started");

        Promise.all(procToStart.map(proc => new Promise(res => {        
            pm2.start(proc, e => {
                if (e) console.error(e);
                else  console.log(`PM2 Process "${proc.name}" ` +
                    `(${proc.env.OGARX_MODE}-${proc.env.OGARX_SERVER}) mounted on ` +
                    `:${proc.env.OGARX_PORT || 443}/${proc.env.OGARX_ENDPOINT}`);
                res();
                // throw console.log('roc.env.OGARX_PORT', proc.env.OGARX_PORT)
                pm2.launchBus((err, bus) => {
                    console.log('[PM2] Log streaming started');
              
                    bus.on('log:out', function(packet) {
                     console.log('[App:%s] %s', packet.process.name, packet.data);
                    });
              
                    bus.on('log:err', function(packet) {
                      console.error('[App:%s][Err] %s', packet.process.name, packet.data);
                    });
                  });
            });
        })))//.then(() => process.exit(0));
    });
});