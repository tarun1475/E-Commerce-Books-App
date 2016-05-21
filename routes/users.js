/*
 * Module dependencies
 */
var utils          = require('./commonfunctions');
var constants      = require('./constants');
exports.createNewAppUser      = createNewAppUser;

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
    var sqlQuery = "INSERT INTO tb_users (user_name, user_email, user_phone, user_address, device_name, os_name, os_version, user_city) "+
                   "VALUES(?, ?, ?, ?, ?, ?, ?, ?)";
    connection.query(sqlQuery, [userName, userEmail, userPhone, userAddress, deviceName, osName, osVersion, userCity], function(err, result) {
      if(err) {
        console.log(err);
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
  });
}
