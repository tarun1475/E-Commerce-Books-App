/**
 * @module Private Key Recovery Users
 */


/*
 * Module dependencies
 */
var request        = require('request');
var crypto         = require('crypto');
var async          = require('async');
var utils          = require('./commonfunctions');
var constants      = require('./constants');
var logging        = require('./logging');
var messenger      = require('./messenger');



exports.registerUser                    = registerUser;
exports.userTrustData                   = userTrustData;
exports.searchUser                      = searchUser;
exports.sendOtpViaEmail                 = sendOtpViaEmail;
exports.verifyOtpViaEmail               = verifyOtpViaEmail;



function registerUser(req, res) {
  var handlerInfo   = {
    "apiModule": "registerUser",
    "apiHandler":"registerUser"
  };
  var publicKey        = req.body.user_public_key;
  var privateKeyHash   = req.body.user_private_key_hash;

  var sqlQuery = "INSERT INTO tb_users (user_public_key, user_private_key_hash, registered_on) VALUES(?, ?, NOW())";
  var tt = connection.query(sqlQuery, [publicKey,privateKeyHash], function(err, result) {
    if(err) {
      return res.send({
        "log" : "Internal server error",
        "flag": constants.responseFlags.ACTION_FAILED,
        "Error": err
      });
    }

    res.send({
      "log" : "User Registered successfully",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "result": result
    });
  });

}

function userTrustData(req, res) {
  var handlerInfo   = {
    "apiModule": "userTrustData",
    "apiHandler":"userTrustData"
  };



  /**

  var trustData = [
      {
        "user_id":"id",
        "encrypted_key_data":"data"
      },
      {
        "user_id":"id",
        "encrypted_key_data":"data"
      },
      {
        "user_id":"id",
        "encrypted_key_data":"data"
      }
  ];
  **/

  var trustData   = [];
  trustData = req.body.trust_data;



  for(i = 0 ; i < trustData.length ; i++){

  var Query = "INSERT INTO tb_trust (user_public_key, trust_data, created_on) VALUES(?, ?, NOW())";
  var tt = connection.query(Query, [trustData[i].user_public_key, trustData[i].encrypted_key_data], function(err, result) {
    if(err) {
      return res.send({
        "log" : "Internal server error",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
   

  });
  
}

 res.send({
      "log" : "Sent successfully",
      "flag": constants.responseFlags.ACTION_COMPLETE
    });


}



function searchUser(req, res) {
  var handlerInfo   = {
    "apiModule": "searchUser",
    "apiHandler":"searchUser"
  };
  var publicKey        = req.query.user_public_key;

  var sqlQuery = "SELECT * from tb_users WHERE user_public_key = ?";
  var tt = connection.query(sqlQuery, [publicKey], function(err, result) {
    if(err) {
      return res.send({
        "log" : "Internal server error",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      "log" : "fetched successfully",
      "data": result[0],
      "flag": constants.responseFlags.ACTION_COMPLETE
    });
  });

}


function sendOtpViaEmail(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    "apiModule" : "commonfunctions",
    "apiHandler": "sendOtpViaEmail"
  };

  var email     = reqParams.user_email;
  var getDuplicate = "SELECT * FROM tb_users WHERE email = ?";
  var tt = connection.query(getDuplicate, [email], function(dupErr, dupRes) {
    if(dupRes.length > 0) {
      return res.send({
        "log": "A user already exists with this email",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    var otp       = Math.floor((Math.random()*1000000)+1);
    var from      = 'tarun@vevsatechnologies.com';
    var to        = [email];
    var text      = "";
    var subject   = 'Email  Verification';
    var html      = 'Hello,<br><br>'+
                    'In order to complete your recovery process, you must fill the following<br>'+
                    'code on your Verification screen: '+otp+'<br><br>'+
                    'Thank you for verifying youself.';
    messenger.sendEmailToUser(from, to, subject, text, html, function(mailErr, mailRes) {
      if(mailErr) {
        return res.send({
          "log": "There was some error in sending email",
          "flag": constants.responseFlags.ACTION_FAILED
        });
      }
      logOtpIntoDb(handlerInfo, otp, email, function(logErr, logRes) {
        if(logErr) {
          return res.send({
            "log": "There was some error in generating otp",
            "flag": constants.responseFlags.ACTION_FAILED
          });
        }
        var sessionId = logRes.insertId;

          if(logErr) {
            return res.send({
              "log": "Error in creating user",
              "flag": constants.responseFlags.ACTION_FAILED
            });
          }
          res.send({
            "log": "Otp sent successfully",
            "session_id": sessionId,
            "flag": constants.responseFlags.ACTION_COMPLETE
          });
      });
    });
  });
}


function logOtpIntoDb(handlerInfo, oneTimePwd, email, callback) {
  var sqlQuery = "INSERT INTO tb_otp (one_time_password, email,logged_on) VALUES( ?, ? , NOW())";
  var tt = connection.query(sqlQuery, [oneTimePwd, email], function(err, result) {
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}



function verifyEmailOtp(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    "apiModule": "commonfunctions",
    "apiHandler": "verifyEmailOtp"
  };

  var otp = reqParams.otp;
  var session_id = reqParams.session_id;
  verifyOtpInDb(handlerInfo, otp, session_id, function(err, result) {
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }
    if(result.length == 0) {
      return res.send({
        "log" : "Verification failed",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }

    res.send({
          "log": "User verified",
          "flag": constants.responseFlags.ACTION_COMPLETE
        });s
    
  });
}

function verifyOtpInDb(handlerInfo, otp, session_id, callback) {
  var sqlQuery = "SELECT * FROM tb_otp WHERE one_time_password = ? AND session_id = ?";
  var tt = connection.query(sqlQuery, [otp, session_id], function(err, result) {
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}

