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
var crypto         = require('crypto');

exports.checkBlank                     = checkBlank;
exports.sendIosPushNotification        = sendIosPushNotification;
exports.sendAndroidPushNotification    = sendAndroidPushNotification;
exports.sendNotification               = sendNotification;
exports.sendNotificationToDevice       = sendNotificationToDevice;
exports.verifyClientToken              = verifyClientToken;
exports.sendOTP                        = sendOTP;
exports.verifyWebOTP                   = verifyWebOTP;
exports.verifyOTP                      = verifyOTP;
exports.verifyPanelToken               = verifyPanelToken;
exports.logRequest                     = logRequest;
exports.loginUser                      = loginUser;
exports.sendOtpViaEmail                = sendOtpViaEmail;
exports.verifyEmailOtp                 = verifyEmailOtp;
exports.serverReferUserPage            = serverReferUserPage;
exports.loginReferralProgramme         = loginReferralProgramme;
exports.getReferralLeaderBoard         = getReferralLeaderBoard
exports.getUserReferrals               = getUserReferrals;

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
            console.log("<<<< BLANK PARAMETER AT INDEX :"+i+">>>>"+arr[i]);
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
      e = new Error('Unauthorized! Contact Panel admin');
      e.status = constants.responseFlags.NOT_AUTHORIZED;
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
  var phone_no = req.body.phone_no;
  var pass = req.body.pass;

  if(checkBlank([phone_no])) {
    return res.send(constants.parameterMissingResponse);
  }


  var dupQuery = "SELECT * FROM tb_users WHERE  user_phone = ? ";
  var tt = connection.query(dupQuery, [phone_no], function(dupErr, dupData) {
    logging.logDatabaseQuery(handlerInfo, "checking duplicate user", dupErr, dupData);
    if(dupErr) {
      return res.send({
        "log": "Internal server error",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    if(dupData.length > 0) {
      return res.send({
        "log": "A user already exists with this email/phone",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
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
      logOtpIntoDb(handlerInfo, otp, phone_no, pass, function(err, result) {
        if(err) {
          return res.send(constants.databaseErrorResponse);
        }
        res.send({
          "session_id": result.insertId,
          "password"  : otp,
          "pass": pass,
          "flag": constants.responseFlags.ACTION_COMPLETE
        });
      });
    });
  });
}

function logOtpIntoDb(handlerInfo, oneTimePwd, userPhone, pass, callback) {
  var sqlQuery = "INSERT INTO tb_otp (one_time_password, phone_no , pass) VALUES( ?, ? , ?)";
  var tt = connection.query(sqlQuery, [oneTimePwd, userPhone , pass], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "inserting otp into database", err, result, tt.sql);
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}
/*
  function to verify OTP
*/
function verifyWebOTP(req, res) {
  var handlerInfo = {
    "apiModule": "commonfuntions",
    "apiHandler": "verifyWebOTP"
  };
  var otp = req.query.otp;
  var pass = req.query.pass;
  verifyOtpInDb(handlerInfo, otp, pass, function(err, result) {
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    if(result.length == 0) {
      return res.send({
        "log" : "Verification failed",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    else{
      var phone = result[0].phone_no;
      var pass = result[0].pass;
      var access_token = crypto.createHash("md5").update(phone).digest("hex");
      InsertWebuserInDb(handlerInfo, phone, encrypt(pass) , access_token);
      return res.send({
        "log" : "Verified",
        "flag": constants.responseFlags.ACTION_COMPLETE,
        "data": result,
        "pass": pass,
        "phone": phone,
        "access_token":access_token
      });
    }
  });
}

/**
 * <b>API [GET] /books-auth/verify_otp</b><br>
 * @param req {OBJECT} request query should contain session_id and otp
 * @param res {OBJECT} response would contain a json object indicating verification status
 * @param next {FUNCTION} this would be the create user middleware that is supposed to be called
 */
function verifyOTP(req, res, next) {
  var handlerInfo = {
    "apiModule": "commonfuntions",
    "apiHandler": "verifyOTP"
  };
  var otp = req.query.otp;
  var session_id = req.query.session_id;

  verifyOtpInDb(handlerInfo, otp, session_id, function(err, result) {
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    if(result.length == 0) {
      return res.send({
        "log" : "Verification failed",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    req.query.user_phone = result[0].phone_no;
    next();
  });
}
//function to insert new user into tb_user from website
function InsertWebuserInDb(handlerInfo, phone, pass,access_token){
  var sqlQuery = "INSERT INTO tb_users (user_phone,user_pass, access_token, date_registered) "+
                 "VALUES(?,?, ?, DATE(NOW()))";
  var tt = connection.query(sqlQuery, [phone, pass ,access_token], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "inserting user into database", err, result);
    });
}

function verifyOtpInDb(handlerInfo, otp, pass, callback) {
  var sqlQuery = "SELECT * FROM tb_otp WHERE one_time_password = ? AND pass = ?";
  var tt = connection.query(sqlQuery, [otp, pass], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "verifying otp", err, result, tt.sql);
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
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

function sendOtpViaEmail(req, res, next) {
  var reqParams = req.body;
  var handlerInfo = {
    "apiModule" : "commonfunctions",
    "apiHandler": "sendOtpViaEmail"
  };
  var userName  = reqParams.user_name;
  var phoneNo   = reqParams.mobile_no;
  var password  = reqParams.password;
  var email     = reqParams.user_email;
  var referredBy= reqParams.referred_by || -1;
  var getDuplicate = "SELECT * FROM tb_app_referral_programme WHERE email = ? OR phone_no = ?";
  var tt = connection.query(getDuplicate, [email, phoneNo], function(dupErr, dupRes) {
    logging.logDatabaseQuery(handlerInfo, "getting duplicate registration", dupErr, dupRes, tt.sql);
    if(dupRes.length > 0) {
      return res.send({
        "log": "A user already exists with this email/phone",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    var otp       = Math.floor((Math.random()*1000000)+1);
    var from      = 'support@vevsa.com';
    var to        = [email];
    var text      = "";
    var subject   = 'Vevsa Referral Programme Registration';
    var html      = 'Hello,<br><br>'+
                    'In order to complete your registration, you must fill the following<br>'+
                    'code on your registration screen: '+otp+'<br><br>'+
                    'Thank you for registering youself for Vevsa.';
    messenger.sendEmailToUser(from, to, subject, text, html, function(mailErr, mailRes) {
      if(mailErr) {
        return res.send({
          "log": "There was some error in sending email",
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      logOtpIntoDb(handlerInfo, otp, email, function(logErr, logRes) {
        if(logErr) {
          return res.send({
            "log": "There was some error in generating otp",
            "flag": constants.responseFlags.ACTION_FAILED
          });
        }
        var sessionId = logRes.insertId;
        insertAppReferralProgramme(handlerInfo, userName, email, phoneNo,
          encrypt(password), referredBy, function(logErr, logRes) {

          if(logErr) {
            return res.send({
              "log": "Error in creating user",
              "flag": constants.responseFlags.ACTION_FAILED
            });
          }
          res.send({
            "log": "Otp sent successfully",
            "session_id": sessionId,
            "flag": constants.responseFlags.ACTION_COMPLETE
          });
        });
      });
    });
  });
}

function insertAppReferralProgramme(handlerInfo, userName, userEmail, userPhone, userPassword, referredBy, callback) {
  var sqlQuery = "INSERT INTO tb_app_referral_programme (user_name, email, phone_no, password, referred_by) "+
    "VALUES(?, ?, ?, ?, ?)";
  var tt = connection.query(sqlQuery, [userName, userEmail, userPhone, userPassword, referredBy], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "logging user", err, result, tt.sql);
    if(err) {
      console.log(err);
      return callback(err, null);
    }
    callback(null, result);
  });
}

function verifyEmailOtp(req, res, next) {
  var reqParams = req.body;
  var handlerInfo = {
    "apiModule": "commonfunctions",
    "apiHandler": "verifyEmailOtp"
  };

  var otp = reqParams.otp;
  var session_id = reqParams.session_id;
  verifyOtpInDb(handlerInfo, otp, session_id, function(err, result) {
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    if(result.length == 0) {
      return res.send({
        "log" : "Verification failed",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    var sqlQuery = "SELECT * FROM tb_otp WHERE session_id = ?";
    var zz = connection.query(sqlQuery, [session_id], function(otpErr, otpData) {
      if(otpErr) {
        console.log(otpErr);
        return res.send(constants.databaseErrorResponse);
      }
      var userEmail = otpData[0].phone_no;
      var sharableLink = "http://books.vevsa.com:7001/books-auth/refer?ref_code="+encrypt(userEmail);
      markUserVerifiedInDb(handlerInfo, userEmail, sharableLink, function(markErr, markResult) {
        if(markErr) {
          return res.send(constants.databaseErrorResponse);
        }
        res.send({
          "log": "User verified",
          "share_link": sharableLink,
          "flag": constants.responseFlags.ACTION_COMPLETE
        });
      });
    });
  });
}

function markUserVerifiedInDb(handlerInfo, userEmail, shareUrl, callback) {
  var sqlQuery = "UPDATE tb_app_referral_programme SET verification_status = 1, sharable_link=? WHERE email = ?";
  var tt = connection.query(sqlQuery, [shareUrl, userEmail], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "update verification status", err, result, tt.sql);
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}

function encrypt(text){
  var cipher = crypto.createCipher('aes-256-ctr','vevsa');
  var crypted = cipher.update(text,'utf8','hex');
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text){
  var decipher = crypto.createDecipher('aes-256-ctr','vevsa');
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

function serverReferUserPage(req, res, next) {
  var reqParams        = req.query;
  var handlerInfo      = {
    "apiModule": "commonfunctions",
    "apiHandler": "serverReferUserPage"
  };
  var referralCode     = reqParams.ref_code;
  var userEmail        = decrypt(referralCode);
  var sqlQuery = "SELECT * FROM tb_app_referral_programme WHERE email = ?";
  var tt = connection.query(sqlQuery, [userEmail], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting referred_by", err, result, tt.sql);
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    if(result.length == 0) {
      return res.status(constants.responseFlags.NOT_FOUND).send("404 Not found");
    }
    var userId = result[0].id;
    var referUrl = "http://vevsa.com/contest/contest.html?referral_code="+userId;
    res.redirect(referUrl);
  });
}

function loginReferralProgramme(req, res, next) {
  var reqParams = req.body;
  var handlerInfo = {
    "apiModule": "commonfunctions",
    "apiHandler": "loginReferralProgramme"
  };
  var mobileNo = reqParams.mobile_no;
  var password = encrypt(reqParams.password);

  loginReferralProgrammeHelper(handlerInfo, mobileNo, password, function(err, result) {
    if(err) {
      return res.send({
        "log": err.message,
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    if(result.length == 0) {
      var err = new Error("Not Authorized");
      err.status = constants.responseFlags.NOT_AUTHORIZED
      return next(err);
    }
    res.send({
      "log": "Login successful",
      "data": result[0],
      "flag": constants.responseFlags.ACTION_COMPLETE
    });
  });
}

function loginReferralProgrammeHelper(handlerInfo, mobileNo, password, callback) {
  var sqlQuery = "SELECT * FROM tb_app_referral_programme WHERE phone_no = ? AND password = ?";
  var tt = connection.query(sqlQuery, [mobileNo, password], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "authenticating...", err, result, tt.sql);
    if(err) {
      return callback(new Error(err), null);
    }
    callback(null, result);
  });
}

function getReferralLeaderBoard(req, res, next) {
  var handlerInfo = {
    "apiModule": "commonfunctions",
    "apiHandler": "getReferralLeaderBoard"
  };
  getReferralLeaderBoardHelper(handlerInfo, function(err, leaderboardData) {
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    res.send({
      "log": "Successfully fetched leaderboard data",
      "flag": constants.responseFlags.ACTION_COMPETE,
      "data": leaderboardData
    });
  });
}

function getReferralLeaderBoardHelper(handlerInfo, callback) {
  var sqlQuery = "SELECT r1.referred_by, r2.user_name, r2.phone_no, r2.email, r2.sharable_link, COUNT(*) as referrals "+
    "FROM `tb_app_referral_programme` as r1 "+
    "JOIN tb_app_referral_programme as r2 ON r2.id = r1.referred_by AND r1.verification_status=1 "+
    "GROUP BY r1.referred_by "+
    "ORDER BY referrals DESC";
  var tt = connection.query(sqlQuery, [], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting leaderboard", err, result, tt.sql);
    if(err) {
      return callback(new Error(err), null);
    }
    callback(null, result);
  });
}

function getUserReferrals(req, res, next) {
  var handlerInfo = {
    "apiModule": "commonfunctions",
    "apiHandler": "getUserReferrals"
  };
  var reqParams = req.query;
  var userId    = reqParams.user_id;
  getUserReferralsHelper(handlerInfo, userId, function(err, result) {
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    return res.send({
      "log": "Successfully fetched data",
      "flag": constants.responseFlags.ACTION_FAILED,
      "data": result
    });
  });
}

function getUserReferralsHelper(handlerInfo, userId, callback) {
  var sqlQuery = "SELECT * FROM tb_app_referral_programme WHERE referred_by = ?";
  var tt = connection.query(sqlQuery, [userId], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting user referrals", err, result, tt.sql);
    if(err) {
      return callback(new Error(err), null);
    }
    callback(null, result);
  });
}
