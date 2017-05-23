/**
 * @module Book-Requests
 */

///////////////////////////////////////////////////////////////////
//  Module dependencies
///////////////////////////////////////////////////////////////////
var utils     = require('./commonfunctions');
var constants = require('./constants');
var async     = require('async');
var messenger = require('./messenger');
var logging   = require('./logging');


exports.raiseBooksRequest               = raiseBooksRequest;
exports.getBookRequests                 = getBookRequests;
exports.confirmCartOrder                = confirmCartOrder;
exports.searchCartBook                  = searchCartBook;
exports.insertMembershipDetails         = insertMembershipDetails;
exports.isVevsaPro                      = isVevsaPro;
exports.memberShip                      = memberShip;
exports.removeCartItems                 = removeCartItems ;
exports.cartDetails                     = cartDetails;
exports.cartItemsCounter                = cartItemsCounter;
exports.putBooksToCart                  = putBooksToCart;
exports.fetchBooksDb                    = fetchBooksDb;
exports.fetchDetailsByBookId            = fetchDetailsByBookId
exports.putBookRequestSuperVendorResponse = putBookRequestSuperVendorResponse;
exports.putBooksInDb                     = putBooksInDb;
exports.putBookRequestResponse          = putBookRequestResponse;
exports.getMinimumPriceResponse         = getMinimumPriceResponse;
exports.confirmBookOrder                = confirmBookOrder;
exports.getDeliveryDetailsById          = getDeliveryDetailsById;
exports.getMinimumBookResponseWrapper   = getMinimumBookResponseWrapper;
exports.getPendingRequestArr            = getPendingRequestArr;
exports.getRequestDetailsById           = getRequestDetailsById;
exports.getRequestDetailsWrapper        = getRequestDetailsWrapper;
exports.getDeliveries                   = getDeliveries;
exports.getDeliveryDetailsHelper        = getDeliveryDetailsHelper;
exports.updateDeliveryStatus            = updateDeliveryStatus;



/*
 * <b>API [POST] '/req_book_auth/raise_request' </b><br>
 * API responsible for raising a book request.<br>
 * request body requires the following parameters:
 * @param {STRING} token - access token of user 
 * @param {INTEGER} req_type - 0: buy, 1: Sell
 * @param {OBJECT} books - a json object of book requests
 * @param {INTEGER} book_req_category -  0 : College, 1 : School, 2 : Competitions, 3 : Novel
 * @return {JSON} response body contains log and flag indicating success/failure
 */
function raiseBooksRequest(req, res) {
  var handlerInfo   = {
    "apiModule" : "bookRequests",
    "apiHandler": "raiseBookRequest"
  };
  var reqParams     = req.body;
  var user_id       = reqParams.user_id;
  var books         = reqParams.books;
  var requestCat    = reqParams.book_req_category; // 0 : College, 1 : School, 2 : Competitions, 3 : Novel
  var type          = reqParams.req_type || 0; // 0: buy, 1: Sell
  var bookNameFlag  = true;


  for(var i = 0; i < books.length; i++) {
    if(books[i].name == undefined) {
      bookNameFlag = false;
    }
  }

  if(utils.checkBlank([user_id, books, requestCat]) || !bookNameFlag) {
    return res.send(constants.parameterMissingResponse);
  }
  var insertReq  = "INSERT INTO tb_book_requests (user_id, type) VALUES (?, ?)";
  var tt = connection.query(insertReq, [user_id, type], function(insErr, insRes) {
    logging.logDatabaseQuery(handlerInfo, "logging book request", insErr, insRes);
    if(insErr) {
      console.log(insErr);
      return res.send({
        "log": "server execution error",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    var request_id = insRes.insertId;
    var asyncTasks = [];

    for(var i = 0; i < books.length; i++) {
      asyncTasks.push(insertNewBook.bind(null, handlerInfo, request_id,
        books[i].name, books[i].stream || "NA" , books[i].semester || -1 , books[i].vcondition || 0, books[i].book_author || "NA",
        books[i].medium || "English", requestCat || 0, books[i].vclass || "NA", books[i].competition_name || "NA",
        books[i].is_ncert || 0, books[i].is_guide || 0, books[i].publisher_name || "NA", books[i].book_photograph || "NA"));
    }
    async.series(asyncTasks, function(err, result) {
      if(err) {
        console.log(err);
        return res.send({
          "log": "There was some error in recording request",
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      return res.send({
        "log": "successfully registered book request",
        "flag": constants.responseFlags.ACTION_COMPLETE
      });
    });
  });
}

/**
 * Function to insert books in database
 * @param handlerInfo {OBJECT} handlerInfo for logging
 * @param request_id {INTEGER} request id
 * @param name {STRING} name of book
 * @param stream {STRING} stream of book
 * @param semester {INTEGER} semester
 * @param vcondition {INTEGER} 0->Old, 1->New
 * @param author {STRING} book author
 * @param medium {STRING} English/Hindi/Punjabi
 * @param book_category {INTEGER}  0 : College, 1 : School, 2 : Competitions, 3 : Novel
 * @param vclass {STRING} vclass (in case of schools)
 * @param competition_name {STRING} Competitive exam
 * @param isNcert {INTEGER} if book is a ncert book
 * @param isGuide {INTEGER} if book is a helper book
 * @param publisherName {STRING} publisher name
 * @param callback {FUNCTION} a function for success/failure
 */
function insertNewBook(handlerInfo, request_id, name, stream, semester, vcondition, author,
  medium, book_category, vclass, competition_name, isNcert, isGuide, publisherName, photograph, callback) {
  var insertQuery = "INSERT INTO tb_books "+
    "(book_req_id, book_name, book_stream, book_semester, vcondition, book_author, medium, book_category, "+
    "vclass, competition_name, is_ncert, is_guide, publisher, book_photograph) "+
    " VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  var queryParams = [
    request_id, name, stream, semester, vcondition, author, medium, book_category, vclass,
    competition_name, isNcert, isGuide, publisherName, photograph
  ];
  var tt = connection.query(insertQuery, queryParams, function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "inserting books query", err, result, tt.sql);
    if(err) {
      console.log(err);
      return callback(err, null);
    }
    callback(null, "Successfully logged book request");
  });
}
/**
 * [POST] '/req_book_auth/search_cart_book' <br>
 * API responsible for getting book requests depending upon their status.<br>
 */
function searchCartBook(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "searchCartBook"
  };
   var reqParams   = req.body;
   var key = reqParams.key;
   var book_category = "College";

 
  var sqlQuery = "SELECT * FROM tb_books_db WHERE book_name  LIKE '%"+ key +"%' AND book_category != ? ";
  var jj = connection.query(sqlQuery,[book_category], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "fetching search results", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }

    res.send({
      "log": "Successfully fetched search Results",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data":result
    });
  });
}

