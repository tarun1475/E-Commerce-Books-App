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
exports.verifyUserByPhone                 = verifyUserByPhone;
exports.searchUser                        = searchUser;
exports.getMyDetails                      = getMyDetails;
exports.getMyOrders                       = getMyOrders;

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
  var reqParams     = req.query;
  var userPhone     = reqParams.user_phone;
  var deviceToken   = reqParams.device_token

  if(utils.checkBlank([userPhone, deviceToken ])) {
    return res.send({
      "log" : "Some parameters are missing/invalid",
      "flag": constants.responseFlags.ACTION_FAILED
    });
  }

  var dupQuery = "SELECT * FROM tb_users WHERE  user_phone = ? ";
  var tt = connection.query(dupQuery, [userPhone], function(dupErr, dupData) {
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
    var access_token = crypto.createHash("md5").update(userPhone).digest("hex");
    var sqlQuery = "INSERT INTO tb_users (user_phone, access_token, device_token) "+
                   "VALUES(?, ?, ?)";
    var tt = connection.query(sqlQuery, [userPhone, access_token, deviceToken], function(err, result) {
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

/**
 * <b> API [GET] /books-auth/get_user_requests </b> <br>
 * API to get user requests
 * The request query requires the following parameters :
 * @param {STRING} token - access token of device
 * @param {INTEGER} start_from - start index
 * @param {INTEGER} page_size - end index
 */
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

function verifyUserByPhone(handlerInfo, phoneNo, regAs, callback) {
  var table = (regAs == constants.userType.USERS ? "tb_users" : "tb_vendors");
  var searchKey = (regAs == constants.userType.USERS ? "user_phone" : "vendor_phone");
  var sqlQuery = "SELECT * FROM "+table+" WHERE "+searchKey +" = ?";
  var tt = connection.query(sqlQuery, [phoneNo], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "verifying user via phone", err, result, tt.sql);
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}

/**
 * <b>API [GET] /books-auth/searchUser</b><br>
 * API to search user
 * @param req {OBJECT} request body should contain token and key
 * @param res {OBJECT} response would send results
 */
function searchUser(req, res) {
  var handlerInfo = {
    "apiModule": "Users",
    "apiHandler": "searchUser"
  };
  var reqParams = req.query;
  var searchKey = reqParams.key;
  searchUserHelper(handlerInfo, searchKey, function(err, result) {
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    if(result.length == 0) {
      return res.send({
        "log": "Invalid user entered",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      "log": "Successfully searched user ",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data": result
    });
  });

}

function searchUserHelper(handlerInfo, searchKey, callback) {
  var sqlQuery = "SELECT * FROM tb_users " +
      "WHERE user_id = ? OR user_name LIKE '%"+searchKey+"%' OR user_email LIKE '%"+searchKey+"%' " +
      "OR user_address LIKE '%"+searchKey+"%' ";
  var tt = connection.query(sqlQuery, [searchKey], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "searching user", err, result, tt.sql);
    if(err) {
      console.log(err);
      return callback(err, null);
    }
    callback(null, result);
  });
}

/**
 * <b>API [GET] /books-auth/get_my_details </b><br>
 * This api would provide user with his her details. Request query<br>
 * requires the following parameters
 * @param {STRING} token    - access token of device
 * @param {INTEGER} edit    - [optional] if you want to edit details then sent edit = 1
 * @param {STRING} name     - [optional] user name
 * @param {STRING} address  - [optional] user address
 * @param {STRING} landmark - [optional] user address landmark
 *
 */
function getMyDetails(req, res) {
  var handlerInfo = {
    "apiModule": "Users",
    "apiHandler": "getMyDetails"
  };
  var reqParams = req.query;
  var userId    = reqParams.user_id;
  var toEdit    = reqParams.edit || 0;
  var name      = reqParams.name;
  var address   = reqParams.address;
  var landmark  = reqParams.landmark;
  var apiParams = [];
  if(toEdit == 1) {
    apiParams.push(userId, name, address, landmark);
  }
  if(utils.checkBlank(apiParams)) {
    return res.send(constants.parameterMissingResponse);
  }
  var sqlQuery = "", queryParams = [];
  if(toEdit == 1) {
    sqlQuery = "UPDATE tb_users SET user_address = ?, user_name = ?, landmark = ? WHERE user_id = ?";
    queryParams.push(address, name, landmark, userId);
  }
  else {
    sqlQuery = "SELECT user_name, user_address, landmark FROM tb_users WHERE user_id = ?";
    queryParams.push(userId);
  }
  var getUserDetails = connection.query(sqlQuery, queryParams, function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting user details", err, result, getUserDetails.sql);
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    var responseData = {
      "log": "Operation Successful",
      "flags": constants.responseFlags.ACTION_COMPLETE,
    };
    if(toEdit == 0) {
      responseData.data = result;
    }
    res.send(responseData);
  });
}

/**
 * <b> API [GET] /books-auth/my_orders </b> <br>
 * API to get recent orders/deliveries for a particular user
 * request query requires the following parameters:
 * @param token {STRING} access token for user
 * @param start_from {INTEGER} pagination start index
 * @param page_size {INTEGER} pagination offset
 */
function getMyOrders(req, res) {
  var handlerInfo = {
    "apiModule": "users",
    "apiHandler": "getMyOrders"
  };
  var reqParams = req.query;
  var userId    = reqParams.user_id;
  if(utils.checkBlank([userId, reqParams.start_from, reqParams.page_size])) {
    return res.send(constants.parameterMissingResponse);
  }
  var startFrom = parseInt(reqParams.start_from);
  var pageSize  = parseInt(reqParams.page_size);
  var sqlQuery  = "SELECT delivery_id FROM tb_delivery WHERE user_id = ? ORDER BY logged_on DESC LIMIT ?, ?";
  var getUserDeliveries = connection.query(sqlQuery, [userId, startFrom, pageSize], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting user deliveries", err, result, getUserDeliveries.sql);
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    var deliveryIdArr = [];
    var deliveryDetailsObj = {};
    for(var i = 0; i < result.length; i++) {
      deliveryIdArr.push(result[i].delivery_id);
    }
    var asyncTasks = [];
    for(var i = 0; i < deliveryIdArr.length; i++) {
      asyncTasks.push(bookRequests.getDeliveryDetailsHelper.bind(null, handlerInfo, deliveryIdArr[i], deliveryDetailsObj));
    }
    async.parallel(asyncTasks, function(asyncErr, asyncRes) {
      if(asyncErr) {
        return res.send({
          "log": asyncErr,
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      var deliveryArr = Object.keys(deliveryDetailsObj).map(function(key) { return deliveryDetailsObj[key] });
      deliveryArr.sort(function(a, b) {
        var d1 = new Date(a.logged_on);
        var d2 = new Date(b.logged_on);
        return d1 < d2;
      });
      res.send({
        "log": "Successfully fetched orders data",
        "flag": constants.responseFlags.ACTION_COMPLETE,
        "data": deliveryArr
      });
    });
  });
}
