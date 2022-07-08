/** @type {typeof import("../../physics/engine").DefaultSettings} */
module.exports = {
    // Like Arctida
    SOCKET_RECONNECT:2,
    PHYSICS_TPS: 30,
    MAX_CELL_PER_TICK: 1000,
    MAP_HW: 7071,
    MAP_HH: 7071,


    TIME_SCALE: 1.2,//1.2, // magic that make everything work like a certain ball game
    PLAYER_MAX_CELLS: 16,
    PLAYER_AUTOSPLIT_SIZE: 2000,
    PLAYER_MERGE_NEW_VER: true, // Работает только когда merge time > 0

    PLAYER_MERGE_TIME: 30,
    PLAYER_MERGE_INCREASE: 10.8,

    PLAYER_NO_MERGE_DELAY: 30,//750,//900
    PLAYER_NO_EJECT_DELAY:0,

    PLAYER_SPEED: 1.1, // okr

    VIRUS_COUNT: 40,//60,
    VIRUS_SIZE: 100,
    VIRUS_PUSH: false,
    VIRUS_SPLIT_BOOST: 820,
    VIRUS_MONOTONE_POP: false,
    VIRUS_FEED_TIMES: 6,
    VIRUS_MAX_BOOST: 0,//5500, // разлетание частиц при попе

    EJECT_BOOST: 780,
    EJECT_SIZE: 38,//85,
    EJECT_LOSS: 33,//81
    EJECT_DELAY: 135,
    EJECT_DISPERSION: 0.25,
    EJECT_MAX_AGE: 1000*60*5,

    BOTS: 15, 
    BOT_SPAWN_SIZE: 300,
    PELLET_COUNT: 2500,
    // PLAYER_VIEW_SCALE: 1.2,
    PLAYER_SPAWN_SIZE: 200,//550,
    PLAYER_SPAWN_DELAY: 10,
    PLAYER_NO_COLLI_DELAY: 510,// 650 пружинит при сплите
    PLAYER_MIN_SPLIT_SIZE: 60,//120,//150,
    /** Минимальная масса игрока для выброса */
    PLAYER_MIN_EJECT_SIZE: 64,//80,//90,
    PLAYER_NO_EJECT_POP_DEALY: 100,

  

    PLAYER_VIEW_SCALE: 0.49,
    PLAYER_VIEW_MIN: 4000,
    EAT_OVERLAP: 3,
    PLAYER_SPLIT_BOOST: 780,
    PLAYER_SPLIT_DIST: 40,//80,
    PLAYER_SPLIT_CAP: 255,//4, // количество попыток спавна

    DECAY_MIN: 200,
    STATIC_DECAY: 1,//15
    DYNAMIC_DECAY: 0.3,
    DUAL_ENABLED: false,
    PLAYER_AUTOSPLIT_DELAY: 5,
    // PLAYER_VIEW_SCALE: 0.8,

    NORMALIZE_THRESH_MASS: 10000000,//100000
    PLAYER_SAFE_SPAWN_RADIUS: 1.2,


    PLAYER_SPAWN_DELAY: -100,
    DUAL_ENABLED: true,
};