/**
 * [POST] '/req_book_auth/is_vevsa_pro' <br>
 * API responsible for getting book requests depending upon their status.<br>
 */
function isVevsaPro(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "isVevsaPro"
  };
   var reqParams   = req.body;
   var user_id = reqParams.user_id;

 
  var sqlQuery = "SELECT membership_status FROM tb_membership WHERE user_id = ? ";
  var jj = connection.query(sqlQuery,[user_id], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "fetching membership status", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }

    res.send({
      "log": "Successfully fetched memberShip item",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data":result
    });
  });
}

/**
 * [POST] '/req_book_auth/insert_membership' <br>
 * API responsible for getting book requests depending upon their status.<br>
 */
function insertMembershipDetails(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "insertMembershipDetails"
  };

  var reqParams   = req.body;
  var membership_status = reqParams.membership_status;
  var membership_price = reqParams.membership_price;
   var user_id = reqParams.user_id;

 
  var sqlQuery = "INSERT INTO tb_membership (user_id,membership_status,membership_price,membership_date) VALUES (?,?,?, NOW())";
  var jj = connection.query(sqlQuery,[user_id,membership_status,membership_price], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "inserting membership details", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }

    res.send({
      "log": "Successfully inserted membership details",
      "flag": constants.responseFlags.ACTION_COMPLETE
    });
  });
}

/**
 * [GET] '/req_book_auth/member_ship' <br>
 * API responsible for getting book requests depending upon their status.<br>
 */
function memberShip(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "memberShip"
  };
var book_id = "62";
 
  var sqlQuery = "SELECT * FROM tb_books_db WHERE book_id = ? ";
  var jj = connection.query(sqlQuery,[book_id], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "fetching membership items", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }

    res.send({
      "log": "Successfully fetched memberShip item",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data":result[0]
    });
  });
}

/**
 * <b>[POST] '/books-auth/confirm_cart_order'</b><br>
 * API for confirmation of an order by user<br>
 * Request body requires following parameters:
 * @param {STRING} token - access token of user
 * @param {INTEGER} response_id - response id of vendor
 * @param {INTEGER} request_id - request id of the request
 * @param {VARCHAR} delivery_address - address of the delivery
 * @param {INTEGER} is_urgent - whether delivery is urgent or not
 * @param {INTEGER} vendor_id - vendor who gave the response
 */
function confirmCartOrder(req, res) {
  var handlerInfo     = {
    "apiModule": "bookRequests",
    "apiHandler": "confirmCartOrder"
  };
  var order_id       = req.body.order_id;
  var userId          = req.body.user_id;
  var total_price      = req.body.total_price;
  var books           = req.body.books;
  var membership_status = req.body.membership_status;
  var membership_price = req.body.membership_price;
  
  // send email to admins 
        var from     = 'support@vevsa.com';
        var to       = config.get('emailRecipents.orderConfirmationEmail').split(',');
        var subject  = 'ORDER CONFIRMATION : Cart Order id '+order_id;
        var text     = "";
        var html     = "Hello, <br><br>"+
                       "The order corresponding to the User id : "+userId+
                       " has been confirmed. <br />"+
                       "Total Price: "+ total_price +
                       "No of Books: " + books.length + "<br />Please check vevsa super vendor app for more details.";

        messenger.sendEmailToUser(from, to, subject, text, html, function(mailErr, mailRes) {
          if(mailErr) {
            return res.send({
              "log": "There was some error in sending email to admins, request is confirmed though",
              "flag": constants.responseFlags.ACTION_FAILED
            });
          }
        });


  for(var i=0 ; i< books.length; i++){
     updateCartDetails(handlerInfo, userId, books[i], function(updateErr, updateRes) {
    if(updateErr) {
      return res.send({
        "log" : "There was some error in updating cart details",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }

  });

  }


  insertOrders(handlerInfo, order_id, userId, total_price,function(insertErr, insertRes){
     if(insertErr) {
      return res.send({
        "log" : "There was some error in updating order details",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
  }); 
  for(var i=0 ; i< books.length; i++){
  insertCartOrder(handlerInfo,order_id, userId, books[i], function(orderErr, orderRes){
       if(orderErr) {
      return res.send({
        "log" : "There was some error in updating order details",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }

     res.send({
        "log" : "Successfully Inserted",
        "flag": constants.responseFlags.ACTION_COMPLETE
      });


  });
}
}



/**
 * Helper function to update the book request and update it's status
 * @param handlerInfo {OBJECT} handler info for logging
 * @param requestId {INTEGER} request id
 * @param reqStatus {INTEGER} 0 -> Pending, 1-> Complete, 2-> Cancelled
 * @param callback [FUNCTION] callback function
 */
function insertOrders(handlerInfo,order_id, user_id, total_price,callback) {
  var sqlQuery = "INSERT INTO tb_orders (order_id,user_id,total_price,date_registered) VALUES (?,?,?, NOW())";
  var tt = connection.query(sqlQuery, [order_id,user_id,total_price], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "inserting book delivery", err, result, tt.sql);
      return callback(err, null);
    }
    callback(null, "Sucessfully inserted into OrdersTable");
  });
}

/**
 * Helper function to update the book request and update it's status
 * @param handlerInfo {OBJECT} handler info for logging
 * @param requestId {INTEGER} request id
 * @param reqStatus {INTEGER} 0 -> Pending, 1-> Complete, 2-> Cancelled
 * @param callback [FUNCTION] callback function
 */
function updateCartDetails(handlerInfo, user_id, book_id, callback) {
  var sqlQuery = "DELETE  from tb_cart_db WHERE  user_id = ? AND book_id = ?";
  var tt = connection.query(sqlQuery, [user_id, book_id], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "updating book request", err, result, tt.sql);
      return callback(err, null);
    }
    callback(null, "Sucessfully updated cartDetails");
  });
}

/**
 * Helper function to update the book request and update it's status
 * @param handlerInfo {OBJECT} handler info for logging
 * @param requestId {INTEGER} request id
 * @param reqStatus {INTEGER} 0 -> Pending, 1-> Complete, 2-> Cancelled
 * @param callback [FUNCTION] callback function
 */
function insertCartOrder(handlerInfo,order_id, user_id, book_id, callback) {
  var sqlQuery = "INSERT INTO tb_delivery_db (order_id,user_id, book_id,date_registered) VALUES (?,?, ?, NOW())";
  var tt = connection.query(sqlQuery, [order_id,user_id, book_id], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "inserting book delivery", err, result, tt.sql);
      return callback(err, null);
    }
    callback(null, "Sucessfully inserted into deliveryTable");
  });
}


