/**
 * @module Analytics
 */

// Created by rohan on 7/5/16.
var async = require('async');
var logging = require('./logging');
var constants = require('./constants');
var bookRequests = require('./book_requests');

exports.checkResponse         = checkResponse;
exports.getOverallReportPanel = getOverallReportPanel;
exports.getOverallRequests    = getOverallRequests;
exports.getRequestByUserId    = getRequestByUserId;
exports.getVendorEngagements  = getVendorEngagements;
exports.totalSales            = totalSales;

/**
 * [POST] '/books-auth/check_response'<br>
 * API responsible for check response status.
 * @param {INTEGER} req_id - request id of book request
 */

function checkResponse(req, res) {
  var handlerInfo    = {
    "apiModule" : "bookRequests",
    "apiHandler": "checkResponse"
  };
  var status          =  4;

   var checkRes = "SELECT status,request_id FROM tb_books_response WHERE  status = ?";
  connection.query(checkRes, [status], function(ResErr, checkRes) {
    if(ResErr) {
       return res.send({
          "status": -1
        });
    }
    return res.send({
          "data": checkRes
        });

  });
}
/**
 * <b>API [POST] /books-auth/report </b> <br>
 * API to get overall report regarding sales and requests
 * @param token - {STRING} access token
 * @param date_interval - {OBJECT} object containing start and end date offsets
 * @return {JSON} - Response body contains an object containing report counts
 */
function getOverallReportPanel(req, res) {
    var handlerInfo = {
        "apiModule": "analytics",
        "apiHandler": "getOverallReportPanel"
    };
    var dateInterval = req.body.date_interval;
    var ordersPlaced = [];
    var ordersCancelled = [];
    var totalSales = [];
    var salesPerVendor = [];
    var totalRequests = [];
    var totalCancelledRequests = [];
    var totalPendingRequests = [];
    var totalCompleteRequests = [];

    var asyncTasks = [];
    asyncTasks.push(getOrderDetails.bind(null, handlerInfo, ordersPlaced, ordersCancelled, dateInterval));
    asyncTasks.push(getRequestsDetails.bind(null, handlerInfo, totalRequests, totalPendingRequests, totalCancelledRequests, totalCompleteRequests, dateInterval));
    asyncTasks.push(getSalesDetails.bind(null, handlerInfo, totalSales, salesPerVendor, dateInterval));
    async.parallel(asyncTasks, function(err, result) {
        if(err) {
            return res.send({
                "log": err,
                "flag": constants.responseFlags.ACTION_FAILED
            });
        }
        var responseData = {};
        responseData.orders_placed = ordersPlaced[0];
        responseData.orders_cancelled = ordersCancelled[0];
        responseData.total_sales = totalSales[0];
        responseData.sales_per_vendor = salesPerVendor;
        responseData.total_book_requests = totalRequests[0];
        responseData.total_cancelled_requests = totalCancelledRequests[0];
        responseData.total_complete_requests = totalCompleteRequests[0];
        responseData.flag = constants.responseFlags.ACTION_COMPLETE;
        responseData.log = "Successfully fetched report data";
        res.send(responseData);
    });
}

function getOrderDetails(handlerInfo, ordersPlaced, ordersCancelled, dateInterval, callback) {
    var sqlQuery = "SELECT COUNT(*) as ordersPlaced FROM tb_delivery WHERE DATE(delivery_date) BETWEEN DATE(?) AND DATE(?)";
    var tt = connection.query(sqlQuery, [dateInterval.start_date, dateInterval.end_date], function(err, result) {
        logging.logDatabaseQuery(handlerInfo, "getting orders placed in a date interval", err, result, tt.sql);
        if(err) {
            return callback("There was some error in getting orders details", null);
        }
        ordersPlaced = result[0].ordersPlaced;
        // no idea about what it actually means
        ordersCancelled = 0;
        callback(null, result);
    });
}

