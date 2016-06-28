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
exports.createNewAppUser                  = createNewAppUser;
exports.getRecentRequestsByUserId         = getRecentRequestsByUserId;

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
 *
 */
function createNewAppUser(req, res) {
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
  connection.query(dupQuery, [userEmail, userPhone], function(dupErr, dupData) {
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
      console.log(tt.sql);
      if(err) {
        console.log(err);
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
  var user_id = req.query.user_id;
  var start_from = req.body.start_from || 0;
  var page_size = req.body.page_size || 5;
  var sqlQuery = "SELECT req_id FROM tb_book_requests WHERE user_id = ? ORDER BY generated_on DESC LIMIT ?, ?";
  connection.query(sqlQuery, [user_id, start_from, page_size], function(err, result) {
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
      asyncTasks.push(bookRequests.getRequestDetailsById.bind(null, requestArr[i], requestObj));
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
        "flag": constants.responseFlags.ACTION_FAILED
      });
    });
  });
}
