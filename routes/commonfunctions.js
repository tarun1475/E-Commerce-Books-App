/**
 * @module Commonfunctions
 */
/////////////////////////////////////////////////////////////////////////
// REQUIRED MODULES
/////////////////////////////////////////////////////////////////////////

var gcm            = require('node-gcm');
var request        = require('request');
var apns           = require('apn');
var constants      = require('./constants');
var messenger      = require('./messenger');
var logging        = require('./logging');
var users          = require('./users');

exports.checkBlank                     = checkBlank;
exports.sendIosPushNotification        = sendIosPushNotification;
exports.sendAndroidPushNotification    = sendAndroidPushNotification;
exports.sendNotification               = sendNotification;
exports.sendNotificationToDevice       = sendNotificationToDevice;
exports.verifyClientToken              = verifyClientToken;
exports.sendOTP                        = sendOTP;
exports.verifyOTP                      = verifyOTP;
exports.verifyPanelToken               = verifyPanelToken;
exports.logRequest                     = logRequest;
exports.loginUser                      = loginUser;
/**
 * Function to check missing parameters in the API.
 * @param arr
 * @returns {number}
 */
function checkBlank(arr)
{
    var arrlength = arr.length;
    for (var i = 0; i < arrlength; i++)
    {
        if (arr[i] === '' || arr[i] === "" || arr[i] == undefined)
        {
            return 1;
            break;
        }

    }

    return 0;
}

/**
 * function for sending push notifications for iOS device
 * @param iosDeviceToken - device token of that particular device
 * @param message - message to be sent
 * @param flag - flag for it
 * @param payload - payload
 */
function sendIosPushNotification(iosDeviceToken, message, flag, payload) {
  var status = 1;
  var msg = message;
  var snd = 'ping.aiff';
  if(flag == 2 || flag == 4 || flag == 6) {
    status = 0;
    msg = '';
    snd = '';
  }

  var options = {
    cert        : __dirname + '/../certs/' + config.get('iosApnCertificate'),
    certData    : null,
    key         : __dirname + '/../certs/' + config.get('iosApnCertificate'),
    keyData     : null,
    passphrase  : 'vevsa',
    ca          : null,
    pfx         : null,
    pfxData     : null,
    gateway     : 'gateway.push.apple.com',
    port        : 2195,
    rejectUnauthorized: true,
    enhanced    : true,
    cacheLength : 100,
    autoAdjustCache: true,
    connectionTimeout: 0,
    ssl         : true
  };

  var deviceToken = new apns.Device(iosDeviceToken);
  var apnsConnection = new apns.Connection(options);
  var note = new apns.Notification();

  note.expiry = Math.floor(Date.now() / 1000) + 3600;

  note.sound = snd;
  note.alert = msg;
  note.newsstandAvailable = status;
  note.payload = payload;

  apnsConnection.pushNotification(note, deviceToken);

  // Handle these evenet to confirm that the notification gets
  // transmitted to the APN server or find error if any
  function log(type) {
    return function() {
      if(debugging_enabled)
        console.log("iOS PUSH NOTIFICATION RESULT: " + type);
    }
  }

  apnsConnection.on('error', log('error'));
  apnsConnection.on('transmitted', log('transmitted'));
  apnsConnection.on('timeout', log('timeout'));
  apnsConnection.on('connected', log('connected'));
  apnsConnection.on('disconnected', log('disconnected'));
  apnsConnection.on('socketError', log('socketError'));
  apnsConnection.on('transmissionError', log('transmissionError'));
  apnsConnection.on('cacheTooSmall', log('cacheTooSmall'));
}

/**
 * Send push notification to android device
 * @param deviceToken
 * @param message
 */
function sendAndroidPushNotification(deviceToken, message) {
  var message = new gcm.Message({
    delayWhileIdle: false,
    timeToLive: 2419200,
    data: {
      message: message,
      brand_name: "Vevsa"
    }
  });
  var sender = new gcm.Sender(constants.serverAndroidIDs.PUSH_NOTIFICATION_SERVER_ID);
  var registrationIds = [];
  registrationIds.push(deviceToken);

  sender.send(message, resigtrationIds, 4, function(err, result) {
    // explicitly freeing objects
    sender = null;
    message = null;
  });
}

/**
 *
 * Send notification to the user with the given user ID
 * ASSUMPTION: the payload is same for both the devices
 * @param user_id
 * @param message
 * @param flag
 * @param payload
 */
function sendNotification(user_id, message, flag, payload) {
  console.log("SENDING NOTIFICATION: "+ message + " TO: "+ user_id);
  var getUserDeviceInfo = "SELECT user_id, device_type, user_device_token FROM tb_users WHERE user_id = ?";
  connection.query(getUserDeviceInfo, [user_id], function(err, resultUser) {
    sendNotifictionToDevice(resultUser[0].device_type, resultUser[0].user_device_token, message, flag, payload);
  });
}