function getRequestsDetails(handlerInfo, totalRequests, totalPendingRequests, totalCancelledRequests, totalCompleteRequests, dateInterval, callback) {
    var sqlQuery = "SELECT COUNT(IF(status = 0, 1, NULL)) as pending, COUNT(IF(status=1, 1, NULL)) as complete, COUNT(IF(status=2, 1, NULL)) as cancelled " +
        ", COUNT(*) as totalRequests FROM tb_book_requests " +
        "WHERE DATE(generated_on) BETWEEN DATE(?) AND DATE(?) ";
    var tt = connection.query(sqlQuery, [dateInterval.start_date, dateInterval.end_date], function(err, result) {
        logging.logDatabaseQuery(handlerInfo, "getting requests details", err, result, tt.sql);
        if(err) {
          console.log(err);
          return callback("There was some error in getting requests data", null);
        }
        totalRequests[0] = result[0].totalRequests;
        totalPendingRequests[0] = result[0].pending;
        totalCancelledRequests[0] = result[0].cancelled;
        totalCompleteRequests[0] = result[0].complete;
        callback(null, "Successfully fetched data");
    });
}

function getSalesDetails(handlerInfo, totalSales, salesPerVendor, dateInterval, callback) {
    var sqlQuery = "SELECT  delivery_distribution.vendor_id, vendors.vendor_name, SUM(delivery_distribution.book_price) as price "+
        "FROM `tb_delivery_distribution` as delivery_distribution "+
        "JOIN tb_vendors as vendors ON vendors.vendor_id = delivery_distribution.vendor_id "+
        "WHERE DATE(delivery_distribution.logged_on) BETWEEN DATE(?) AND DATE(?) "+
        "GROUP BY delivery_distribution.vendor_id ";
    var tt = connection.query(sqlQuery, [dateInterval.start_date, dateInterval.end_date], function(err, result) {
        logging.logDatabaseQuery(handlerInfo, "getting sales details", err, result, tt.sql);
        if(err) {
          return callback("There was some error in getting sales details", null);
        }
        totalSales[0] = 0;
        for(var i = 0; i < result.length; i++) {
            salesPerVendor.push(result[i]);
            totalSales[0]  += result[i].price;
        }
        salesPerVendor = result;
        callback(null, "Sucessfully fetched data from database");
    });
}

/**
 * <b>API [POST] /books-auth/get_requests</b><br>
 * API to get overall panel requests
 * @param token {STRING} access token
 * @param date_interval {OBJECT} date interval for requests
 * @param req_type {INTEGER} 0 -> Pending, 1 -> Complete, 2 -> Cancelled
 * @return {JSON}  Response body would contain an array of request objects in 'data' key
 *
 */
function getOverallRequests(req, res) {
    var handlerInfo = {
      "apiModule" : "analytics",
      "apiHandler": "getOverallRequests"
    };
    var reqParams = req.body;
    var dateInterval = reqParams.date_interval;
    var requestStatus = reqParams.req_type;
    getOverallRequestsHelper(handlerInfo, requestStatus, dateInterval, function(err, result) {
        if(err) {
            return res.send({
                "log": err,
                "flag": constants.responseFlags.ACTION_FAILED
            });
        }
        res.send({
            "log": "Successfully fetched the requests",
            "flag": constants.responseFlags.ACTION_COMPLETE,
            "data": result
        });
    });
}

function getOverallRequestsHelper(handlerInfo, requestStatus, dateInterval, callback) {
    var sqlQuery = "SELECT req_id FROM tb_book_requests WHERE status = ? AND DATE(generated_on) BETWEEN DATE(?) AND DATE(?)";
    var tt =connection.query(sqlQuery, [requestStatus, dateInterval.start_date, dateInterval.end_date], function(err, result) {
        if(err) {
            logging.logDatabaseQuery(handlerInfo, "getting overall requests for panel", err, result, tt.sql);
            return callback("There was some error in getting requests data", null);
        }
        var requestArr = [];
        for(var i = 0; i < result.length; i++) {
            requestArr.push(result[i].req_id);
        }
        bookRequests.getRequestDetailsWrapper(handlerInfo, requestArr, function(reqErr, reqArr) {
          if(reqErr) {
            return callback(reqErr, null);
          }
          callback(null, reqArr);
        });
    });
}


/**
 * <b>API [POST] /books-auth/get_requests</b><br>
 * API to get overall panel requests
 * @param token {STRING} access token
 * @param date_interval {OBJECT} date interval for requests
 * @param req_type {INTEGER} 0 -> Pending, 1 -> Complete, 2 -> Cancelled
 * @return {JSON}  Response body would contain an array of request objects in 'data' key
 *
 */
