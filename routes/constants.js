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

/**
 * Standard Response flags
 */
exports.responseFlags = {};
define(exports.responseFlags, "ACTION_FAILED"       , 144);
define(exports.responseFlags, "ACTION_COMPLETE"     , 143);
define(exports.responseFlags, "NOT_LOGGED_IN"       , 401);
define(exports.responseFlags, "NOT_AUTHORIZED"      , 403);
define(exports.responseFlags, "INTERNAL_SERVER_ERR" , 500);

/**
 * Common response sent during database execution error
 * @type {{log: string, flag: number}}
 */
exports.databaseErrorResponse = {
  "log": "Server execution error",
  "flag": 144
};

/**
 * Common response sent during missing parameters
 * @type {{log: string, flag: number}}
 */
exports.parameterMissingResponse = {
    "log": "Some parameters are missing/invalid",
    "flag": 144
};
/**
 * Device Type
 */
exports.deviceType = {};
define(exports.deviceType, "ANDROID"                 , 1);
define(exports.deviceType, "iOS"                     , 2);

/**
 * Android Ids for server
 */
exports.serverAndroidIDs = {};
define(exports.serverAndroidIDs, "PUSH_KEY_VENDOR_AUTH"           , "AIzaSyDAmesOOo-F0nLdP_2CaZzI8zA_dM7NZFQ");
define(exports.serverAndroidIDs, "PUSH_KEY_CUSTOMER_AUTH"         , "AIzaSyBhg-g1sAc57UUJqnSWdyqkFFJzTmIs7EI");

/**
 * Constants for book request status
 */
exports.bookRequestStatus = {};
define(exports.bookRequestStatus, "PENDING"           , 0);
define(exports.bookRequestStatus, "APPROVED"          , 1);
define(exports.bookRequestStatus, "DISAPPROVED"       , 2);

/**
 * Constants for user type
 */
exports.userType = {};
define(exports.userType, "USERS"                       , 0);
define(exports.userType, "VENDORS"                     , 1);

/**
 * Constants for user account status
 */
exports.userAccountStatus = {};
define(exports.userAccountStatus, "UNBLOCKED"          , 0);
define(exports.userAccountStatus, "BLOCKED"            , 1);

exports.deliveryCharges = {};
define(exports.deliveryCharges, "URGENT_DELIVERY"      , 30);


/**
 * OTP API key
 */
exports.sendotp = {};
define(exports.sendotp, "API_KEY"                      ,
 "9Fms2JislBIgnYgRkjLp29uy1xAl-uh2zK1RbUd2AO6MWhuSHAQDRT3TuJKxzOI_pqHxV-rnKhRolMPFYWT3Tn7HHgc5Y9RL1oopyp1tO1kxeegf7gzy0rrduS6Na3JVndBudytFTJgdvuJiRpheRNlqpCtZFRqem1kl_J2Vra8=");
define(exports.sendotp, "API_LINK", "https://sendotp.msg91.com/api/generateOTP");

/**
 * Panel API key
 */
exports.adminPanel = {};
//define(exports.adminPanel, "ACCESS_TOKEN"                      , "6vnZSz78C+kLxHfveUbAwgi4JwFj4zwk+AWjgEZw+K");
define(exports.adminPanel, "ACCESS_TOKEN"                      , "27f5cc7f0fc4372148192822e1129bd7e987a9720097201d9c42d9c6829ca7be");

/**
 * Amazon S3 credentials
 */
exports.credentialsS3 = {};
define(exports.credentialsS3, "accessKeyId"                    , "AKIAI4B2VIXTHFEMEWJA");
define(exports.credentialsS3, "secretAccessKey"                , "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");
