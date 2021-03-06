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

exports.vendorResponses        = vendorResponses;
exports.superVendorLocation    = superVendorLocation;
exports.cashIncashOut          = cashIncashOut;
exports.fetchVendorNumbers     = fetchVendorNumbers;
exports.getBookDetailsById     = getBookDetailsById;
exports.createNewVendor        = createNewVendor;
exports.vendorOrders           = vendorOrders;
exports.blockVendorById        = blockVendorById;
exports.getVendorDetailsPanel  = getVendorDetailsPanel;
exports.getVendorSales         = getVendorSales;
exports.searchVendor           = searchVendor;
exports.getBookDetailsByVendorId = getBookDetailsByVendorId;
/**
 * <b>API [POST] /books-auth/response_details </b> <br>
 * API to fetch vendor responses to request ids numbers
 * @param doesnt require any parameter.
 * @return {JSON} - Response body contains log and flag
 */
function vendorResponses(req , res){
  var handlerInfo = {
    "apiModule": "Users",
    "apiHandler": "vendorResponses"
  };
  var dateInterval = req.body.date_interval;
  var sqlQuery = "SELECT * FROM tb_books_response WHERE DATE(logged_on) BETWEEN DATE(?) AND DATE(?) ORDER BY logged_on DESC";
   var tt = connection.query(sqlQuery,[dateInterval.start_date,dateInterval.end_date], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting vendor responses", err, result, tt.sql);
     if(err) {
        return res.send({
          "log":"There was some error in getting  details",
          "flag":constants.responseFlags.ACTION_FAILED
        });
      }
      bindVendorRates(handlerInfo,dateInterval,function(resErr,resRes){
        if(resErr){
          return res.send({
          "log":resErr,
          "flag":constants.responseFlags.ACTION_FAILED
        });
        }

        res.send({
          "log":"successfully fetched responses",
          "flag":constants.responseFlags.ACTION_COMPLETE,
          "responses":resRes,
          "data":result
        });

      });

});
}
function bindVendorRates(handlerInfo,dateInterval,callback){
  var sqlQuery = "SELECT * FROM tb_books_overall_distribution WHERE DATE(logged_on) BETWEEN DATE(?) AND DATE(?) ORDER BY logged_on DESC ";
   var tt = connection.query(sqlQuery,[dateInterval.start_date,dateInterval.end_date], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting user requests", err, result, tt.sql);
     if(err) {
        return callback("There was some error in getting delivery details", null);
      }

      callback(null, result);

});
}
/**
 * <b>API [POST] /books-auth/cash_inOut </b> <br>
 * API to insert vendor location details to database
 * @param doesnt require any parameter.
 * @return {JSON} - Response body contains log and flag
 */