/**
 * [POST] '/req_book_auth/remove_cart_items' <br>
 * API responsible for getting book requests depending upon their status.<br>
 */
function removeCartItems(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "removeCartItems"
  };

  var reqParams   = req.body;
  var book_id = reqParams.book_id;
  var user_id = reqParams.user_id;

 
  var sqlQuery = "DELETE from tb_cart_db WHERE book_id = ? AND user_id =?";
  var jj = connection.query(sqlQuery,[book_id,user_id], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "delete cart items", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }

    res.send({
      "log": "Successfully deleted from cart",
      "flag": constants.responseFlags.ACTION_COMPLETE
    });
  });
}
/**
 * [POST] '/req_book_auth/cart_details' <br>
 * API responsible for getting book requests depending upon their status.<br>
 */
function cartDetails(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "cartDetails"
  };

  var reqParams   = req.body;
  var user_id = reqParams.user_id;

 
  var sqlQuery = "SELECT book_id from tb_cart_db WHERE user_id = ?";
  var jj = connection.query(sqlQuery,[user_id], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "fetch cart details", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }

    res.send({
      "log": "Successfully fetched from cart",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data":result
    });
  });
}
/**
 * [POST] '/req_book_auth/cart_item_counter' <br>
 * API responsible for getting book requests depending upon their status.<br>
 */
function cartItemsCounter(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "cartItemsCounter"
  };

  var reqParams   = req.body;
  var user_id = reqParams.user_id;
 
  var sqlQuery = "SELECT COUNT(book_id) as items,SUM(book_price) as totalPrice FROM tb_cart_db WHERE user_id = ?";
  var jj = connection.query(sqlQuery,[user_id], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "fetch cart counter", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }

    res.send({
      "log": "Successfully fetched from cart",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data":result[0]
    });
  });
}
/**
 * [POST] '/req_book_auth/put_books_cart' <br>
 * API responsible for getting book requests depending upon their status.<br>
 */
function putBooksToCart(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "putBooksToCart"
  };

  var reqParams   = req.body;
  var book_id = reqParams.book_id;
  var book_price = reqParams.book_price;
  var user_id = reqParams.user_id;
  var cart_status = reqParams.cart_status;

  var dupQuery = "SELECT * FROM tb_cart_db WHERE  user_id = ? AND book_id =? ";
  var tt = connection.query(dupQuery, [user_id,book_id], function(dupErr, dupData) {
    logging.logDatabaseQuery(handlerInfo, "checking duplicate entry", dupErr, dupData);
    if(dupErr) {
      return res.send({
        "log": "Internal server error",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    if(dupData.length > 0) {
      return res.send({
        "log": "The item  has a limit of 1 per customer.",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
 
  var sqlQuery = "INSERT INTO tb_cart_db (user_id, book_id,book_price, cart_status) VALUES (?, ?, ?,?)";
  var jj = connection.query(sqlQuery,[user_id,book_id,book_price,cart_status], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "inserting books", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }

    res.send({
      "log": "Successfully inserted into cart",
      "flag": constants.responseFlags.ACTION_COMPLETE
    });
  });
  });
}
/**
 * [POST] '/req_book_auth/fetch_details_by_book_id' <br>
 * API responsible for getting book requests depending upon their status.<br>
 */
function fetchDetailsByBookId(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "fetchDetailsByBookId"
  };

  var reqParams   = req.body;
  var book_id = reqParams.book_id;
 
  var sqlQuery = " SELECT * FROM tb_books_db WHERE book_id = ? ";
  var jj = connection.query(sqlQuery,[book_id], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "getting books", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }

    res.send({
      "log": "Successfully fetched pending book requests",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data": result[0]

    });
  });
}

/**
 * [POST] '/req_book_auth/fetch_books_db' <br>
 * API responsible for getting book requests depending upon their status.<br>
 */
function fetchBooksDb(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "fetchBooksDb"
  };
 
  var sqlQuery = " SELECT * FROM tb_books_db ";
  var jj = connection.query(sqlQuery, function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "getting books", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }

    res.send({
      "log": "Successfully fetched pending book requests",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data": result

    });
  });
}


/**
 * [POST] '/req_book_auth/get_pending_requests' <br>
 * API responsible for getting book requests depending upon their status.<br>
 * Request body requires the following parameters:
 * @param {STRING}  token      - access token
 * @param {INTEGER} start_from - start index  
 * @param {INTEGER} page_size  - end index
 * @param {INTEGER} req_status - status for request <br>
 *  i.e {0 -> pending, 1-> approved, 2 -> disapproved}
 */
function getBookRequests(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "getBookRequests"
  };
  var reqParams   = req.body;
 var start_from  = parseInt(reqParams.start_from);
  var page_size   = parseInt(reqParams.page_size);
  var vendorId    = reqParams.vendor_id;
  var bookStatus  = reqParams.req_status;
  if(utils.checkBlank([reqParams.start_from, vendorId, reqParams.page_size, bookStatus])) {
    return res.send(constants.parameterMissingResponse);
  }
  var sqlQuery = "SELECT req_id FROM tb_book_requests " +
      "WHERE status = ? AND req_id NOT IN(" +
      "  SELECT request_id FROM `tb_books_response` WHERE vendor_id = ? GROUP BY request_id " +
      ")" +
      "ORDER BY generated_on DESC LIMIT ?, ? ";
  var jj = connection.query(sqlQuery, [bookStatus, vendorId, start_from, page_size], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "getting book requests", err, result, jj.sql);
      return res.send(constants.databaseErrorResponse);
    }
    var requestArr = [];
    for(var i = 0; i < result.length; i++) {
      requestArr.push(result[i].req_id);
    }
    getRequestDetailsWrapper(handlerInfo, requestArr, function(reqErr, requestDetails) {
      if(reqErr) {
        return res.send({
          "log": reqErr,
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      requestDetails.sort(function(a, b) {
        var d1 = new Date(a.generated_on);
        var d2 = new Date(b.generated_on);
        return d1 < d2;
      });
      res.send({
        "log": "Successfully fetched pending book requests",
        "flag": constants.responseFlags.ACTION_COMPLETE,
        "data": requestDetails
      });
    });
  });
}
/**
 * [POST] '/req_book_auth/put_super_vendor_response'<br>
 * API responsible for submitting a request's response from a particular vendor.<br>
 * @param {STRING} token - access token
 * @param {INTEGER} req_id - request id of book request
 * @param {ARRAY} books - An Array of objects 
 */
