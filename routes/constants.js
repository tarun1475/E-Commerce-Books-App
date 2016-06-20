/**
 * @module constants
 */
function define(obj, name, value) {
    Object.defineProperty(obj, name, {
        value:        value,
        enumerable:   true,
        writable:     false,
        configurable: false
    });
}

/*
 * Standard Response flags
 */
exports.responseFlags = {};
define(exports.responseFlags, "ACTION_FAILED"       , 144);
define(exports.responseFlags, "ACTION_COMPLETE"     , 143);
define(exports.responseFlags, "NOT_LOGGED_IN"       , 401);
define(exports.responseFlags, "NOT_AUTHORIZED"      , 403);

/*
 * Common response sent during server execution failure
 */
exports.databaseErrorResponse = {
  "log": "Server execution error",
  "flag": 144
};

/*
 * Device Type
 */
exports.deviceType = {};
define(exports.deviceType, "ANDROID"                 , 1);
define(exports.deviceType, "iOS"                     , 2);

/*
 * Android Ids for server
 */
exports.serverAndroidIDs = {};
define(exports.serverAndroidIDs, "PUSH_NOTIFICATION_SERVER_ID"           , 1);

