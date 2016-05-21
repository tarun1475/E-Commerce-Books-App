/*
 * Module dependencies
 */
var utils     = require('./commonfunctions');
var constants = require('./constants');
exports.createNewVendor     = createNewVendor;

function createNewVendor(req, res) {
  var reqParams     = req.body;
  var vendorName    = reqParams.vendor_name;
  var vendorEmail   = reqParams.vendor_email;
  var vendorPhone   = reqParams.vendor_phone;
  var vendorAddress = reqParams.vendor_address;
  var deviceName    = reqParams.device_name;
  var osVersion     = reqParams.os_version;
  var city          = parseInt(reqParams.vendor_city);

  if(utils.checkBlank([vendorName, vendorEmail, vendorPhone, vendorAddress, deviceName, osVersion, city])) {
    return res.send({
      "log" : "some parameters are missing/invalid",
      "flag": constants.responseFlags.ACTION_FAILED
    });
  }
  var dupQuery = "SELECT * FROM tb_vendors WHERE vendor_email = ? OR vendor_phone = ?";
  connection.query(dupQuery, [vendorEmail, vendorPhone], function(dupErr, dupRes) {
    if(dupErr) {
      return res.send({
        "log" : "Server execution error",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    if(dupRes.length > 0) {
      return res.send({
        "log" : "A vendor already exists with this email/phone",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    var sqlQuery = "INSERT INTO tb_vendors (vendor_name, vendor_email, vendor_phone, vendor_address, vendor_device_name, vendor_device_os, vendor_city) "+
                   "VALUES(?, ?, ?, ?, ?, ?, ?)";
    connection.query(sqlQuery, [vendorName, vendorEmail, vendorPhone, vendorAddress, deviceName, osVersion, city], function(err, result) {
      if(err) {
        console.log(err);
        return res.send({
          "log": "Server execution error",
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      return res.send({
        "log" : "Successfully created vendor",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    });
  });
}
