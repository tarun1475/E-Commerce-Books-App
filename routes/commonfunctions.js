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

exports.checkBlank                     = checkBlank;
exports.sendIosPushNotification        = sendIosPushNotification;
exports.sendAndroidPushNotification    = sendAndroidPushNotification;
exports.sendNotification               = sendNotification;
exports.sendNotificationToDevice       = sendNotificationToDevice;
exports.verifyClientToken              = verifyClientToken;

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
    sendAndroidPushNotification(userDeviceToken, payload);
  }
  else if(deviceType == constants.deviceType.iOS && userDeviceToken != '') {
    sendIosPushNotification(userDeviceToken, message, flag, payload);
  }
}

function verifyClientToken(req, res, next) {
  var token = (req.cookies && req.cookies.token) || req.body.token || req.query.token,
      e = null;
  var userType = (req.body.reg_as || req.query.reg_as || 0);
  if(!token) {
    e = new Error('User not logged in!');
    e.status = constants.responseFlags.NOT_LOGGED_IN;
    return next(e);
  }
  var userTable = ((userType == constants.userType.VENDORS) ? "tb_vendors" : "tb_users");
  var checkToken = "SELECT * FROM "+userTable+" WHERE access_token = ?";
  var qq = connection.query(checkToken, [token], function(err, result) {
    console.log(qq.sql);
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    if(result.length == 0) {
      e = new Error('Invalid token provided!');
      e.status = constants.responseFlags.NOT_AUTHORIZED;
      return next(e);
    }
    res.user_id = result[0].user_id;
    next();
  });
}
