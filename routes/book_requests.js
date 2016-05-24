/*
 * Module dependencies
 */
var utils     = require('./commonfunctions');
var constants = require('./constants');
var async     = require('async');

exports.raiseBooksRequest         = raiseBooksRequest;
exports.getBookRequests           = getBookRequests;
exports.putBookRequestResponse    = putBookRequestResponse;
exports.getMinimumPriceResponse   = getMinimumPriceResponse;

function raiseBooksRequest(req, res) {
  var reqParams     = req.body;
  var user_id       = reqParams.user_id;
  var books         = reqParams.books;
  
  var insertReq  = "INSERT INTO tb_book_requests (user_id) VALUES (?)";
  connection.query(insertReq, [user_id], function(insErr, insRes) {
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
      asyncTasks.push(insertNewBook.bind(null, request_id, books[i].name, books[i].stream, books[i].semester, books[i].type));
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

function insertNewBook(request_id, name, stream, semester, type, callback) {
  var insertQuery = "INSERT INTO tb_books (book_req_id, book_name, book_stream, book_semester, type) VALUES(?, ?, ?, ?, ?)";
  connection.query(insertQuery, [request_id, name, stream, semester, type], function(err, result) {
    if(err) {
      console.log(err);
      return callback(err, null);
    }
    callback(null, "Successfully logged book request");
  });
}

function getBookRequests(req, res) {
  var reqParams   = req.body;
  var start_from  = parseInt(reqParams.start_from);
  var page_size   = parseInt(reqParams.page_size);
  var bookStatus  = reqParams.req_status;


  if(utils.checkBlank([start_from, page_size, bookStatus])) {
    return res.send({
      "log": "Some parameters are missing/invalid",
      "flag": constants.responseFlags.ACTION_FAILED
    });
  }

  var sqlQuery  = "SELECT requests.req_id, requests.generated_on, users.user_id, users.user_name, books.* "+
                  "FROM tb_book_requests as requests "+
                  "JOIN tb_users as users ON users.user_id = requests.user_id "+
                  "JOIN tb_books as books ON books.book_req_id = requests.req_id "+
                  "WHERE requests.status = ? "+
                  " ORDER BY requests.req_id, requests.generated_on "+
                  "LIMIT ?, ?";
  var tt = connection.query(sqlQuery, [bookStatus, start_from, page_size], function(err, result) {
    if(err) {
      console.log(err);
      return res.send({
        "log": "Server execution error",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    var resData = [];

    for(var i = 0; i < result.length; ) {
      var curRequest = {};
      curRequest.req_id        = result[i].req_id;
      curRequest.generated_on  = result[i].generated_on;
      curRequest.user_id       = result[i].user_id;
      curRequest.user_name     = result[i].user_name;

      var books = [];
      do {
        var curBook = {};
        curBook.book_id        = result[i].book_id;
        curBook.book_name      = result[i].book_name;
        curBook.book_photograph= result[i].book_photograph;
        curBook.book_stream    = result[i].book_stream;
        curBook.type           = result[i].type;
        books.push(curBook);
        i++;
      } while(i < result.length && result[i].req_id == result[i-1].req_id);
      curRequest.books         = books;
      resData.push(curRequest);
    }
    return res.send({
      "log": "Successfully fetched pending book requests",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "data":resData
    });
  });
}

function putBookRequestResponse(req, res) {
  var reqParams      = req.body;
  var vendorId       = reqParams.vendor_id;
  var requestId      = reqParams.req_id;
  var books          = reqParams.books;
  var overallPrice   = reqParams.overall_price;

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
    var reqQuery = "INSERT INTO tb_books_response (vendor_id, request_id, overall_price) VALUES(?, ?, ?) ";
    connection.query(reqQuery, [vendorId, requestId, overallPrice], function(reqErr, insRes) {
      if(reqErr) {
        res.send(constants.databaseErrorResponse);
      }
      var responseId = insRes.insertId;
      var asyncTasks = [];
      for(var i = 0; i < books.length; i++) {
        asyncTasks.push(insertBookResponse.bind(null, responseId, vendorId, books[i].book_id, books[i].price));
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

function insertBookResponse(response_id, vendor_id, book_id, book_price, callback) {
  var sqlQuery = "INSERT INTO tb_books_overall_distribution (response_id, vendor_id, book_id, price) VALUES (?, ?, ?, ?)";
  connection.query(sqlQuery, [response_id, vendor_id, book_id, book_price], function(err, result) {
    if(err) {
      return callback("There was some error in logging vendor response", null);
    }
    callback(null, "successfully logged request response");
  });
}

function getMinimumBookResponse(request_id, callback) {
  var minQuery = "SELECT response.*, vendors.vendor_name, vendors.vendor_phone, vendors.vendor_address, vendors.vendor_address "+ 
                 "FROM tb_books_response as response "+
                 "JOIN tb_vendors as vendors ON vendors.vendor_id = response.vendor_id "+
                 "WHERE request_id = ? "+
                 "ORDER BY overall_price LIMIT 1";
  var tt = connection.query(minQuery, [request_id], function(minErr, minResponse) {
    if(minErr) {
      return callback("There was some error in getting minimum request", null);
    }
    if(minResponse.length == 0) {
      return callback(null, null);
    }
    callback(null, minResponse[0]);
  });
}

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

function getMinimumPriceResponse(req, res) {
  var request_id    = req.body.request_id;
  getMinimumBookResponse(request_id, function(minErr, minResponse) {
    if(minErr) {
      return res.send({
        "log" : minErr,
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    if(minResponse == null) {
      return res.send({
        "log" : "No responses could be found for this request id",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    var responseData            = {};
    responseData.response_id    = minResponse.response_id;
    responseData.vendor_name    = minResponse.vendor_name;
    responseData.vendor_address = minResponse.vendor_address;
    responseData.vendor_phone   = minResponse.vendor_phone;
    responseData.logged_on      = minResponse.logged_on;

    getVendorResponseDetails(responseData.response_id, function(resErr, vendorResponse) {
      if(resErr) {
        return res.send({
          "log" : resErr,
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      responseData.books = vendorResponse;
      res.send({
        "log" :"Successfully fetched response",
        "flag": constants.responseFlags.ACTION_COMPLETE,
        "data": responseData
      });
    });
  });
}

    
