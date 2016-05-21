/*
 * Module dependencies
 */
var utils     = require('./commonfunctions');
var constants = require('./constants');
var async     = require('async');

exports.raiseBooksRequest      = raiseBooksRequest;
exports.getBookRequests        = getBookRequests;

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