/**
 * Function to send notification to a particular device
 * @param deviceType
 * @param userDeviceToken
 * @param message
 * @param flag
 * @param payload
 */
function sendNotificationToDevice(deviceType, userDeviceToken, message, flag, payload) {
  if(deviceType == constants.deviceType.ANDROID && userDeviceToken != '') {
    sendAndroidPushNotification(userDeviceToken, message);
  }
  else if(deviceType == constants.deviceType.iOS && userDeviceToken != '') {
    sendIosPushNotification(userDeviceToken, message, flag, payload);
  }
}

/**
 * Utility function to verify client token
 * @param req {OBJECT} request body/url should contain token
 * @param res {OBJECT} error response would be sent
 * @param next {FUNCTION} next middleware if everything is ok
 * @returns {*}
 */
function verifyClientToken(req, res, next) {
  var handlerInfo = {
    "apiModule": "commonfunction",
    "apiHandler": "verifyClientToken"
  };
  var token = (req.cookies && req.cookies.token) || req.body.token || req.query.token,
      e = null;
  var userType = (req.body.reg_as || req.query.reg_as || 0);
  if(!token) {
    e = new Error('User not logged in!');
    e.status = constants.responseFlags.NOT_LOGGED_IN;
    return next(e);
  }
  var userTable = ((userType == constants.userType.VENDORS) ? "tb_vendors" : "tb_users");
  var checkToken = "SELECT * FROM "+userTable+" WHERE access_token = ? AND is_active = 1";
  var tt = connection.query(checkToken, [token], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "geting user details ", err, result);
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    if(result.length == 0) {
      e = new Error('Invalid token provided!');
      e.log = "Invalid token provided!";
      e.flag = constants.responseFlags.NOT_AUTHORIZED;
      return next(e);
    }
    if(userType == 0) {
      req.body.user_id = result[0].user_id;
      req.query.user_id = result[0].user_id;
      req.body.user_name = result[0].user_name;
      req.body.user_phone = result[0].user_phone;
      req.body.user_address = result[0].user_address;
      req.query.user_name = result[0].user_name;
      req.query.user_address = result[0].user_address;
    }
    else {
      req.body.vendor_id = result[0].vendor_id;
      req.query.vendor_id = result[0].vendor_id;
      req.body.vendor_name = result[0].vendor_name;
      req.body.vendor_phone = result[0].vendor_phone;
      req.body.dendor_address = result[0].vendor_address;
      req.query.vendor_name = result[0].vendor_name;
      req.query.vendor_address = result[0].vendor_address;
      req.query.vendor_phone = result[0].vendor_phone;
    }
    if(result[0].is_blocked == 1) {
      return res.send({
        "log": "This user is blocked",
        "flag": constants.responseFlags.NOT_AUTHORIZED
      });
    }
    next();
  });
}

/**
 * <b>API [GET] /books-auth/send_otp</b><br>
 * @param req {OBJECT} request object should contain phone_no
 * @param res {OBJECT} response would contain session id
 */