function cashIncashOut(req , res){
  var handlerInfo = {
    "apiModule": "Users",
    "apiHandler": "cashIncashOut"
  };
  var vendorId = req.body.vendor_id;
  var cashIn = req.body.cash_in || 0;
  var cashInpurpose = req.body.cash_in_purpose || 0;
  var cashOutpurpose = req.body.cash_out_purpose || 0;
  var cashOut = req.body.cash_out || 0;
  var profit = parseInt(cashIn - cashOut) || 0;
  var sqlQuery = "INSERT INTO tb_cashIn_cashOut (vendor_id,  cash_in, cash_in_purpose,cash_out,cash_out_purpose,profit,date) VALUES(?, ?, ?, ?,?,?, DATE(NOW()))";
    connection.query(sqlQuery, [vendorId,  cashIn,cashInpurpose,cashOut,cashOutpurpose,profit], function(err, result) {
      if(err) {
        console.log(err);
        return res.send({
          "log": "Server execution error",
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      return res.send({
        "log" : "Successfully inserted cashIncashOut details",
        "flag": constants.responseFlags.ACTION_COMPLETE
      });
    });
}
/**
 * <b>API [POST] /books-auth/location </b> <br>
 * API to insert vendor location details to database
 * @param doesnt require any parameter.
 * @return {JSON} - Response body contains log and flag
 */
function superVendorLocation(req , res){
  var handlerInfo = {
    "apiModule": "Users",
    "apiHandler": "superVendorLocation"
  };
  var from = req.body.fromSector;
  var to = req.body.toSector;
  var kms = req.body.kms;
  var vendor_id = req.body.vendor_id;
  var sqlQuery = "INSERT INTO tb_super_vendor_location (vendor_id,  from_sector, to_sector, kms,time) VALUES(?, ?, ?, ?, DATE(NOW()))";
    connection.query(sqlQuery, [vendor_id,  from,to, kms], function(err, result) {
      if(err) {
        console.log(err);
        return res.send({
          "log": "Server execution error",
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      return res.send({
        "log" : "Successfully inserted location details",
        "flag": constants.responseFlags.ACTION_COMPLETE
      });
    });
}
/**
 * <b>API [GET] /books-auth/fetch_numbers </b> <br>
 * API to fetch vendor mobile numbers
 * @param doesnt require any parameter.
 * @return {JSON} - Response body contains log and flag
 */
function fetchVendorNumbers(req , res){
  var handlerInfo = {
    "apiModule": "Users",
    "apiHandler": "fetchVendorNumbers"
  };
  var is_active = 1;
  var sqlQuery = "SELECT vendor_phone FROM tb_vendors WHERE is_active = ?";
   var tt = connection.query(sqlQuery,[is_active], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting vendor numbers", err, result, tt.sql);
     if(err) {
        return res.send({
          "log":"There was some error in getting delivery details",
          "flag":constants.responseFlags.ACTION_FAILED
        });
      }
     res.send({
          "log":"successfully fetched numbers",
          "flag":constants.responseFlags.ACTION_COMPLETE,
          "data":result
        });

});
}
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
  if(utils.checkBlank([vendorId])) {
    return res.send(constants.parameterMissingResponse);
  }
  getDeliveriesOfVendor(handlerInfo, vendorId, function(err, result) {
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
function getDeliveriesOfVendor(handlerInfo, vendorId,callback){
   var sqlQuery = "SELECT * FROM tb_delivery_distribution WHERE vendor_id = ?  ORDER BY logged_on DESC LIMIT ?, ?";
   var tt = connection.query(sqlQuery, [vendorId,0, 100], function(err, result) {
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
 * @param vendor_id - {INTERGER} vendor id
 * @return {JSON} - Response body contains vendor detail
 */

function getVendorDetailsPanel(req, res) {
  var handlerInfo = {
    "apiModule": "Vendors",
    "apiHandler": "getVendorDetailsPanel"
  };
  var reqParams = req.body;
  var vendorPhone = reqParams.vendor_phone;
  getVendorDetails(handlerInfo, vendorPhone,function(err, result) {
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

function getVendorDetails(handlerInfo, vendor_phone,  callback) {
  var sqlQuery = "SELECT * FROM tb_vendors WHERE vendor_phone = ?";

  var tt = connection.query(sqlQuery, [vendor_phone], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting vendor details", err, result, tt.sql);
    if(err) {
      return callback("There was some error in getting vendor details", null);
    }
    var responseData = {};
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
    "SUM(distribution.book_price ) as total_sales,SUM(distribution.mrp ) as total_mrp  FROM ( "+
    "SELECT vendor_id, book_price,mrp, vevsa_commission, DATE(logged_on)as logged_on FROM tb_delivery_distribution "+
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
  var sqlQuery = "SELECT * FROM tb_vendors WHERE vendor_phone = ? ";
  var tt = connection.query(sqlQuery, [searchKey], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "searching vendor", err, result, tt.sql);
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}

/**
 * <b> API [POST] books-auth/get_book_details_by_vendor_id</b><br>
 * @param req {INTEGER} vendor_id to search the vendor
 * @param req {INTEGER} is_available to check the status
 */

function getBookDetailsByVendorId(req, res) {
  var handlerInfo = {
    "apiModule": "Vendors",
    "apiHandler": "getBookDetailsByVendorId"
  };

  var reqParams = req.body;
  var vendor_id = parseInt(reqParams.vendor_id);
  var is_available = parseInt(reqParams.is_available);

  getBookDetailsByVendorIdHelper(handlerInfo, vendor_id, is_available, function (err, result) {
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

function getBookDetailsByVendorIdHelper(handlerInfo, vendor_id, is_available ,  callback) {
  var sqlQuery = "SELECT tb_books_overall_distribution.price,  tb_books_overall_distribution.mrp , "+
  "tb_books_overall_distribution.is_available, tb_books.book_name, tb_books.book_author "+
  " FROM tb_books_overall_distribution INNER JOIN tb_books ON tb_books.book_id = tb_books_overall_distribution.book_id "+
   "WHERE vendor_id = ? AND is_available =  ?";
  var tt = connection.query(sqlQuery, [vendor_id , is_available], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "searching vendor", err, result, tt.sql);
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}