function putBookRequestSuperVendorResponse(req, res) {
  var handlerInfo    = {
    "apiModule" : "bookRequests",
    "apiHandler": "putBookRequestSuperVendorResponse"
  };
  var reqParams      = req.body;
  var vendorId       = reqParams.vendor_id;
  var requestId      = reqParams.req_id;
  var books          = reqParams.books;
  var status         = reqParams.bookStatus;
  
 

  if(utils.checkBlank([vendorId, requestId, books])) {
    return res.send(constants.parameterMissingResponse);
  }

  
  var checkDup = "SELECT * FROM tb_books_response WHERE vendor_id = ? AND request_id = ?";
  connection.query(checkDup, [vendorId, requestId], function(dupErr, dupRes) {
    if(dupErr) {
      return res.send(constants.databaseErrorResponse);
    }
    var reqQuery = "INSERT INTO tb_books_response (vendor_id, request_id, status) VALUES(?, ?, ?) ";
    var tt = connection.query(reqQuery, [vendorId, requestId , status], function(reqErr, insRes) {
      if(reqErr) {
        logging.logDatabaseQuery(handlerInfo, "inserting book response", reqErr, insRes, tt.sql);
        return res.send(constants.databaseErrorResponse);
      }
      var responseId = insRes.insertId;
      var asyncTasks = [];
      for(var i = 0; i < books.length; i++) {
      var surgePrice = parseInt(books[i].price) + parseInt(books[i].mrp * .02) ;
        console.log("is_available : ", books[i].is_available);
        asyncTasks.push(insertBookResponse.bind(null, handlerInfo, responseId, vendorId, books[i].book_id,
          surgePrice || 10000000, books[i].mrp || 10000000, books[i].is_available == undefined));
      }
      async.series(asyncTasks, function(error, result) {
        if(error) {
          return res.send({
            "log" :error,
            "flag":constants.responseFlags.ACTION_FAILED
          });
        }
        return res.send({
          "log" : "Successfully logged book request response",
          "flag": constants.responseFlags.ACTION_COMPLETE
        });
      });
    });
  });
}
/**
 * [POST] '/req_book_auth/put_books_in_db'<br>
 * API responsible for submitting a request's response from a particular vendor.<br>
 */
function putBooksInDb(req, res) {
  var handlerInfo    = {
    "apiModule" : "bookRequests",
    "apiHandler": "putBooksInDb"
  };
  var reqParams      = req.body;
  var book_name      = reqParams.book_name;
  var book_author    = reqParams.book_author;
  var book_mrp       = reqParams.book_mrp;
  var book_price     = reqParams.book_price;
  var book_category  = reqParams.book_category;
  var book_stream    = reqParams.book_stream;
  var book_sem       = reqParams.book_sem;
  var book_stock     = reqParams.book_stock;
  var book_publisher = reqParams.book_publisher;
  var book_edition   = reqParams.book_edition;
  var book_condition = reqParams.book_condition;

  var reqQuery = "INSERT INTO tb_books_db (book_name, book_author, book_mrp, book_price,book_category,book_stream,book_sem,stock,book_publisher,book_edition,book_condition) VALUES(?,?,?,?,?,?,?,?,?,?,?) ";
    var tt = connection.query(reqQuery, [book_name,book_author,book_mrp,book_price,book_category,book_stream,book_sem,book_stock,book_publisher,book_edition,book_condition], function(reqErr, insRes) {
      if(reqErr) {
        logging.logDatabaseQuery(handlerInfo, "inserting books into db", reqErr, insRes, tt.sql);
        return res.send(constants.databaseErrorResponse);
      }

      res.send({
        "data": insRes,
        "log" : "Successfully logged book request response",
        "flag": constants.responseFlags.ACTION_COMPLETE
      });

    });
  
}


/**
 * [POST] '/req_book_auth/put_response'<br>
 * API responsible for submitting a request's response from a particular vendor.<br>
 * @param {STRING} token - access token
 * @param {INTEGER} req_id - request id of book request
 * @param {ARRAY} books - An Array of objects 
 */
