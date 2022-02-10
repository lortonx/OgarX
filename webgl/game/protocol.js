const { EventEmitter } = require("events");
const Reader = require("../../src/network/reader");
const Writer = require("../../src/network/writer");
const ReplayDB = require("./replay-db");
const { deserialize } = require("./custom-bson");
const FakeSocket = require("./fake-socket");

// const uuidv4 = () => ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
//     (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));

const PREVIEW_WIDTH = 1920 >> 2;
const PREVIEW_HEIGHT = 1080 >> 2;
const REPLAY_PREVIEW_FPS = 5;
const REPLAY_LENGTH = 20;

class ReplaySnapshot {
    constructor(length = 0) {
        this.score = 0;
        this.state = new ArrayBuffer(length);
        this.view = new Uint8Array(this.state);

        /** @type {number[]} */
        this.packetTimestamps = [];
        /** @type {ArrayBuffer[]} */
        this.packets = [];
        
        this.preview = new OffscreenCanvas(PREVIEW_WIDTH, PREVIEW_HEIGHT);
        this.ctx = this.preview.getContext("2d");
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = "high";
    }

    clearPreview() {
        this.ctx.clearRect(0, 0, this.preview.width, this.preview.height);
    }
}

class ReplaySystem {

    /**
     * @param {import("./renderer")} renderer
     * @param {import("./protocol")} protocol
     * @param {number} length
     */
    constructor(renderer, protocol, length) {
        this.t = 0;
        this.i = 0;

        this.protocol = protocol;
        this.renderer = renderer;

        this.source = new Uint8Array(renderer.core.buffer, 0, renderer.INDICES_OFFSET);
        this.snapshots = Array.from({ length: length * REPLAY_PREVIEW_FPS }, _ => new ReplaySnapshot(this.source.byteLength));
        
        const pool = this.sharedArrayBuffer = new SharedArrayBuffer(this.snapshots.length * PREVIEW_WIDTH * PREVIEW_HEIGHT * 4);
        console.log(`${(pool.byteLength / 1024 / 1024).toFixed(1)}MB preview buffer allocated for GIF generation`);
        this.previewPool = new Uint8ClampedArray(this.sharedArrayBuffer);
        this.renderer.loader.postMessage({ pool });
    }

    async init() {
        this.db = await ReplayDB();
    }

    encodePlayerData() {
        const writer = new Writer();
        writer.skip(1);
        const w = this.renderer.playerData.filter((p, i) => {
            if (!i || i > 250 || !p) return;
            writer.writeUInt8(i);
            writer.writeUTF16String(p.name || "");
            writer.writeUTF16String(p.skin || "");
            return true;
        });
        const end = writer.offset;
        writer.offset = 0;
        writer.writeUInt8(w.length);
        writer.offset = end;
        return writer.finalize();
    }

    /** @param {ArrayBuffer} state */
    encodeState(state) {
        const oldState = this.source.slice();
        this.source.set(new Uint8Array(state));
        const buffer = this.renderer.serializeState();
        this.source.set(oldState);
        return buffer;
    }

