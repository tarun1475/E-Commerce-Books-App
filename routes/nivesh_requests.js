/**
 * @module Nivesh-Requests
 */

///////////////////////////////////////////////////////////////////
//  Module dependencies
///////////////////////////////////////////////////////////////////
var utils     = require('./commonfunctions');
var constants = require('./constants');
var async     = require('async');
var messenger = require('./messenger');
var logging   = require('./logging');


exports.confirmNiveshOrder            = confirmNiveshOrder;
exports.fetchNiveshDb             		= fetchNiveshDb;
exports.fetchDetailsByOrderId         = fetchDetailsByOrderId;
exports.sendEmailOnCountDown 			    = sendEmailOnCountDown;


function confirmNiveshOrder(req, res) {
  var handlerInfo     = {
    "apiModule": "niveshRequests",
    "apiHandler": "confirmNiveshOrder"
  };
  var user_id          		 	 = req.body.user_id;
  var investment_amount      = req.body.investment_amount;
  var rate_of_interest       = req.body.rate_of_interest;
  var duration			 	       = req.body.duration;
  var investment_return 		 = req.body.investment_return;
  var user_phone				     = req.body.user_phone;
  var user_name					     = req.body.user_name;
  var logged_out    			   = req.body.logged_out;
   // send email to admins
        var from     = 'support@vevsa.com';
        var to       = config.get('emailRecipents.orderConfirmationEmail').split(',');
        var subject  = 'ORDER CONFIRMATION : Nivesh Order amount '+investment_amount;
        var text     = "";
        var html     = "Hello, <br><br>"+
                       "The order corresponding to the User id : "+user_id+"<br />"+
                       "User name: "+user_name+"<br />"+
                       "Mobile number is :"+user_phone+
                       " has been confirmed. <br />"+
                       "Total Amount: "+ investment_amount + "<br />" +
                       "for duaration of " + duration +" months"+
                       "date on which invesment duration end is "+logged_out+
                        "<br />Please check vevsa super vendor app for more details.";

        messenger.sendEmailToUser(from, to, subject, text, html, function(mailErr, mailRes) {
          if(mailErr) {
            return res.send({
              "log": "There was some error in sending email to admins, request is confirmed though",
              "flag": constants.responseFlags.ACTION_FAILED
            });
          }
        });


	   insertOrders(handlerInfo, user_id,investment_amount,rate_of_interest, duration,investment_return,user_phone,user_name,logged_out,function(insertErr, insertRes){
	    if(insertErr) {
	      return res.send({
	        "log" : "There was some error in updating order details",
	        "flag": constants.responseFlags.ACTION_FAILED
	      });
	    }
	  });
	}
  



/**
 * Helper function to update the book request and update it's status
 * @param handlerInfo {OBJECT} handler info for logging
 * @param requestId {INTEGER} request id
 * @param reqStatus {INTEGER} 0 -> Pending, 1-> Complete, 2-> Cancelled
 * @param callback [FUNCTION] callback function
 */
function insertOrders(handlerInfo, user_id,investment_amount,rate_of_interest, duration,investment_return,user_phone,user_name,logged_out,callback) {
  var sqlQuery = "INSERT INTO tb_nivesh_orders (user_id,investment_amount,rate_of_interest, duration,investment_return,user_phone,user_name,logged_out,logged_on) VALUES (?,?,?,?,?,?,?,?, NOW())";
  var tt = connection.query(sqlQuery, [user_id,investment_amount,rate_of_interest, duration,investment_return,user_phone,user_name,logged_out], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "inserting book delivery", err, result, tt.sql);
      return callback(err, null);
    }
    callback(null, "Sucessfully inserted into OrdersTable");
  });
}


/**
 * [POST] '/req_book_auth/fetch_books_db' <br>
 * API responsible for getting book requests depending upon their status.<br>
 */
function fetchNiveshDb(req, res) {
  var handlerInfo = {
    "apiModule": "niveshRequests",
    "apiHandler": "fetchNiveshDb"
  };

  var sqlQuery = "SELECT * FROM tb_nivesh_orders WHERE status = 1 ORDER BY investment_amount DESC";
  var jj = connection.query(sqlQuery, function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "getting nivesh orders", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }

    res.send({
      "log": "Successfully fetched pending book requests",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data": result

    });
  });
}
function fetchDetailsByOrderId(req, res) {
  var handlerInfo = {
    "apiModule": "niveshRequests",
    "apiHandler": "fetchDetailsByOrderId"
  };

  var reqParams = req.body;
  var user_id    = reqParams.user_id;

  var sqlQuery = "SELECT * FROM tb_nivesh_orders WHERE status = 1 AND user_id = ?";
  var jj = connection.query(sqlQuery,[user_id], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "getting nivesh orders", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }

    res.send({
      "log": "Successfully fetched nivesh orders",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data": result
    });
   });
}

function sendEmailOnCountDown(req, res){
	var handlerInfo = {
    "apiModule": "niveshRequests",
    "apiHandler": "sendEmailOnCountDown"
  };

  // var reqParams  		    = req.body;
  var user_id    		    = req.body.user_id;
  var user_name  		    = req.body.user_name;
  var user_phone 		    = req.body.user_phone;
  var logged_on         = req.body.logged_on;
  var order_id          = req.body.order_id;
  var logged_out 		    = req.body.logged_out;
  var total_days        = req.body.days_remaining;
  var investment_amount = req.body.investment_amount;
  var investment_return	= req.body.investment_return;
  
  // send email to admins
        var from     = 'support@vevsa.com';
        var to       = config.get('emailRecipents.orderConfirmationEmail').split(',');
        var subject  = order_id+' Subscription is expiring';
        var text     = "";
        var html     = "Hello, <br><br>"+
                       "This message corresponding to the User id : "+user_id+"<br />"+
                       "User name: "+user_name+"<br />"+
                       "Mobile number is :"+user_phone+
                       " had confirmed. <br />"+
                       "Total Amount: "+ investment_amount + "<br />" +
                       "for duaration of  months"+
                       "on "+logged_on+" after "+total_days+"<br />"+
                        "<br /> Subscription is ending on "+logged_out+
                        "<br />Total amount to be paid is "+investment_return;

        messenger.sendEmailToUser(from, to, subject, text, html, function(mailErr, mailRes) {
          if(mailErr) {
            return res.send({
              "log": "There was some error in sending email to admins, request is confirmed though",
              "flag": constants.responseFlags.ACTION_FAILED
            });
          }
        });
}