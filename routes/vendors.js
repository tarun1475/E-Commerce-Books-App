/**
 * @module Vendors
 */

////////////////////////////////////////////////////////////////////
// MODULE DEPENDENCIES
///////////////////////////////////////////////////////////////////
var crypto         = require('crypto');
var async          = require('async');
var utils          = require('./commonfunctions');
var constants      = require('./constants');
var bookRequests   = require('./book_requests');
var logging        = require('./logging');

exports.getBookDetailsById     = getBookDetailsById;
exports.createNewVendor        = createNewVendor;
exports.vendorOrders           = vendorOrders;
exports.blockVendorById        = blockVendorById;
exports.getVendorDetailsPanel  = getVendorDetailsPanel;
exports.getVendorSales         = getVendorSales;
exports.searchVendor           = searchVendor;

/**
 * <b>API [POST] /books-auth/vendor_orders </b> <br>
 * API to fetch vendor orders
 * @param vendor_id 
 * @return {JSON} - Response body contains log and flag
 */
function vendorOrders(req, res) {
  var handlerInfo = {
    "apiModule": "Users",
    "apiHandler": "vendorOrders"
  };
  var vendorId = req.body.vendor_id;
  var start_from = req.body.start_from;
  var page_size = req.body.page_size;
  if(utils.checkBlank([vendorId])) {
    return res.send(constants.parameterMissingResponse);
  }
  getDeliveriesOfVendor(handlerInfo, vendorId,start_from,page_size, function(err, result) {
    if(err) {
      return res.send({
        "log": err,
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      "log": "Successfully fetched deliveries",
      "date": result,
      "flag": constants.responseFlags.ACTION_COMPLETE
    });
  });
}
function getDeliveriesOfVendor(handlerInfo, vendorId,start_from,page_size,callback){
   var sqlQuery = "SELECT * FROM tb_delivery_distribution WHERE vendor_id = ?  ORDER BY logged_on DESC LIMIT ?, ?";
   var tt = connection.query(sqlQuery, [vendorId,start_from, page_size], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting user requests", err, result, tt.sql);
     if(err) {
        return callback("There was some error in getting delivery details", null);
      }
     
      callback(null, result);

});
}
/**
 * <b>API [POST] '/req_book_auth/get_books_by_id' </b><br>
 * API responsible for getting book to the respective id.<br>
 * request body requires the following parameters: 
 * @param {INTEGER} book_id

*/
function getBookDetailsById(req, res) {
  var handlerInfo   = {
    "apiModule" : "Users",
    "apiHandler": "getBookDetailsById"
  };
  var bookId = req.body.book_id;
  var sqlQuery = "SELECT * FROM tb_books WHERE book_id = ? ";
   var tt = connection.query(sqlQuery, [bookId], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting books details", err, result, tt.sql);
     if(err) {
      return res.send({
        "log": "server execution error",
        "flag": constants.responseFlags.ACTION_FAILED
      });
      }
      res.send({
        "log": "successfully fetched books",
        "flag": constants.responseFlags.ACTION_COMPLETE,
        "books":result
      });
});
}
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
  var vendorAddress = reqParams.vendor_address;
  var city = reqParams.vendor_city;

  if(utils.checkBlank([vendorName, vendorAddress, city])) {
    return res.send({
      "log" : "some parameters are missing/invalid",
      "flag": constants.responseFlags.ACTION_FAILED
    });
  }

    var sqlQuery = "INSERT INTO tb_vendors (vendor_name,  vendor_address, vendor_city," +
        "date_registered) "+
                   "VALUES(?, ?, ?, DATE(NOW()))";
    connection.query(sqlQuery, [vendorName,  vendorAddress,  city], function(err, result) {
      if(err) {
        console.log(err);
        return res.send({
          "log": "Server execution error",
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      return res.send({
        "log" : "Successfully created vendor",
        "flag": constants.responseFlags.ACTION_COMPLETE
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
