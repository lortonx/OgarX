/** @type {typeof import("../../physics/engine").DefaultSettings} */
module.exports = {
    TIME_SCALE: 1.2, // magic that make everything work like a certain ball game
    PLAYER_MAX_CELLS: 192,
    PLAYER_MERGE_NEW_VER: true,
    PLAYER_AUTOSPLIT_SIZE: 0,
    PLAYER_MERGE_TIME: 0,
    PLAYER_NO_MERGE_DELAY: 900,
    PLAYER_SPEED: 2,

    VIRUS_COUNT: 10,
    VIRUS_SIZE: 125,
    VIRUS_PUSH: true,
    VIRUS_MONOTONE_POP: false,

    EJECT_SIZE: 75,//75,// 68,//85,
    EJECT_LOSS: 70,// 64,//80,
    EJECT_DELAY: 80,// 80,//100,
    BOTS: 40,
    BOT_SPAWN_SIZE: 1000,
    PELLET_COUNT: 2000,
    PLAYER_VIEW_SCALE: 1.2,
    PLAYER_SPAWN_SIZE: 2000,
    PLAYER_SPAWN_DELAY: 1500,
    PLAYER_SPLIT_DIST: 80,
    PLAYER_MIN_SPLIT_SIZE: 150,
    PLAYER_MIN_EJECT_SIZE: 100,
    MAP_HW: 26000,
    MAP_HH: 26000,
    NORMALIZE_THRESH_MASS: 100000,
    PLAYER_SAFE_SPAWN_RADIUS: 1.2
};