function putBookRequestResponse(req, res) {
  var handlerInfo    = {
    "apiModule" : "bookRequests",
    "apiHandler": "putBookRequestResponse"
  };
  var reqParams      = req.body;
  var vendorId       = reqParams.vendor_id;
  var requestId      = reqParams.req_id;
  var books          = reqParams.books;
  var status         = reqParams.bookStatus;
  
 

  if(utils.checkBlank([vendorId, requestId, books])) {
    return res.send(constants.parameterMissingResponse);
  }

  
  var checkDup = "SELECT * FROM tb_books_response WHERE vendor_id = ? AND request_id = ?";
  connection.query(checkDup, [vendorId, requestId], function(dupErr, dupRes) {
    if(dupErr) {
      return res.send(constants.databaseErrorResponse);
    }
    if(dupRes.length > 0) {
      return res.send({
        "log": "A response already exists corresponding to this request id",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    var reqQuery = "INSERT INTO tb_books_response (vendor_id, request_id, status) VALUES(?, ?, ?) ";
    var tt = connection.query(reqQuery, [vendorId, requestId , status], function(reqErr, insRes) {
      if(reqErr) {
        logging.logDatabaseQuery(handlerInfo, "inserting book response", reqErr, insRes, tt.sql);
        return res.send(constants.databaseErrorResponse);
      }
      var responseId = insRes.insertId;
      var asyncTasks = [];
      for(var i = 0; i < books.length; i++) {
      var surgePrice = parseInt(books[i].price) + parseInt(books[i].mrp * .02) ;
        console.log("is_available : ", books[i].is_available);
        asyncTasks.push(insertBookResponse.bind(null, handlerInfo, responseId, vendorId, books[i].book_id,
          surgePrice || 10000000, books[i].mrp || 10000000, books[i].is_available == undefined));
      }
      async.series(asyncTasks, function(error, result) {
        if(error) {
          return res.send({
            "log" :error,
            "flag":constants.responseFlags.ACTION_FAILED
          });
        }
        return res.send({
          "log" : "Successfully logged book request response",
          "flag": constants.responseFlags.ACTION_COMPLETE
        });
      });
    });
  });
}

/**
 * Function to insert book responses in database. Helper function to putBookResponse
 * @param handlerInfo {OBJECT} handler info for logging
 * @param response_id {INTEGER} response id of the response
 * @param vendor_id {INTERGER} vendor id
 * @param book_id {INTEGER} book id
 * @param book_price {INTERGER} price
 * @param mrp {INTERGER} Maximum retail price of book
 * @param isAvailable {INTEGER} A flag holding availability of book
 * @param callback {FUNCTION} callback function
 */
function insertBookResponse(handlerInfo, response_id, vendor_id, book_id, book_price, mrp, isAvailable, callback) {
  var sqlQuery = "INSERT INTO tb_books_overall_distribution (response_id, vendor_id, book_id, price, mrp, is_available) "+
    "VALUES (?, ?, ?, ?, ?, ?)";
  var tt = connection.query(sqlQuery, [response_id, vendor_id, book_id, book_price, mrp, isAvailable], function(err, result) {
    if(err) {
      logging.error(handlerInfo, "logging book response into db", err, result);
      return callback("There was some error in logging vendor response", null);
    }
    callback(null, "successfully logged request response");
  });
}

/**
 * function to fetch minimum book response corresponding to a  particular request
 * @param {INTEGER} book_id - book id of the book
 * @param {OBJECT} minResponseObj - an object whether minimum response would be added
 * @param {FUNCTION} callback - a callback function
 */
function getMinimumBookResponse(handlerInfo, book_id, minResponseObj, type, callback) {
  var orderStr = "";
  if(type == 1) {
    orderStr = "DESC ";
  }
  var minQuery = "SELECT books.book_name, books.book_stream, books.book_author, books.book_semester,books.vcondition, distribution.*, "+
        "vendors.vendor_name, vendors.vendor_address, vendors.vendor_phone, requests.user_id, books.book_category "+
        "FROM `tb_books_overall_distribution` as distribution "+
        "JOIN tb_books as books ON books.book_id = distribution.book_id "+
        "JOIN tb_vendors as vendors ON vendors.vendor_id = distribution.vendor_id "+
        "JOIN tb_book_requests as requests ON books.book_req_id = requests.req_id "+
        "WHERE distribution.book_id = ? ORDER BY distribution.price "+orderStr;
   var qq = connection.query(minQuery, [book_id], function(minErr, minResponse) {
     logging.logDatabaseQuery(handlerInfo, "getting minimum response for a book", minErr, minResponse, qq.sql);
     if(minErr) {
       return callback("There was some error in getting minimum request", null);
     }
     if(minResponse.length == 0) {
       return callback(null, null);
     }
     if(minResponse[0].is_available == 0) {
       var bookObj = {};
       bookObj.book_id = minResponse[0].book_id;
       bookObj.book_name = minResponse[0].book_name;
       bookObj.book_stream = minResponse[0].book_stream;
       bookObj.book_author = minResponse[0].book_author;
       bookObj.book_semester = minResponse[0].book_semester;
       bookObj.vcondition = minResponse[0].vcondition;
       bookObj.is_available = 0;
       bookObj.book_category = minResponse[0].book_category;
       bookObj.msg = "Sorry, this book is not available right now. Book will be available soon, Please wait.";
       minResponseObj[book_id] = bookObj;
       return callback(null, null);
     }
     minResponseObj[book_id] = minResponse[0];
     callback(null, "Successfully fetched minimum response");
  });
}

/**
 * function to get details of a response from vendors
 * @param response_id {INTEGER} response id
 * @param callback {FUNCTION} a callback function
 */
function getVendorResponseDetails(response_id, callback) {
  var resQuery = "SELECT distribution.book_id, distribution.price, books.book_name, books.book_stream, books.book_semester, books.type "+
                 "FROM `tb_books_overall_distribution` as distribution "+
                 "JOIN tb_books_response as response ON response.response_id = distribution.response_id "+
                 "JOIN tb_books as books ON books.book_id = distribution.book_id "+
                 "WHERE distribution.response_id = ? ";
  connection.query(resQuery, [response_id], function(resErr, responseDetails) {
    if(resErr) {
      return callback("There was some error in getting response details", null);
    }
    callback(null, responseDetails);
  });
}

/**
 * [POST] '/books-auth/get_minimum_response'
 * API to get minimum response corresponding to a specific request id
 * @param {INTEGER} request_id - request id of a request
 */
function getMinimumPriceResponse(req, res) {
  var request_id    = req.body.request_id;
  var handlerInfo   = {
    "apiModule" : "bookRequests",
    "apiHandler": "get_minimum_response"
  };
  getMinimumBookResponseWrapper(handlerInfo, request_id, [], function(err, responseData) {
    if(err) {
      return res.send({
        "log": err,
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      "log" :"Successfully fetched response",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "request_id": request_id,
      "data": responseData
    });
  });
}

/**
 * Function to get minimum book response corresponding to a request_id
 * @param {OBJECT} handlerInfo - handlerinfo for logging
 * @param {INTEGER} request_id              -  request id of a request
 * @param {ARRAY} minimumResponse            -  an array where minimum response would be pushed; although the same
 *                                              object would also be available in callback's result
 * @param {FUNCTION} callback   - a callback function passed
 */
function getMinimumBookResponseWrapper(handlerInfo, request_id, minimumResponse, callback) {
  var reqObj = {};
  getRequestDetailsById(handlerInfo, request_id, reqObj, function(err, requestData) {
    if(err) {
      return callback(err, null);
    }
    var responseObj = {};
    var asyncTasks  = [];
    var reqType     = requestData.type;
    for(var i = 0; i < requestData.books.length; i++) {
      asyncTasks.push(getMinimumBookResponse.bind(null, handlerInfo, requestData.books[i].book_id, responseObj, reqType));
    }
    async.parallel(asyncTasks, function(asyncErr, asyncRes) {
      if(asyncErr) {
        return callback(asyncErr, null);
      }
      var response = Object.keys(responseObj).map(function(key) { return responseObj[key] });
      minimumResponse.push(response);
      callback(null, response);
    });
  });
}

/**
 * <b>[POST] '/books-auth/confirm_book_order'</b><br>
 * API for confirmation of an order by user<br>
 * Request body requires following parameters:
 * @param {STRING} token - access token of user
 * @param {INTEGER} response_id - response id of vendor
 * @param {INTEGER} request_id - request id of the request
 * @param {VARCHAR} delivery_address - address of the delivery
 * @param {INTEGER} is_urgent - whether delivery is urgent or not
 * @param {INTEGER} vendor_id - vendor who gave the response
 */
function confirmBookOrder(req, res) {
  var handlerInfo     = {
    "apiModule": "bookRequests",
    "apiHandler": "confirmBookOrder"
  };
  var responseData    = req.body.data;
  var requestId       = req.body.request_id;
  var deliveryAddress = req.body.delivery_address || req.body.user_address;
  var userName        = req.body.delivery_name || req.body.user_name;
  var userPhone       = req.body.delivery_phone || req.body.user_phone;
  var reqStatus       = req.body.request_status;
  var isUrgent        = parseInt(req.body.is_urgent);
  var userId          = req.body.user_id;
  var totPrice        = parseInt(req.body.tPrice);
  // only process available books:
  var tmp = responseData.slice();
  responseData = [];
  for(var i = 0; i < tmp.length; i++) {
    if(tmp[i].is_available == 1) {
      responseData.push(tmp[i]);
    }
  }
  updateBookRequest(handlerInfo, requestId, reqStatus, function(updateErr, updateRes) {
    if(updateErr) {
      return res.send({
        "log" : "There was some error in updating request",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    if(reqStatus == constants.bookRequestStatus.APPROVED) { 
      var totalPrice = 0;
      var urgentDeliveryCharges = 0;
      for(var i = 0; i < responseData.length; i++)
        totalPrice += responseData[i].price;
      if(isUrgent === 1) {
       urgentDeliveryCharges = 30;
      }
      deliverBooksToUser(handlerInfo, requestId, userId, deliveryAddress, isUrgent, responseData, function(delErr, delRes) {
        if(delErr) {
          return res.send({
            "log" : "There was some error in adding delivery to database",
            "flag": constants.responseFlags.ACTION_FAILED
          });
        }
        // send email to admins 
        var from     = 'support@vevsa.com';
        var to       = config.get('emailRecipents.orderConfirmationEmail').split(',');
        var subject  = 'ORDER CONFIRMATION : Request id '+requestId;
        var text     = "";
        var html     = "Hello, <br><br>"+
                       "The request corresponding to the request id : "+requestId+
                       " has been confirmed. Details are :<br><br>"+
                       "<table border=1 width=65%>"+
                       "<tr><th align=center>Book Name</th>"+
                       "<th align=center>Book Author</th>"+
                       "<th align=center>Fetched from Vender</th>"+
                       "<th align=center>Mrp</th>"+
                       "<th align=center>Price</th>"+
                       "<th align=center>Category</th>"+
                       "<th align=center>Condition</th>"+
                       "<th align=center>Vevsa Comission</th></tr>";
        var bookCondition = ["Old" , "New"];             
        var bookCategory = ["College", "School", "Competition", "Novel"];
        var totMrp = 0;
        for(var i = 0; i < responseData.length; i++) {
         totMrp +=  responseData[i].mrp;
          html += ("<tr><td align=center>"+responseData[i].book_name+"</td>");
          html += ("<td align=center>"+responseData[i].book_author+"</td>");
          html += ("<td align=center>"+responseData[i].vendor_name+"</td>");
          html += ("<td align=center> Rs."+responseData[i].mrp+"</td>");
          html += ("<td align=center> Rs."+responseData[i].price+"</td>");
          html += ("<td align=center> "+bookCategory[responseData[i].book_category]+"</td>");
          html += ("<td align=center> "+bookCondition[responseData[i].vcondition]+"</td>");

          if((responseData[i].book_category == 2 || responseData[i].book_category ==3) && responseData[i].vcondition == 1 ){
            html += ("<td align=center> Rs."+parseInt(responseData[i].mrp * .10)+"</td>");
          }
          else if(responseData[i].vcondition == 1 || (responseData[i].price/responseData[i].mrp) > .7){
            html += ("<td align=center> Rs."+parseInt(responseData[i].mrp * .05)+"</td>");
          }
          else
          html += ("<td align=center> Rs."+parseInt(responseData[i].mrp * .10)+"</td>");
          html += "</tr>";
        }
        var totalPrice = totPrice - parseInt(totMrp * .02);
        html += "<tr><td colspan=3 align=center><b>Urgent Delivery Charges</b></td><td align=center><b> Rs."+urgentDeliveryCharges+"</b></td>";
        html += "<tr><td colspan=3 align=center><b>Total Price</b></td><td align=center><b> Rs."+totalPrice+"</b></td>";
        html += "</table><br><br>";

        html += "These would be delivered to :<br><b>"+userName+",<br>"+deliveryAddress+"<br>"+userPhone+"</b>";
        html += "<br><br>Cheers,<br>Vevsa Support";
        messenger.sendEmailToUser(from, to, subject, text, html, function(mailErr, mailRes) {
          if(mailErr) {
            return res.send({
              "log": "There was some error in sending email to admins, request is confirmed though",
              "flag": constants.responseFlags.ACTION_FAILED
            });
          }
          return res.send({
            "log" : "Successfully confirmed delivery order",
            "Emails": config.get('emailRecipents.orderConfirmationEmail').split(','),
            "flag": constants.responseFlags.ACTION_COMPLETE
          });
        });
      });
    }
    else {
      return res.send({
        "log": "Successfully disapproved book request",
        "flag": constants.responseFlags.ACTION_COMPLETE
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
function updateBookRequest(handlerInfo, requestId, reqStatus, callback) {
  var sqlQuery = "UPDATE tb_book_requests "+
                 "SET approved_on = NOW(), status = ? "+
                 "WHERE req_id = ?";
  var tt = connection.query(sqlQuery, [reqStatus, requestId], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "updating book request", err, result, tt.sql);
      return callback(err, null);
    }
    callback(null, "Sucessfully updated request id");
  });
}

/**
 * Log the delivery details into the database
 * @param handlerInfo {OBJECT} Object for logging
 * @param requestId {INTEGER} request id
 * @param userId {INTEGER} user_id
 * @param deliveryAddress {STRING} address to be delivered
 * @param isUrgent {INTEGER} 0->No, 1->Yes
 * @param responseData {OBJECT} This is the same object returned from minimum response
 * @param callback {FUNCTION} callback function
 */
function deliverBooksToUser(handlerInfo, requestId, userId, deliveryAddress, isUrgent, responseData, callback) {
  var dateStr  = (isUrgent == 1 ? "CURDATE()" : "CURDATE()+ INTERVAL 1 DAY");
  var sqlQuery = "INSERT INTO tb_delivery (request_id, user_id, delivery_address, is_urgent_delivery, delivery_date) "+
                 "VALUES (?, ?, ?, ?, "+dateStr+") ";
  var tt = connection.query(sqlQuery, [requestId, userId, deliveryAddress, isUrgent], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "adding delivery", err, result, tt.sql);
      return callback(err, null);
    }
    var deliveryId = result.insertId;
    var asyncTasks = [];
    for(var i = 0; i < responseData.length; i++) {
      if((responseData[i].book_category == 2 || responseData[i].book_category ==3) && responseData[i].vcondition == 1 ){
        var vevsaComission = (responseData[i].mrp * .10);
      }
      else if(responseData[i].vcondition == 1 || (responseData[i].price/responseData[i].mrp) > .7)
      var vevsaComission = (responseData[i].mrp * .05);
      else
       var vevsaComission = (responseData[i].mrp * .10); 
      asyncTasks.push(logDeliveryDistribution.bind(null, handlerInfo, deliveryId, responseData[i].book_id, responseData[i].vendor_id, 
        responseData[i].price, responseData[i].mrp, vevsaComission));
    }
    async.parallel(asyncTasks, function(asyncErr, asyncRes) {
      if(asyncErr) {
        return callback(asyncErr, null);
      }
      callback(null, "successfully logged a delivery in database");
    });
  });
}

function logDeliveryDistribution(handlerInfo, deliveryId, book_id, vendor_id, price, mrp, vevsa_commission, callback) {
  var sqlQuery = "INSERT INTO tb_delivery_distribution (delivery_id, book_id, vendor_id, book_price, mrp, vevsa_commission) VALUES(?, ?, ?, ?, ?, ?)";
  var tt = connection.query(sqlQuery, [deliveryId, book_id, vendor_id, price, mrp, vevsa_commission], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "logging delivery distribution", err, result, tt.sql);
      return callback("There was some error in logging delivery distribution", null);
    }
    callback(null, "Successfully logged a distribution");
  });
}

/**
 * <b>API [POST] /books-auth/get_delivery_details</b><br>
 * API to fetch delivery details corresponding to a delivery id,<br>
 * Request body requires the following parameters
 *
 * @param delivery_id {INTEGER} delivery id
 * @param token {STRING} access token
 */
function getDeliveryDetailsById(req, res) {
  var handlerInfo     = {
    "apiModule" : "bookRequests",
    "apiHandler": "getDeliveryDetailsById"
  };
  var reqParams       = req.body;
  var delivery_id     = parseInt(reqParams.delivery_id);
  var deliveryObj     = {};
  getDeliveryDetailsHelper(handlerInfo, delivery_id, deliveryObj, function(delErr, deliveryData) {
    if(delErr) {
      return res.send({
        "log" : delErr,
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    return res.send({
      "log" : "Successfully fetched data for delivery object",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data": deliveryData
    });
  });
}

/**
 * Helper function to get delivery details for getDeliveryDetails API
 * @param deliveryId {INTEGER} delivery id
 * @param callback {FUNCTION} callback function
 */
function getDeliveryDetailsHelper(handlerInfo, deliveryId, deliveryObj, callback) {
  var sqlQuery = "SELECT delivery.delivery_id, delivery.delivery_address, delivery.is_urgent_delivery, "+
                 "delivery.delivery_date,  users.user_name, users.user_phone, users.user_id, delivery.logged_on  "+
                 "FROM tb_delivery as delivery "+
                 "JOIN tb_users as users ON delivery.user_id = users.user_id "+
                 "WHERE delivery.delivery_id = ?";
  var tt = connection.query(sqlQuery, [deliveryId], function(err, deliveryRes) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "getting delivery details by id", err, deliveryRes, tt.sql);
      return callback("There was some error in fetching data corresponding to this delivery id", null);
    }
    if(deliveryRes.length == 0) {
      return callback("No data found corresponding to this delivery id", null);
    }
    var deliveryData = {};
    deliveryData.delivery_id       = deliveryRes[0].delivery_id;
    deliveryData.user_id           = deliveryRes[0].user_id;
    deliveryData.user_name         = deliveryRes[0].user_name;
    deliveryData.user_phone        = deliveryRes[0].user_phone;
    deliveryData.delivery_address  = deliveryRes[0].delivery_address;
    deliveryData.is_urgent_delivery= deliveryRes[0].is_urgent_delivery;
    deliveryData.logged_on         = deliveryRes[0].logged_on;
    // getting delivery details :
    var sqlQuery = "SELECT distribution.vendor_id, vendors.vendor_name, vendors.vendor_phone, vendors.vendor_address, "+
      "distribution.book_price, distribution.mrp, distribution.vevsa_commission, "+
      "users.user_name, books.book_name, books.book_stream, books.type, books.book_category, books.book_semester, "+
      "books.is_ncert, books.book_stream, books.is_guide, books.competition_name, books.medium, books.book_author "+
      "FROM `tb_delivery_distribution` as distribution "+
      "JOIN tb_delivery as delivery ON delivery.delivery_id = distribution.delivery_id "+
      "JOIN tb_users as users ON users.user_id = delivery.user_id "+
      "JOIN tb_books as books ON books.book_id = distribution.book_id "+
      "JOIN tb_vendors as vendors ON vendors.vendor_id = distribution.vendor_id "+
      "WHERE distribution.delivery_id = ?";
    var jj = connection.query(sqlQuery, [deliveryId], function(deliveryDetailsErr, deliveryDetails) {
      if(deliveryDetailsErr) {
        logging.logDatabaseQuery(handlerInfo, "getting delivery details(vendors)", deliveryDetailsErr, deliveryDetails, jj.sql);
        return callback(deliveryDetailsErr, null);
      }
      deliveryData.books           = deliveryDetails;
      deliveryObj[deliveryId]      = deliveryData;
      callback(null, deliveryData);
    });
  });
}

function getPendingRequestArr(requestStatus, callback) {
  var sqlQuery = "SELECT request_id FROM tb_book_requests WHERE approval_status = ?";
  connection.query(sqlQuery, [requestStatus], function(err, result) {
    if(err) {
      return callback(err, null);
    }
    var reqIDArr = [];
    for(var i = 0; i < result.length; i++) {
      reqIDArr.push(result[i].request_id);
    }
    callback(null, reqIDArr);
  });
}

function getRequestDetailsById(handlerInfo, request_id, requestObj, callback) {
  var sqlQuery  = "SELECT requests.req_id, requests.generated_on, requests.status, users.user_id, users.user_name ,users.user_phone, "+
                  "users.user_address, books.*,  requests.approved_on, requests.type "+
                  "FROM tb_book_requests as requests "+
                  "JOIN tb_users as users ON users.user_id = requests.user_id "+
                  "JOIN tb_books as books ON books.book_req_id = requests.req_id "+
                  "WHERE requests.req_id = ? "+
                  " ORDER BY requests.req_id, requests.generated_on ";
  var tt = connection.query(sqlQuery, [request_id], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "Getting request details for user", err, null, tt.sql);
      return callback(err, null);
    }
    if(result.length == 0) {
      logging.error(handlerInfo, "No request found corresponding to request id - "+request_id);
      return callback(null, null);
      //return callback("No request found corresponding to this request id", null);
    }
    var curRequest = {};
    curRequest.req_id        = result[0].req_id;
    curRequest.generated_on  = result[0].generated_on;
    curRequest.user_id       = result[0].user_id;
    curRequest.user_name     = result[0].user_name;
    curRequest.user_phone    = result[0].user_phone;
    curRequest.approved_on   = result[0].approved_on;
    curRequest.type          = result[0].type;
    curRequest.status        = result[0].status;

    var books = [], i = 0;
    do {
      var curBook = {};
      curBook.book_id          = result[i].book_id;
      curBook.book_name        = result[i].book_name;
      curBook.book_photograph  = result[i].book_photograph;
      curBook.book_stream      = result[i].book_stream;
      curBook.book_semester    = result[i].book_semester;
      curBook.book_author      = result[i].book_author;
      curBook.vcondition        = result[i].vcondition;
      curBook.medium           = result[i].medium;
      curBook.book_category    = result[i].book_category;
      curBook.publisher        = result[i].publisher;
      curBook.vclass            = result[i].vclass;
      curBook.competition_name = result[i].competition_name;
      curBook.is_ncert         = result[i].is_ncert;
      curBook.is_guide         = result[i].is_guide;

      books.push(curBook);
      i++;
    } while(i < result.length && result[i].req_id == result[i-1].req_id);
    curRequest.books         = books;
    requestObj[request_id] = curRequest;
    callback(null, curRequest);
  });
}

function getRequestDetailsWrapper(handlerInfo, requestArr, callback) {
  var asyncTasks = [];
  var requestObj = {};
  for(var i = 0; i < requestArr.length; i++) {
    asyncTasks.push(getRequestDetailsById.bind(null, handlerInfo, requestArr[i], requestObj));
  }
  async.parallel(asyncTasks, function(err, result) {
    if(err) {
      console.log(err);
      return callback("There was some error in getting request details", null);
    }
    var requestArray = Object.keys(requestObj).map(function(key) { return requestObj[key] });
    callback(null, requestArray);
  });
}

/**
 * <b>API [POST] /books-auth/get_deliveries</b><br>
 * API to get book deliveries in panel
 * @param req - request body requires token and date object
 * @param res - response body would provide an array of deliveries
 * @return @type {{log: string, flag: number, data: array}}
 */
function getDeliveries(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "getDeliveries"
  };
  var reqParams = req.body;
  var dateInterval = reqParams.date_interval;
  var isUrgent = reqParams.is_urgent;
  var isDelivered = reqParams.is_delivered;
  var queryFilter = "";
  if(dateInterval != undefined) {
    queryFilter += " AND delivery.logged_on BETWEEN DATE('"+dateInterval.start_date+"') AND DATE('"+dateInterval.end_date+"')";
  }
  console.log("isUrgent : "+isUrgent+", isDelivered : "+isDelivered);
  if(isUrgent != undefined) {
    queryFilter += " AND delivery.is_urgent_delivery = "+isUrgent;
  }
  if(isDelivered != undefined) {
    queryFilter += " AND delivery.is_delivered = "+isDelivered;
  }
  var sqlQuery = "SELECT delivery.*, users.user_name, users.user_phone, users.user_address, users.user_city " +
      "FROM `tb_delivery` as delivery " +
      "LEFT JOIN tb_users as users ON users.user_id = delivery.user_id " +
      "WHERE 1=1 " +queryFilter+
      " ORDER BY delivery.`logged_on` DESC";
  var tt = connection.query(sqlQuery, [], function(err, result) {
    logging.logDatabaseQuery(handlerInfo, "getting deliveries", err, null, tt.sql);
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    res.send({
      "log": "successfully fetched data from database",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data": result
    });
  });
}

function updateDeliveryStatus(req, res) {
  var handlerInfo = {
    "apiModule": "bookRequests",
    "apiHandler": "updateDeliveryStatus"
  };
  var reqParams = req.body;
  var deliveryId= reqParams.delivery_id;
  var status    = reqParams.status;
  updateDeliveryStatusHelper(handlerInfo, deliveryId, status, function(err, result) {
    if(err) {
      return res.send({
        "log": err,
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      "log": "Action complete",
      "flag": constants.responseFlags.ACTION_COMPLETE
    })
  });
}

function updateDeliveryStatusHelper(handlerInfo, deliveryId, status, callback){
  var sqlQuery = "UPDATE tb_delivery SET is_delivered = ? WHERE delivery_id = ?";
  var tt = connection.query(sqlQuery, [status, deliveryId], function(err, result) {
    if(err) {
      logging.error(handlerInfo, "updating book request", err, null, tt.sql);
      return callback("There was some error in updating delivery", null);
    }
    callback(null, result);
  });
}