function sendOTP(req, res) {
  var handlerInfo = {
    "apiModule": "commonfunctions",
    "apiHandler": "sendOtp"
  };
  var phone_no = req.query.phone_no;
  // Request sendotp for getting otp
  var options = {};
  options.method = 'POST';
  options.json = true;
  options.rejectUnauthorized = false;
  options.url = constants.sendotp.API_LINK;
  options.headers = {
    'Content-Type': 'application/json',
    'application-Key': constants.sendotp.API_KEY
  };
  options.body = {
    "countryCode": "91",
    "mobileNumber": phone_no,
    "getGeneratedOTP": true
  };
  request(options, function(error, response, body) {
    if(error || response.statusCode != 200) {
      logging.error(handlerInfo, {event:"getting response from sendotp"}, {"error": error});
      return res.send({
        "log": "There was some error in getting otp",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    var otp = body.response.oneTimePassword;
    var sqlQuery = "INSERT INTO tb_otp (one_time_password, phone_no) VALUES( ?, ?)";
    var tt = connection.query(sqlQuery, [otp, phone_no], function(err, result) {
      logging.logDatabaseQuery(handlerInfo, "inserting otp into database", err, result, tt.sql);
      if(err) {
        return res.send(constants.databaseErrorResponse);
      }
      res.send({
        "session_id": result.insertId,
        "password"  : otp,
        "flag"      : constants.responseFlags.ACTION_COMPLETE
      });
    });
  });
}

/**
 * <b>API [GET] /books-auth/verify_otp</b><br>
 * @param req {OBJECT} request query should contain session_id and otp
 * @param res {OBJECT} response would contain a json object indicating verification status
 */
function verifyOTP(req, res, next) {
  var handlerInfo = {
    "apiModule": "commonfuntions",
    "apiHandler": "verifyOTP"
  };
  var otp = req.query.otp;
  var session_id = req.query.session_id;
  var sqlQuery = "SELECT * FROM tb_otp WHERE one_time_password = ? AND session_id = ?";
  var tt = connection.query(sqlQuery, [otp, session_id], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "verifying otp", err, result);
    if(err) {
      console.log(err);
      return res.send(constants.databaseErrorResponse);
    }
    if(result.length == 0) {
      return res.send({
        "log" : "Verification failed",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    next();
  });
}

/**
 * This middleware would be used on the panel side for verification
 * @param req - {OBJECT} request body/query should contain the token
 * @param res - {OBJECT} if no token
 * @param next - {FUNCTION} next middleware to be called
 */
function verifyPanelToken(req, res, next) {
  var handlerInfo = {
    "apiModule": "Commonfunctions",
    "apiHandler": "verifyPanelToken"
  };

  var token = (req.cookies && req.cookies.token) || req.body.token || req.query.token,
      e = null;
  var userType = (req.body.reg_as || req.query.reg_as || 0);
  if(!token) {
    e = new Error('User not logged in!');
    e.status = constants.responseFlags.NOT_LOGGED_IN;
    return next(e);
  }
  if(token != constants.adminPanel.ACCESS_TOKEN) {
    e = new Error('Invalid token provided!');
    e.status = constants.responseFlags.NOT_AUTHORIZED;
    return next(e);
  }
  next();
}

/**
 * middleware to log request in database
 * @param req {OBJECT} request of API
 * @param res {OBJECT} response object that would be returned
 * @param next {FUNCTION} next middleware function to be called
 */
function logRequest(req, res, next) {
  var handlerInfo = {
    "apiModule": "commonfunctions",
    "apiHandler": "logRequest"
  };
  var requestData = "";
  if(req.method === "POST") {
    requestData = JSON.stringify(req.body);
  }
  else if(req.method === "GET") {
    requestData = JSON.stringify(req.query);
  }

  var data = [req.url, requestData, req.token || "NA", req.connection.remoteAddress];
  var insertLog = "INSERT INTO tb_app_api_logs "+
    "(api_name, request, requested_by, logged_on, ip_address) "+
    "VALUES(?, ?, ?, NOW(), ?)";
  var tt= connection.query(insertLog, data, function(err, insRes) {
    console.log(tt.sql);
    logging.logDatabaseQuery(handlerInfo, "insert api log", err, insRes, tt.sql);
    if(err) {
      console.log(err);
      logging.error("Error while inserting logs", err);
    }
    next();
  });
}

/**
 * <b>API [POST] /books-auth/login </b><br>
 * API for logging user/vendor in
 * @param req - request body should contain phone_no and device_token
 * @param res - response object would return flag and access_token
 * @returns  @type {{log: string, flag: number, access_token: string}}
 */
function loginUser(req, res) {
  var handlerInfo = {
    "apiModule": "commonfunctions",
    "apiHandler": "loginUser"
  };
  var reqParams    = req.body;
  var phoneNo      = reqParams.phone_no;
  var deviceToken = reqParams.device_token;
  var regAs        = reqParams.reg_as || 0;
  users.verifyUserByPhone(handlerInfo, phoneNo, regAs, function(verifyErr, userDetails) {
    if(verifyErr) {
      return res.send(constants.databaseErrorResponse);
    }
    if(userDetails.length == 0) {
      return res.send({
        "log": "Not authorized, this phone number is not registered",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    var userId = (regAs == constants.userType.USERS ? userDetails[0].user_id : userDetails[0].vendor_id);
    updateDeviceToken(handlerInfo, userId, regAs, deviceToken, function(updateErr, updateRes) {
      if(updateErr) {
        return res.send(constants.databaseErrorResponse);
      }
      res.send({
        "log": "login successful",
        "flag": constants.responseFlags.ACTION_COMPLETE,
        "access_token": userDetails[0].access_token
      });
    });
  });
}

function updateDeviceToken(handlerInfo, userId, regAs, deviceToken, callback) {
  var tableName = (regAs == constants.userType.USERS ? "tb_users" : "tb_vendors");
  var searchKey = (regAs == constants.userType.USERS ? "user_id" : "vendor_id");
  var sqlQuery = "UPDATE "+tableName+" SET device_token = ? WHERE  "+searchKey +" = ?";
  var tt = connection.query(sqlQuery, [deviceToken, userId], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting user/vendor details", err, result, tt.sql);
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}