    async save() {
        if (this.saving) return self.postMessage(
            { event: "warning", message: "Saving Current Clip, Please Try Again Later." });
            
        this.saving = true;
        const snapshots = this.snapshots.filter(s => s.packets.length).map(s => s).reverse();

        /** @type {ArrayBuffer[]} */
        const buffers = snapshots.reduce((prev, curr) => 
            prev.concat(curr.packets), []).map(b => b.slice());

        /** @type {number[]} */
        let tArray = snapshots.reduce((prev, curr) => prev.concat(curr.packetTimestamps), []);
        const minTimestamp = Math.min(...tArray);
        tArray = tArray.map(t => t - minTimestamp);

        const handshake = this.protocol.HANDSHAKE_PACKET;
        const players = this.encodePlayerData();
        const timestamps = new Float32Array(tArray).buffer;

        const initial = this.encodeState(snapshots[0].state);

        let index = 0;

        self.postMessage({ event: "replay", state: "starting" });

        // Job takes too long, spread it out to per frame
        while (index < snapshots.length) {
            await new Promise(resolve => {
                const imageData = snapshots[index].ctx.getImageData(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
                // Write the preview backward
                this.previewPool.set(imageData.data, imageData.data.byteLength * ~~index);
                index++;
                requestAnimationFrame(resolve);
            });
        }

        const replay = { handshake, initial, buffers, timestamps, players, 
            PREVIEW_WIDTH, PREVIEW_HEIGHT,
            REPLAY_PREVIEW_FPS, PREVIEW_LENGTH: snapshots.length };
        this.renderer.loader.postMessage({ replay }, buffers);
    }

    set score(v) {
        this.snapshots[0].score = Math.max(v, this.snapshots[0].score);
    }

    get maxScore() { return Math.max(...this.snapshots.map(s => s.score)); }

    // Record current state
    recordState() {
        if (this.curr) return;

        const tail = this.snapshots.pop();
        this.free(tail);
        this.snapshots.unshift(tail);
        tail.view.set(this.source);
        this.score = this.renderer.stats.score;
        this.requestPreview = true;
    }

    savePreview() {
        if (!this.requestPreview) return;
        this.requestPreview = false;
        const s = this.snapshots[0];
        s.clearPreview();
        s.ctx.drawImage(this.renderer.canvas, 0, 0, s.preview.width, s.preview.height);
    }

    /** @param {ArrayBuffer} packet */
    recordPacket(packet) {
        this.snapshots[0].packets.push(packet);
        this.snapshots[0].packetTimestamps.push(performance.now());
    }

    /** @param {ReplaySnapshot} snapshot */
    free(snapshot) {
        this.renderer.loader.postMessage(snapshot.packets, snapshot.packets);
        snapshot.score = 0;
        snapshot.view.fill(0);
        snapshot.packets = [];
        snapshot.packetTimestamps = [];
    }

    resetSnapshots() {
        this.snapshots.forEach(s => this.free(s));
    }

    async load(id = 0) {
        /** @type {{ buffers: ArrayBuffer[], players: ArrayBuffer }} */
        const data = await new Promise((resolve, reject) => {
            const tx = this.db.transaction(["replay-data"], "readonly");
            const dataStore = tx.objectStore("replay-data");
            const req = dataStore.get(id);
            tx.oncomplete = () => resolve(deserialize(req.result));
            tx.onerror = reject;
        });

        const initial = new Uint8Array(data.initial);
        const timestamps = new Float32Array(data.timestamps);
        this.curr = { initial, timestamps, packets: data.buffers };

        console.assert(this.curr.timestamps.length === this.curr.packets.length,
            "Packet and timestamp length MUST match");

        if (data.handshake) this.protocol.onMessage({ data: data.handshake });
        this.protocol.parsePlayers(data.players);

        console.log("Replay loaded", this.curr);
    }

    update(dt = 0) {
        if (!this.curr) return;
        // Overwrite state
        if (!this.t) {
            this.source.fill(0);
            const core = this.renderer.core;
            core.HEAPU8.set(this.curr.initial, this.renderer.INDICES_OFFSET);                 
            core.instance.exports.deserialize(0, this.renderer.INDICES_OFFSET);
        }
        // "Receive" packet
        while (this.curr.timestamps[this.i] < this.t)
            this.protocol.onMessage({ data: this.curr.packets[this.i++] });

        // Loop
        if (this.i >= this.curr.timestamps.length) this.resetTrack();
        else this.t += dt;
    }

    resetTrack() {
        this.i = 0;
        this.t = 0;
        this.renderer.camera.tp = true;
    }
}

const RecordOPs = [2, 4];

module.exports = class Protocol extends EventEmitter {
    
    /** @param {import("./renderer")} renderer */
    constructor(renderer) {
        super();
        this.pid = 0;
        this.bandwidth = 0;
        this.renderer = renderer;
        this.replay = new ReplaySystem(renderer, this, REPLAY_LENGTH);
        this.map = { hw: 10000, hh: 10000 };
        this.setupIntervals();
        this.onMessage = this.onMessage.bind(this);
    }

    get connecting() { return this.ws && this.ws.readyState == WebSocket.CONNECTING; }
    get connected() { return this.ws && this.ws.readyState == WebSocket.OPEN; }

    disconnect() {
        this.connected && this.ws.close();
        
        delete this.replay.curr; 
        this.replay.resetTrack();
    }

    connect(urlOrPort, uid="", name = "", skin1 = "", skin2 = "") {

        this.disconnect();
        const currWs = this.ws = (typeof urlOrPort == "string") ? new WebSocket(`${urlOrPort}?${uid}`) : new FakeSocket(urlOrPort);
        this.ws.binaryType = "arraybuffer";

        this.ws.onopen = () => {
            this.renderer.clearCells();

            const writer = new Writer();
            writer.writeUInt8(69);
            writer.writeInt16(420);
            writer.writeUTF16String(name);
            writer.writeUTF16String(skin1);
            writer.writeUTF16String(skin2);
            this.ws.send(writer.finalize());
            this.emit("open");

            delete this.ping;
        }

        this.ws.onmessage = this.onMessage;

        this.ws.onerror = _ => self.postMessage({
            event: "error",
            message: "Connection failed"
        });

        this.ws.onclose = e => {
            this.bandwidth = 0;
            delete this.ping;
            delete this.dualIDs;

            this.emit("close");

            if (this.ws == currWs) {
                self.postMessage({ 
                    event: "disconnect", 
                    code: e.code, 
                    reason: e.reason 
                });
            }
        }
    }

    setupIntervals() {

        this.replayInterval = self.setInterval(() => this.replay.recordState(), 1000 / REPLAY_PREVIEW_FPS);

        this.pingInterval = self.setInterval(() => {
            this.renderer.stats.bandwidth = this.bandwidth;
            this.bandwidth = 0;
            
            if (!this.connected || !this.pid || this.ping) return;
            
            const PING = new ArrayBuffer(1);
            new Uint8Array(PING)[0] = 69;
            this.send(PING);
            this.ping = Date.now();
        }, 1000);

        const state = this.renderer.state;
        this.mouseInterval = self.setInterval(() => {
            if (!this.connected || !this.pid || !this.renderer.state.visible) return;

            const writer = new Writer();
            writer.writeUInt8(3);
            writer.writeFloat32(this.renderer.cursor.position[0]);
            writer.writeFloat32(this.renderer.cursor.position[1]);

            const currState = state.exchange();

            let spectate = 0;
            if (state.spectate) {
                state.spectate = 0;
                spectate = 255;
            } else if (currState.clicked) {
                spectate = this.renderer.getClickedPlayerID();
            }

            writer.writeUInt8(spectate);
            writer.writeUInt8(currState.splits);
            writer.writeUInt8(currState.ejects);
            writer.writeUInt8(currState.macro);
            writer.writeUInt8(currState.lineLock);
            writer.writeUInt8(currState.switch_tab);

            this.send(writer.finalize());

            if (currState.respawn) this.spawn(this.lastName, this.lastSkin1, this.lastSkin2);
            if (currState.clip && !this.replaying) this.replay.save();
        }, 1000 / 33); // TODO?
    }

    send(data) {
        this.connected && this.ws.send(data);
    }

    /** @param {{ data: ArrayBuffer }} e */
    onMessage(e) {
        const reader = new Reader(new DataView(e.data));
        const OP = reader.readUInt8();
        this.bandwidth += e.data.byteLength;

        switch (OP) {
            case 1:
                this.HANDSHAKE_PACKET = e.data;
                const pid1 = reader.readUInt8();
                const pid2 = reader.readUInt8();
                if (pid2) this.dualIDs = [pid1, pid2];
                this.map.hw = reader.readUInt16();
                this.map.hh = reader.readUInt16();
                console.log(`Map Dimension: ${this.map.hw << 1}x${this.map.hh << 1}`);
                const server = reader.readUTF16String();
                const uid = reader.readUTF8String();
                this.emit("protocol");
                if (!this.replaying) self.postMessage({ event: "connect", server, uid });
                break;
            case 2:
                this.renderer.clearCells();
                break;
            case 3:
                const id = reader.readUInt16();
                const name = reader.readUTF16String();
                const skin = reader.readUTF16String();
                this.renderer.loadPlayerData({ id, name, skin });
                break;
            case 4:
                this.parseCellData(e.data);
                break;
            // Leaderboard
            case 5:
                this.parseLeaderboard(reader);
                break;
            // Minimap
            case 6:
                this.parseMinimap(reader);
                break;
            // Stats
            case 7:
                this.parseStats(reader);
                if (this.renderer.state.auto_respawn) {
                    const RESPAWN = new ArrayBuffer(1);
                    new Uint8Array(RESPAWN)[0] = 7;
                    this.send(RESPAWN);
                }
                break;
            // Chat
            case 10:
                self.postMessage({ event: "chat", message: reader.readUTF16String() });
                break;
            // Log
            case 11:
                self.postMessage({ event: "server-log", message: reader.readUTF16String() });
                break;
            // PONG
            case 69:
                if (!this.ping) return;
                this.renderer.stats.ping = Date.now() - this.ping;
                delete this.ping;
                break;
        }
        
        if (!this.replaying && RecordOPs.includes(OP) && 
            (this.renderer.target.position[0] || this.renderer.target.position[1])) // monke check
            this.replay.recordPacket(e.data);
    }

    get player() { 
        if (Array.isArray(this.dualIDs)) return this.renderer.playerData[this.dualIDs[0]];
        return this.renderer.playerData[this.pid]; 
    }

    /** @param {ArrayBuffer} buffer */
    parsePlayers(buffer) {
        const reader = new Reader(new DataView(buffer));
        const length = reader.readUInt8();
        for (let i = 0; i < length; i++) {
            const data = { 
                id: reader.readUInt8(),
                name: reader.readUTF16String(), 
                skin: reader.readUTF16String()
            };
            this.renderer.loadPlayerData(data);
        }
    }

    /** @param {ArrayBuffer} buffer */
    parseCellData(buffer) {
        this.lastPacket = this.renderer.lastTimestamp;

        const r = this.renderer;
        const core = this.renderer.core;
        const header = new DataView(buffer, 1, 24);
        this.pid = header.getUint8(0);
        const prev = this.renderer.stats.mycells;
        const curr = header.getUint16(1, true);
        if (this.replaying && !prev && curr) r.camera.tp = true;
        r.stats.mycells = curr;
        r.stats.linelocked = header.getUint8(3);
        r.stats.score = header.getFloat32(4, true);
        r.syncMouse.x = header.getFloat32(8, true);
        r.syncMouse.y = header.getFloat32(12, true);
        r.target.position[0] = header.getFloat32(16, true);
        r.target.position[1] = header.getFloat32(20, true);
        
        core.HEAPU8.set(new Uint8Array(buffer, 25), r.INDICES_OFFSET);                 
        core.instance.exports.deserialize(0, r.INDICES_OFFSET);
    }

    /** @param {Reader} reader */
    parseLeaderboard(reader) {
        const rank = reader.readInt16();
        const count = reader.readUInt8();
        const lb = { rank, me: this.player, players: [] }
        for (let i = 0; i < count; i++) lb.players.push(
            this.renderer.playerData[reader.readUInt8()]);
        self.postMessage({ event: "leaderboard", lb });
    }

    /** @param {Reader} reader */
    parseMinimap(reader) {
        const count = reader.readUInt8();
        const minimap = [];
        for (let i = 0; i < count; i++) {
            const pid = reader.readUInt8();
            const player = this.renderer.playerData[pid] || {};
            player.id = pid;
            if (Array.isArray(this.dualIDs) ? this.dualIDs.includes(pid) : 
                this.pid == pid) player.me = true;
            const x = reader.readFloat32(), y = reader.readFloat32();
            player.x = x / (this.map.hw << 1) + 0.5;
            player.y = y / (this.map.hh << 1) + 0.5;
            player.score = reader.readFloat32();
            minimap.push(player);
        }
        self.postMessage({ event: "minimap", minimap });
    }

    /** @param {Reader} reader */
    parseStats(reader) {
        const kills = reader.readUInt32();
        const score = reader.readFloat32();
        const surviveTime = reader.readFloat32();
        self.postMessage({ event: "stats", kills, score, surviveTime });
    }

    /**
     * @param {string} name 
     * @param {string} skin1
     * @param {string} skin2
     */
    spawn(name, skin1, skin2) {
        const writer = new Writer();
        writer.writeUInt8(1);
        writer.writeUTF16String(name || "");
        writer.writeUTF16String(skin1 || "");
        writer.writeUTF16String(skin2 || "");
        this.send(writer.finalize());

        this.lastName = name;
        this.lastSkin1 = skin1;
        this.lastSkin2 = skin2;
    }

    sendChat(message) {
        const writer = new Writer();
        writer.writeUInt8(10);
        writer.writeUTF16String(message);
        this.send(writer.finalize());
    }

    get replaying() { return !!this.replay.curr; }

    async startReplay(id = 0) {
        this.disconnect();  
        this.renderer.cleanup();      
        await this.replay.load(id);
    }
}