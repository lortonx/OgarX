/** @type {typeof import("../../physics/engine").DefaultSettings} */
module.exports = {
    // Like Arctida
    TIME_SCALE: 1,//1.2, // magic that make everything work like a certain ball game
    PLAYER_MAX_CELLS: 64,
    PLAYER_MERGE_NEW_VER: true,
    PLAYER_AUTOSPLIT_SIZE: 2000,
    PLAYER_MERGE_TIME: 0,
    PLAYER_NO_MERGE_DELAY: 900,//900
    PLAYER_NO_EJECT_DELAY:0,

    PLAYER_SPEED: 0.8,

    PHYSICS_TPS: 20,
    MAX_CELL_PER_TICK: 50,

    VIRUS_COUNT: 40,
    VIRUS_SIZE: 100,
    VIRUS_PUSH: false,
    VIRUS_SPLIT_BOOST: 1220,
    VIRUS_MONOTONE_POP: false,
    VIRUS_FEED_TIMES: 6,
    VIRUS_MAX_BOOST: 5000, // разлетание частиц при попе

    EJECT_SIZE: 38,//85,
    EJECT_LOSS: 33,//81
    EJECT_DELAY: 135,
    EJECT_DISPERSION: 0.25,

    BOTS: 15, 
    BOT_SPAWN_SIZE: 600,
    PELLET_COUNT: 2000,
    // PLAYER_VIEW_SCALE: 1.2,
    PLAYER_SPAWN_SIZE: 500,
    PLAYER_SPAWN_DELAY: 10,
    PLAYER_SPLIT_DIST: 80,
    PLAYER_NO_COLLI_DELAY: 650,// пружинит при сплите
    PLAYER_MIN_SPLIT_SIZE: 120,//150,
    PLAYER_MIN_EJECT_SIZE: 64,//80,//90,
    PLAYER_NO_EJECT_POP_DEALY: 100,
    // PLAYER_MERGE_INCREASE: 100,
    PLAYER_VIEW_SCALE: 0.49,
    PLAYER_VIEW_MIN: 2000,
    PLAYER_SPLIT_BOOST:800,

    DECAY_MIN: 200,
    STATIC_DECAY: 15,
    DYNAMIC_DECAY: 0.3,
    DUAL_ENABLED: false,
    PLAYER_AUTOSPLIT_DELAY: 5,
    PLAYER_VIEW_SCALE: 0.8,
    MAP_HW: 10071,
    MAP_HH: 10071,
    NORMALIZE_THRESH_MASS: 100000000,//100000
    PLAYER_SAFE_SPAWN_RADIUS: 1.2,

    SOCKET_RECONNECT:2,
    PLAYER_SPAWN_DELAY: 100,
    EJECT_MAX_AGE: 40000,
};