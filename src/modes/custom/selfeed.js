/** @type {typeof import("../../physics/engine").DefaultSettings} */
module.exports = {
    TIME_SCALE: 1.2, // magic that make everything work like a certain ball game

    PLAYER_MAX_CELLS: 32,
    PLAYER_MERGE_NEW_VER: false,
    PLAYER_AUTOSPLIT_SIZE: 2000,
    PLAYER_MERGE_TIME: 0,
    PLAYER_NO_MERGE_DELAY: 800,//900
    PLAYER_SPEED: 0.9,

    VIRUS_COUNT: 40,
    VIRUS_SIZE: 125,
    VIRUS_PUSH: true,
    VIRUS_MONOTONE_POP: false,

    EJECT_SIZE: 48,//85,
    EJECT_LOSS: 43,//81
    EJECT_DELAY: 40,

    BOTS: 10, 
    BOT_SPAWN_SIZE: 400,
    PELLET_COUNT: 3000,
    PLAYER_VIEW_SCALE: 1.2,
    PLAYER_SPAWN_SIZE: 500,
    PLAYER_SPAWN_DELAY: 10,
    PLAYER_SPLIT_DIST: 80,
    PLAYER_MIN_SPLIT_SIZE: 150,
    PLAYER_MIN_EJECT_SIZE: 90,

    DECAY_MIN: 200,
    STATIC_DECAY: 15,
    DYNAMIC_DECAY: 0.3,
    DUAL_ENABLED: false,
    PLAYER_AUTOSPLIT_DELAY: 5,
    PLAYER_VIEW_SCALE: 1,
    MAP_HW: 10071,
    MAP_HH: 10071,
    NORMALIZE_THRESH_MASS: 100000000,//100000
    PLAYER_SAFE_SPAWN_RADIUS: 1.2
    
};