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

exports.responseFlags = {};
define(exports.responseFlags, "ACTION_FAILED"       , 144);
define(exports.responseFlags, "ACTION_COMPLETE"     , 143);

exports.databaseErrorResponse = {
  "log": "Server execution error",
  "flag": 144
};

exports.deviceType = {};
define(exports.deviceType, "ANDROID"                 , 1);
define(exports.deviceType, "iOS"                     , 2);

exports.serverAndroidIDs = {};
define(exports.PUSH_NOTIFICATION_SERVER_ID           , 1);