function getRequestByUserId(req, res) {
    var handlerInfo = {
      "apiModule" : "analytics",
      "apiHandler": "getRequestByUserId"
    };
    var reqParams = req.body;
    var dateInterval = reqParams.date_interval;
    var requestStatus = reqParams.req_type;
    var user_id = reqParams.user_id;
    getRequestByUserIdHelper(handlerInfo, requestStatus,user_id ,dateInterval, function(err, result) {
        if(err) {
            return res.send({
                "log": err,
                "flag": constants.responseFlags.ACTION_FAILED
            });
        }
        res.send({
            "log": "Successfully fetched the requests",
            "flag": constants.responseFlags.ACTION_COMPLETE,
            "data": result
        });
    });
}

function getRequestByUserIdHelper(handlerInfo, requestStatus,user_id ,dateInterval, callback) {
    var sqlQuery = "SELECT req_id FROM tb_book_requests WHERE status = ? AND user_id = ? AND DATE(generated_on) BETWEEN DATE(?) AND DATE(?)";
    var tt =connection.query(sqlQuery, [requestStatus, user_id,dateInterval.start_date, dateInterval.end_date], function(err, result) {
        if(err) {
            logging.logDatabaseQuery(handlerInfo, "getting overall requests for panel", err, result, tt.sql);
            return callback("There was some error in getting requests data", null);
        }
        var requestArr = [];
        for(var i = 0; i < result.length; i++) {
            requestArr.push(result[i].req_id);
        }
        bookRequests.getRequestDetailsWrapper(handlerInfo, requestArr, function(reqErr, reqArr) {
          if(reqErr) {
            return callback(reqErr, null);
          }
          callback(null, reqArr);
        });
    });
}

/**
 * <b>API [POST] /books-auth/get_vendors_engagement</b><br>
 * API to get overall panel requests
 * @param token {STRING} access token
 * @param date_interval {OBJECT} date interval for requests
 * @return {JSON} Response body contains array of vendor objects
 */
function getVendorEngagements(req, res) {
    var handlerInfo = {
      "apiModule": "analytics",
      "apiHandler": "getVendorEngagements"
    };
    var dateInterval = req.body.date_interval;
    getVendorEngagementsHelper(handlerInfo, dateInterval, function(err, result) {
        if(err) {
          return res.send({
            "log": err,
            "flag": constants.responseFlags.ACTION_FAILED
          });
        }
        res.send({
          "log": "Successfully fetched vendor engagement",
          "flag": constants.responseFlags.ACTION_COMPLETE,
          "data":result
        });
    });
}

function getVendorEngagementsHelper(handlerInfo, dateInterval, callback) {
    var sqlQuery = "SELECT distribution.vendor_id, vendors.vendor_name, COUNT(*) as responses_provided "+
        "FROM `tb_books_overall_distribution` as distribution "+
        "JOIN tb_vendors as vendors ON vendors.vendor_id = distribution.vendor_id "+
        "WHERE DATE(logged_on) BETWEEN DATE(?) AND DATE(?) "+
        "GROUP BY distribution.vendor_id";
    var tt = connection.query(sqlQuery, [dateInterval.start_date, dateInterval.end_date], function(err, result) {
        if(err) {
            logging.logDatabaseQuery(handlerInfo, "getting vendor engagements", err, result);
            return callback("There was some error in getting vendors engagement", null);
        }
        callback(null, result);
    });
}



/**
 * <b>API [GET] /total_sales</b><br>
 * API to fetch totalsales,<br>
 * Request body requires the following parameters
 */

function totalSales(req, res) {

  var sqlQuery = "SELECT SUM(qty*book_price) as total_sales FROM tb_delivery_distribution ";

  var tt = connection.query(sqlQuery , function(err, totalSalesRes) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "getting delivery details by id", err, totalSalesRes, tt.sql);
      return callback("There was some error in fetching data corresponding to this delivery id", null);
    }
    if(deliveryRes.length == 0) {
      return callback("No data found corresponding to this delivery id", null);
    }

    res.send(
     {"log": "Successfully fetched vendor engagement",
     "flag": constants.responseFlags.ACTION_COMPLETE,
     "data":totalSalesRes
     }

    );
 });

}
