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
exports.getVendorSales         = getVendorSales;

/**
 * <b>API [POST] '/books-auth/create_vendor' </b><br>
 * 
 * API to create a new vendor
 * @param {string} vendor_name - Name of the vendor
 * @param {string} vendor_email - Email of vendor
 * @param {string} vendor_phone - Phone number of vendor
 * @param {string} vendor_address - address of the vendor
 * @param {string} device_name - Name of the device
 * @param {string} os_version - OS version
 * @param {integer} vendor_city - city of vendor, 1 for chandigarh
 * @return {JSON} response body contains access_token
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

/**
 * <b>API [POST] /books-auth/block/vendor </b> <br>
 * API to block vendor
 * @param token - {STRING} access token
 * @param status - {INTEGER} 1 -> block, 0 -> unblock
 * @return {JSON} - Response body contains log and flag
 */
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

/**
 * <b>API [POST] /books-auth/get/details_vendor</b> <br>
 * API to get vendor details
 * @param token - {STRING} access token
 * @param vendor_id - {INTERGER} vendor id
 * @return {JSON} - Response body contains vendor detail
 */
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

/**
 * <b>API [POST] /books-auth/get_vendor_sales </b> <br>
 * API to get sales by day of a particular vendor
 * @param token - {STRING} access token
 * @return {JSON} - Response body contains log and flag
 */
function getVendorSales(req, res) {
  var handlerInfo = {
    "apiModule": "vendors",
    "apiHandler": "getVendorSales"
  };
  var reqParams = req.query;
  var vendorId = reqParams.vendor_id;

  var sqlQuery = "SELECT distribution.logged_on,SUM(distribution.vevsa_commission) as total_vevsa_commission, "+
    "SUM(distribution.mrp) as total_sales FROM ( "+
    "SELECT vendor_id, mrp, vevsa_commission, DATE(logged_on)as logged_on FROM tb_delivery_distribution "+
    ") as distribution "+
    "WHERE distribution.vendor_id = ? "+
    "GROUP BY distribution.logged_on"
  var rr = connection.query(sqlQuery, [vendorId], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting vendor sales", err, result, rr.sql);
    if(err) {
      console.log(err);
      return res.send(constants.databaseErrorResponse);
    }
    res.send({
      "log": "Successfully fetched sales information from database",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data": result
    });
  });
}
