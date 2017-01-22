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

exports.checkVersion                      = checkVersion;
exports.createNewAppUser                  = createNewAppUser;
exports.getRecentRequestsByUserId         = getRecentRequestsByUserId;
exports.getUserDetailsPanel               = getUserDetailsPanel;
exports.blockUserById                     = blockUserById;
exports.verifyUserByPhone                 = verifyUserByPhone;
exports.searchUser                        = searchUser;
exports.getMyDetails                      = getMyDetails;
exports.getVendorDetails                  = getVendorDetails;
exports.getMyOrders                       = getMyOrders;
exports.markUserInActive                  = markUserInActive;
exports.getAllUsers                       = getAllUsers;
exports.getAllUsersFromDb                 = getAllUsersFromDb;
//exports.createWebUser                     = createWebUser;
exports.createWebReq                      = createWebReq;


/**
 *
 * [POST] '/books-auth/check_version'<br> 
 * API to check the version, <br>Request body requires following parameters:
 * @param {string} app_version - version of the app
 * @return {JSON} Response body contains simple json object that contains version.
 *
 */
function checkVersion(req, res) {
  var handlerInfo   = {
    "apiModule": "users",
    "apiHandler":"checkVersion"
  };
  var version       = parseInt( req.body.app_version);
  var appVersion    = 6;
  if(version === appVersion){
    res.send({
      "log" : "Version matched",
      "version": version,
      "flag": constants.responseFlags.ACTION_COMPLETE
    });
  }
  else{
    return res.send({
      "log" : "Version Not matched! Update Required",
      "version": version
    });
  }


}


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
  var deviceToken   = reqParams.device_token;
  var osVersion     = reqParams.os_version;
  var osName        = reqParams.os_name;
  var deviceName    = reqParams.device_name;

  if(utils.checkBlank([deviceToken, osVersion, deviceName])) {
    return res.send({
      "log" : "Some parameters are missing/invalid",
      "flag": constants.responseFlags.ACTION_FAILED
    });
  }

  var access_token = crypto.createHash("md5").update(userPhone).digest("hex");
  var sqlQuery = "INSERT INTO tb_users (user_phone, access_token, device_token, os_version, os_name, device_name, date_registered) "+
                 "VALUES(?, ?, ?, ?, ?, ?, DATE(NOW()))";
  var tt = connection.query(sqlQuery, [userPhone, access_token, deviceToken, osVersion, osName, deviceName], function(err, result) {
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
  var status = 0;
  var user_id = req.query.user_id;
  var start_from = parseInt(req.query.start_from || 0);
  var page_size = parseInt(req.query.page_size || 5);
 var sqlQuery = "SELECT req_id FROM tb_book_requests WHERE user_id = ? AND status = ? ORDER BY generated_on DESC LIMIT ?, ?";
  var tt = connection.query(sqlQuery, [user_id,status, start_from, page_size], function(err, result) {
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
    logging.logDatabaseQuery(handlerInfo, {"event": "getting user details"}, err, null, getUserDetails.sql);
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
//function to fetch or update vendor details
function getVendorDetails(req, res) {
  var handlerInfo = {
    "apiModule": "Vendors",
    "apiHandler": "getVendorDetails"
  };
  var reqParams = req.query;
  var vendorId  = reqParams.vendor_id;
  var toEdit    = reqParams.edit || 0;
  var name      = reqParams.name;
  var address   = reqParams.address;
  var city      = reqParams.city;
  var apiParams = [];
  if(toEdit == 1) {
    apiParams.push(vendorId, name, address, city);
  }
  if(utils.checkBlank(apiParams)) {
    return res.send(constants.parameterMissingResponse);
  }
  var sqlQuery = "", queryParams = [];
  if(toEdit == 1) {
    sqlQuery = "UPDATE tb_vendors SET vendor_address = ?, vendor_name = ?, vendor_city = ? WHERE vendor_id = ?";
    queryParams.push(address, name, city, vendorId);
  }
  else {
    sqlQuery = "SELECT vendor_name, vendor_address, vendor_city FROM tb_vendors WHERE vendor_id = ?";
    queryParams.push(vendorId);
  }
  var getUserDetails = connection.query(sqlQuery, queryParams, function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting user details", err, result, getUserDetails.sql);
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    var responseData = {
      "log": "Successfully updated your details",
      "flag": constants.responseFlags.ACTION_COMPLETE,
    };
    if(toEdit == 0) {
      responseData.data = result;
    }
    res.send(responseData);
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
  var stream    = reqParams.stream;
  var sem       = reqParams.sem ;
  var college   = reqParams.college;

  var apiParams = [];
  if(toEdit == 1) {
    apiParams.push(userId, name, address,stream,college);
  }
  if(utils.checkBlank(apiParams)) {
    return res.send(constants.parameterMissingResponse);
  }
  var sqlQuery = "", queryParams = [];
  if(toEdit == 1) {
    sqlQuery = "UPDATE tb_users SET user_address = ?, user_name = ?,user_college = ?,user_stream = ?,user_sem = ?  WHERE user_id = ?";
    queryParams.push(address, name, college,stream,sem, userId);
  }
  else {
    sqlQuery = "SELECT user_name, user_address, user_college,user_stream,user_sem FROM tb_users WHERE user_id = ?";
    queryParams.push(userId);
  }
  var getUserDetails = connection.query(sqlQuery, queryParams, function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting user details", err, result, getUserDetails.sql);
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    var responseData = {
      "log": "Successfully updated your details",
      "flag": constants.responseFlags.ACTION_COMPLETE,
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
  var sqlQuery  = "SELECT request_id,is_urgent_delivery FROM tb_delivery WHERE user_id = ? ORDER BY logged_on DESC LIMIT ?, ?";
  var getUserDeliveries = connection.query(sqlQuery, [userId, startFrom, pageSize], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting user deliveries", err, result, getUserDeliveries.sql);
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    var reqIdArr = [];
    var urgentIdArr = [];
    //var deliveryDetailsObj = {};
    for(var i = 0; i < result.length; i++) {
      reqIdArr.push(result[i].request_id);
    }
    for(var i = 0; i < result.length; i++) {
      urgentIdArr.push(result[i].is_urgent_delivery);
    }/*
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
      });*/
      res.send({
        "log": "Successfully fetched orders data",
        "flag": constants.responseFlags.ACTION_COMPLETE,
        "data": reqIdArr,
        "urgent": urgentIdArr
      });
  });
}

/**
 * <b> API [GET] /books-auth/delete_account </b> <br>
 * API to deactivate/delete user account : <br>
 * This Api would simply mark user inactive and this would simply delete his account <br>
 * and server would reject his further requests. Request query requires the following parameters: <br>
 *
 * @param user_id {INTEGER} user/vendor id who is using app
 * @param reg_as  {INTEGER} [OPTIONAL] if it's a vendor app send it 1
 * @param token   {STRING}  access token
 */
function markUserInActive(req, res) {
  var handlerInfo = {
    "apiModule": "users",
    "apiHandler": "markUserInactive"
  };
  var userId = req.query.user_id;
  var regAs  = req.query.reg_as || 0;
  changeUserActivityStatus(handlerInfo, userId, regAs, 0, function(err, result) {
    if(err) {
      return res.send({
        "log": err,
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      "log": "Operation successful",
      "flag": constants.responseFlags.ACTION_COMPLETE
    });
  });
}

function changeUserActivityStatus(handlerInfo, userId, userType, activityStatus, callback) {
  var userTable = ["tb_users", "tb_vendors"];
  var userIdVal    = ["user_id", "vendor_id"];
  var sqlQuery  = "UPDATE "+userTable[userType]+ " SET is_active = ? WHERE "+userIdVal[userType]+" = ?";
  var updateUser = connection.query(sqlQuery, [activityStatus, userId], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "updating user activity status", err, result, updateUser.sql);
      return callback("There was some error in updating user", null);
    }
    callback(null, "Operation successful");
  });
}

function getAllUsers(req, res) {
  var handlerInfo = {
    "apiModule": "Users",
    "apiHandler": "getAllUsers"
  };
  var reqParams          = req.query;
  var showSuspended      = reqParams.show_suspended || 0;
  var userType           = reqParams.user_type || 0;
  var userFilter         = "";
  userFilter += " AND is_active = " + (showSuspended == 0 ? 1 : 0);

  getAllUsersFromDb(handlerInfo, userType, userFilter, function(err, result) {
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    return res.send({
      "log": "Action complete",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data": result
    });
  });
}

function getAllUsersFromDb(handlerInfo, userType, userFilter, callback) {
  var tableName = (userType == constants.userType.USERS ? "tb_users ": "tb_vendors ");
  var sqlQuery = "SELECT * FROM "+tableName+" WHERE 1=1 "+ userFilter;
  var tt = connection.query(sqlQuery, [], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting all users ", err, null, tt.sql);
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}
//function to rasie web request

function createWebReq(req , res){
  var handlerInfo   = {
    "apiModule": "WebReq",
    "apiHandler":"createWebReq"
  };
  var reqParams   = req.body;
  var userName    = reqParams.user_name;
  var userPhone   = reqParams.user_phone;
  var userSem     = reqParams.sem;
  var userCollege = reqParams.college;
  var userCollegeMedium  = reqParams.college_medium;
  var userBranch   = reqParams.branch;
  var userUrgent     = reqParams.urgent;
  var userCondition    = reqParams.quality;
  
  //var access_token = crypto.createHash("md5").update(userPhone).digest("hex");
  var sqlQuery = "INSERT INTO web_books_request (user_name, user_phone , quality , sem , college "+
                 ",college_medium, branch , urgent) "+
                 "VALUES(?, ?, ?, ? , ? , ?, ?, ? )";
  var queryParams = [userName, userPhone , userCondition , userSem , userCollege , userCollegeMedium , userBranch , userUrgent];
  var tt = connection.query(sqlQuery, queryParams, function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "inserting user into database", err, result);
    if(err) {
      return res.send({
        "log" : "Internal server error",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      "log" : "User created successfully",
      "flag": constants.responseFlags.ACTION_COMPLETE
    });
  });
}
