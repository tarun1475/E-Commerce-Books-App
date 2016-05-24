function define(obj, name, value) {
    Object.defineProperty(obj, name, {
        value:        value,
        enumerable:   true,
        writable:     false,
        configurable: false
    });
}

exports.responseFlags = {};
define(exports.responseFlags, "ACTION_FAILED",       144);
define(exports.responseFlags, "ACTION_COMPLETE",     143);

exports.databaseErrorResponse = {
  "log": "Server execution error",
  "flag": 144
};

