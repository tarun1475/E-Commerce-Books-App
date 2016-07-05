/**
 * @module Vendors
 */

////////////////////////////////////////////////////////////////////
// MODULE DEPENDENCIES
///////////////////////////////////////////////////////////////////
var utils     = require('./commonfunctions');
var constants = require('./constants');
var crypto    = require('crypto');
var logging   = require('./logging');
exports.createNewVendor        = createNewVendor;
exports.blockVendorById        = blockVendorById;
exports.getVendorDetailsPanel  = getVendorDetailsPanel;

/**
 * [POST] '/books-auth/create_vendor' <br>
 * 
 * API to create a new vendor
 * @param {string} vendor_name - Name of the vendor
 * @param {string} vendor_email - Email of vendor
 * @param {string} vendor_phone - Phone number of vendor
 * @param {string} vendor_address - address of the vendor
 * @param {string} device_name - Name of the device
 * @param {string} os_version - OS version
 * @param {integer} vendor_city - city of vendor, 1 for chandigarh
 */
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
    var access_token = crypto.createHash("md5").update(vendorEmail).digest("hex");
    var sqlQuery = "INSERT INTO tb_vendors (vendor_name, vendor_email, vendor_phone, vendor_address, vendor_device_name, vendor_device_os, vendor_city, access_token) "+
                   "VALUES(?, ?, ?, ?, ?, ?, ?, ?)";
    connection.query(sqlQuery, [vendorName, vendorEmail, vendorPhone, vendorAddress, deviceName, osVersion, city, access_token], function(err, result) {
      if(err) {
        console.log(err);
        return res.send({
          "log": "Server execution error",
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      return res.send({
        "log" : "Successfully created vendor",
        "access_token": access_token,
        "flag": constants.responseFlags.ACTION_FAILED
      });
    });
  });
}

function blockVendorById(req, res) {
  var handlerInfo = {
    "apiModule": "Users",
    "apiHandler": "blockUserById"
  };
  var userId = req.body.vendor_id;
  var userStatus = req.body.status;
  if(utils.checkBlank([userId])) {
    return res.send(constants.parameterMissingResponse);
  }
  updateVendorAccountStatus(handlerInfo, userId, userStatus, function(err, result) {
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

function updateVendorAccountStatus(handlerInfo, vendorId, status, callback) {
  if(status != constants.userAccountStatus.BLOCKED && status != constants.userAccountStatus.UNBLOCKED) {
    return callback("Invalid account status provided", null);
  }
  var sqlQuery = "UPDATE tb_vendors SET is_blocked = ? WHERE vendor_id = ?";
  var tt = connection.query(sqlQuery, [status, vendorId], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "block/unblock user by id", err, result, tt.sql);
    if(err) {
      return callback("There was some error in updating vendor", null);
    }
    if(result.affectedRows == 0) {
      return callback("Invalid user id provided", null);
    }
    callback(null, "successfully updated user account")
  });
}

function getVendorDetailsPanel(req, res) {
  var handlerInfo = {
    "apiModule": "Vendors",
    "apiHandler": "getVendorDetailsPanel"
  };
  var vendorId = parseInt(req.body.vendor_id || 0);
  getVendorDetails(handlerInfo, vendorId, function(err, result) {
    if(err) {
      return res.send({
        "log": err,
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      "log": "Successfully fetched vendor details",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data": result
    });
  });
}

function getVendorDetails(handlerInfo, vendor_id, callback) {
  var sqlQuery = "SELECT delivery_distribution.*, books.*, vendors.* "+
      "FROM tb_vendors as vendors  "+
      " LEFT JOIN tb_delivery_distribution as delivery_distribution  ON vendors.vendor_id = delivery_distribution.vendor_id "+
      " LEFT JOIN tb_delivery as delivery ON delivery.delivery_id = delivery_distribution.delivery_id " +
      " LEFT JOIN tb_books as books ON books.book_id = delivery_distribution.book_id " +
      "WHERE vendors.vendor_id = ?";
  var tt = connection.query(sqlQuery, [vendor_id], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting vendor details", err, result, tt.sql);
    if(err) {
      return callback("There was some error in getting vendor details", null);
    }
    callback(null, result);
  });
}
