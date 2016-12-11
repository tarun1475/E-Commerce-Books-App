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
//exports.createNewVendor        = createNewVendor;
exports.getVendorDetails       = getVendorDetails;
exports.blockVendorById        = blockVendorById;
exports.getVendorDetailsPanel  = getVendorDetailsPanel;
exports.getVendorSales         = getVendorSales;
exports.searchVendor           = searchVendor;


/**
 * <b>API [GET] /books-auth/get_vendor_details </b><br>
 * This api would provide vendor with his her details. Request query<br>
 * requires the following parameters
 * @param {STRING} token    - access token of device
 * @param {INTEGER} edit    - [optional] if you want to edit details then sent edit = 1
 * @param {STRING} name     - [optional] user name
 * @param {STRING} address  - [optional] user address
 * @param {STRING} landmark - [optional] user address landmark
 *
 */
function getVendorDetails(req, res) {
  var handlerInfo = {
    "apiModule": "Users",
    "apiHandler": "getMyDetails"
  };
  var reqParams = req.query;
  var vendorId  = reqParams.vendor_id;
  var toEdit    = reqParams.edit || 0;
  var name      = reqParams.name;
  var address   = reqParams.address;
  var city      = reqParams.city;
  var apiParams = [];
  if(toEdit == 1) {
    apiParams.push(userId, name, address, city);
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
  var reqParams = req.body;
  var vendorId = parseInt(reqParams.vendor_id || 0);
  var deliveryPagination = reqParams.deliveryPagination;
  getVendorDetails(handlerInfo, vendorId, deliveryPagination, function(err, result) {
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

function getVendorDetails(handlerInfo, vendor_id, deliveryPagination, callback) {
  var sqlQuery = "SELECT vendor_id, vendor_name, vendor_phone, vendor_email, vendor_address, vendor_device_name, " +
      "vendor_device_os, vendor_city " +
      "FROM tb_vendors " +
      "WHERE vendor_id = ?";
  var tt = connection.query(sqlQuery, [vendor_id], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting vendor details", err, result, tt.sql);
    if(err) {
      return callback("There was some error in getting vendor details", null);
    }
    var responseData = {};
    responseData.vendor_id         = result[0].vendor_id;
    responseData.vendor_name       = result[0].vendor_name;
    responseData.vendor_phone      = result[0].vendor_phone;
    responseData.vendor_email      = result[0].vendor_email;
    responseData.vendor_address    = result[0].vendor_address;
    responseData.vendor_device_name= result[0].vendor_device_name;
    responseData.vendor_device_os  = result[0].vendor_device_os;
    responseData.vendor_city       = result[0].vendor_city;
    var getDeliveryQuery = "SELECT deliveryDistribution.delivery_id, deliveryDistribution.book_id, " +
        "deliveryDistribution.book_price, deliveryDistribution.mrp, deliveryDistribution.vevsa_commission, " +
        "books.book_name, books.book_stream, books.book_semester, books.type, books.book_author, " +
        "books.book_category, books.publisher, deliveryDistribution.logged_on, " +
        "books.class, books.competition_name, books.is_ncert, books.is_guide " +
        "FROM `tb_delivery_distribution` as deliveryDistribution " +
        "JOIN tb_books as books ON books.book_id = deliveryDistribution.book_id " +
        "WHERE deliveryDistribution.vendor_id = ? " +
        "ORDER BY deliveryDistribution.logged_on DESC " +
        "LIMIT ?, ?";
    var jj = connection.query(getDeliveryQuery, [vendor_id, deliveryPagination.start_from, deliveryPagination.page_size], function(delErr, deliveriesData) {
      logging.logDatabaseQuery(handlerInfo, "getting deliveries for a vendor", delErr, deliveriesData, jj.sql);
      if(delErr) {
        return callback("There was some error in getting delivery details", null);
      }
      responseData.recent_deliveries = deliveriesData;
      callback(null, responseData);
    });
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

/**
 * <b> API [GET] books-auth/searchVendor</b><br>
 * @param req {OBJECT} request query should contain token and key for search
 * @param res {OBJECT} response would return the result
 */
function searchVendor(req, res) {
  var handlerInfo = {
    "apiModule": "Vendors",
    "apiHandler": "searchVendor"
  };
  var reqParams = req.query;
  var searchKey = reqParams.key;
  searchVendorHelper(handlerInfo, searchKey, function (err, result) {
    if (err) {
      return res.send(constants.databaseErrorResponse);
    }
    if (result.length == 0) {
      return res.send({
        "log": "Invalid vendor ",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      "log": "Successfully fetched data from database",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data": result
    });
  });
}

function searchVendorHelper(handlerInfo, searchKey, callback) {
  var sqlQuery = "SELECT * FROM tb_vendors " +
      "WHERE vendor_id = ? OR vendor_name LIKE '%"+searchKey+"%' OR vendor_email LIKE '%"+searchKey+"%' " +
      "OR vendor_address LIKE '%"+searchKey+"%' ";
  var tt = connection.query(sqlQuery, [searchKey], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "searching vendor", err, result, tt.sql);
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}
