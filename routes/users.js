/**
 * @module Users
 */


/*
 * Module dependencies
 */
var crypto         = require('crypto');
var async          = require('async');
var utils          = require('./commonfunctions');
var constants      = require('./constants');
var bookRequests   = require('./book_requests');
var logging        = require('./logging');
exports.createNewAppUser                  = createNewAppUser;
exports.getRecentRequestsByUserId         = getRecentRequestsByUserId;
exports.getUserDetailsPanel               = getUserDetailsPanel;
exports.blockUserById                     = blockUserById;

/**
 *
 * [POST] '/books-auth/create_user'<br> 
 * API to create a new user during signup/login, <br>Request body requires following parameters:
 * @param {string} user_name - name of the user
 * @param {string} user_email - email of the user
 * @param {string} user_phone - phone number of the user
 * @param {string} device_name - name of the device 
 * @param {string} os_name - name of the operating system
 * @param {integer} user_city - city of user, 1 for chandigarh
 * @return {JSON} Response body contains simple json object that contains access_token
 *
 */
function createNewAppUser(req, res) {
  var handlerInfo   = {
    "apiModule": "users",
    "apiHandler":"createNewAppUser"
  };
  var reqParams     = req.body;
  var userName      = reqParams.user_name;
  var userEmail     = reqParams.user_email;
  var userPhone     = reqParams.user_phone;
  var userAddress   = reqParams.user_address;
  var deviceName    = reqParams.device_name;
  var osName        = reqParams.os_name;
  var osVersion     = reqParams.os_version;
  var userCity      = parseInt(reqParams.user_city);

  if(utils.checkBlank([userName, userEmail, userPhone, userAddress, deviceName, osName, osVersion, userCity])) {
    return res.send({
      "log" : "Some parameters are missing/invalid",
      "flag": constants.responseFlags.ACTION_FAILED
    });
  }

  var dupQuery = "SELECT * FROM tb_users WHERE user_email = ? OR user_phone = ? ";
  var tt = connection.query(dupQuery, [userEmail, userPhone], function(dupErr, dupData) {
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
    var access_token = crypto.createHash("md5").update(userEmail).digest("hex");
    var sqlQuery = "INSERT INTO tb_users (user_name, user_email, user_phone, user_address, device_name, os_name, os_version, user_city, access_token) "+
                   "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)";
    var tt = connection.query(sqlQuery, [userName, userEmail, userPhone, userAddress, deviceName, osName, osVersion, userCity, access_token], function(err, result) {
      logging.logDatabaseQuery(handlerInfo, "inserting user into database", err, result);
      if(err) {
        return res.send({
          "log" : "Internal server error",
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      res.send({
        "log" : "User created successfully",
        "access_token": access_token,
        "flag": constants.responseFlags.ACTION_COMPLETE
      });
    });
  });
}

function getRecentRequestsByUserId(req, res) {
  var handlerInfo = {
    "apiModule":"Users",
    "apiHandler":"getRecentRequestsByUserId"
  };
  var user_id = req.query.user_id;
  var start_from = parseInt(req.query.start_from || 0);
  var page_size = parseInt(req.query.page_size || 5);
  var sqlQuery = "SELECT req_id FROM tb_book_requests WHERE user_id = ? ORDER BY generated_on DESC LIMIT ?, ?";
  var tt = connection.query(sqlQuery, [user_id, start_from, page_size], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting user requests", err, result, tt.sql);
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    var requestArr = [];
    for(var i = 0; i < result.length; i++) {
      requestArr.push(result[i].req_id);
    }
    var asyncTasks = [];
    var requestObj = {};
    for(var i = 0; i < requestArr.length; i++) {
      asyncTasks.push(bookRequests.getRequestDetailsById.bind(null, handlerInfo, requestArr[i], requestObj));
    }
    async.parallel(asyncTasks, function(asyncErr, asyncRes) {
      if(asyncErr) {
        return res.send({
          "log": asyncErr,
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      var response = Object.keys(requestObj).map(function(key) { return requestObj[key] });
      response.sort(function(a, b) { return b.req_id-a.req_id; });
      res.send({
        "log": "Successfully fetched request data",
        "data": response,
        "flag": constants.responseFlags.ACTION_COMPLETE
      });
    });
  });
}


/**
 * <b>API [POST]/books-auth/get/details_user</b> <br>
 * API to get user details
 * @param token - {STRING} access token
 * @param user_id - {INTEGER} user_id
 * @return {JSON} - Response body contains user detail
 */
function getUserDetailsPanel(req, res) {
  var handlerInfo = {
    "apiModule": "Users",
    "apiHandler": "getUserDetailsPanel"
  };
  var user_id = parseInt(req.body.user_id);
  if(utils.checkBlank([user_id])) {
    return res.send(constants.parameterMissingResponse);
  }
  getUserDetailsPanelHelper(handlerInfo, user_id, function(err, result) {
    if(err) {
      return res.send({
        "log": err,
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    res.send(result);
  });
}

function getUserDetailsPanelHelper(handlerInfo, user_id, callback) {
  var sqlQuery = "SELECT users.*, requests.req_id, requests.status, requests.generated_on "+
      "FROM tb_users as users " +
      "JOIN tb_book_requests as requests ON requests.user_id = users.user_id "+
      "WHERE users.user_id = ? AND requests.is_valid = 1";
  var getUserDetails = connection.query(sqlQuery, [user_id], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, {"event": "getting user details"}, err, result, getUserDetails.sql);
    if(err) {
      return callback("There was some error in getting user details", null);
    }
    if(result.length == 0) {
      return callback("Invalid user entered", null);
    }
    var requests = [], i;
    for(i = 0; i < result.length; i++) {
      if(requests.indexOf(result[i].req_id) == -1) {
        requests.push(result[i].req_id);
      }
    }
    var reqDetailsObj = {};
    var asyncTasks = [];
    for(i = 0; i < requests.length; i++) {
      asyncTasks.push(bookRequests.getRequestDetailsById.bind(null, handlerInfo, requests[i], reqDetailsObj));
    }
    async.parallel(asyncTasks, function(asyncErr, asyncRes) {
      if(asyncErr) {
        return callback(asyncErr, null);
      }
      var requestArr = Object.keys(reqDetailsObj).map(function(key) { return reqDetailsObj[key]});
      var responseData = {};
      responseData.user_name = result[0].user_name;
      responseData.user_email = result[0].user_email;
      responseData.user_phone = result[0].user_phone;
      responseData.user_address = result[0].user_address;
      responseData.user_city = result[0].city;
      responseData.is_blocked = result[0].is_blocked;
      responseData.os_name = result[0].os_name;
      responseData.device_name = result[0].device_name;
      responseData.os_version = result[0].os_version;
      responseData.requests = requestArr;
      responseData.log = "Successfully fetched user data from database";
      responseData.flag = constants.responseFlags.ACTION_COMPLETE;
      callback(null, responseData);
    });
  });
}

/**
 * <b>API [POST] /books-auth/block/user </b> <br>
 * API to block user
 * @param token - {STRING} access token
 * @param status - {INTEGER} 1 -> block, 0 -> unblock
 * @return {JSON} - Response body contains log and flag
 */
function blockUserById(req, res) {
  var handlerInfo = {
    "apiModule": "Users",
    "apiHandler": "blockUserById"
  };
  var userId = req.body.user_id;
  var userStatus = req.body.status;
  if(utils.checkBlank([userId])) {
    return res.send(constants.parameterMissingResponse);
  }
  updateUserAccountStatus(handlerInfo, userId, userStatus, function(err, result) {
    if(err) {
      return res.send({
        "log": err,
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      "log": "Successfully blocked/unblocked user",
      "flag": constants.responseFlags.ACTION_COMPLETE
    });
  });
}

function updateUserAccountStatus(handlerInfo, userId, status, callback) {
  if(status != constants.userAccountStatus.BLOCKED && status != constants.userAccountStatus.UNBLOCKED) {
    return callback("Invalid account status provided", null);
  }
  var sqlQuery = "UPDATE tb_users SET is_blocked = ? WHERE user_id = ?";
  var tt = connection.query(sqlQuery, [status, userId], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "block/unblock user by id", err, result, tt.sql);
    if(err) {
      return callback("There was some error in updating user", null);
    }
    if(result.affectedRows == 0) {
      return callback("Invalid user id provided", null);
    }
    callback(null, "successfully updated user account")
  });
}
