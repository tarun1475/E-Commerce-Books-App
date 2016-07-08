/**
 * @module Analytics
 * Created by rohan on 7/5/16.
 */
var async = require('async');
var logging = require('./logging');
var constants = require('./constants');
var bookRequests = require('./book_requests');

exports.getOverallReportPanel = getOverallReportPanel;
exports.getOverallRequests    = getOverallRequests;

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

function getOverallRequests(req, res) {
    var handlerInfo = {
      "apiModule" : "analytics",
      "apiHanlder": "getOverallRequests"
    };
    var reqParams = req.body;
    var dateInterval = reqParams.date_interval;
    getOverallRequestsHelper(handlerInfo, dateInterval, function(err, result) {
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

function getOverallRequestsHelper(handlerInfo, dateInterval, callback) {
    var sqlQuery = "SELECT req_id FROM tb_book_requests WHERE DATE(generated_on) BETWEEN DATE(?) AND DATE(?)";
    var tt =connection.query(sqlQuery, [dateInterval.start_date, dateInterval.end_date], function(err, result) {
        if(err) {
            logging.logDatabaseQuery(handlerInfo, "getting overall requests for panel", err, result, tt.sql);
            return callback("There was some error in getting requests data", null);
        }
        var requestArr = [];
        for(var i = 0; i < result.length; i++) {
            requestArr.push(result[i].req_id);
        }
        var asyncTasks = [];
        var requestObj = {};
        for(var i = 0; i < result.length; i++) {
            asyncTasks.push(bookRequests.getRequestDetailsById.bind(handlerInfo, requestArr[i], requestObj));
        }
        async.parallel(asyncTasks, function(asyncErr, asyncRes) {
            if(asyncErr) {
                return callback(asyncErr, null);
            }
            var requestObj = Object.keys(resquestObj).map(function(key) { return resquestObj[key] });
            callback(null, "Successfully fetched the request information");
        });
    });
}
