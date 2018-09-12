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
const nodemailer   = require('nodemailer');
var sendgrid       = require('sendgrid')(process.env.SENDGRID_API_KEY);




exports.registerUser                    = registerUser;
exports.userTrustData                   = userTrustData;
exports.searchUser                      = searchUser;
exports.sendOtpViaEmail                 = sendOtpViaEmail;
exports.sendRecoveryOtpViaEmail         = sendRecoveryOtpViaEmail;
exports.verifyRecoveryOtpViaEmail       = verifyRecoveryOtpViaEmail;
exports.verifyOtpViaEmail               = verifyOtpViaEmail;
exports.loginUser                       = loginUser;
exports.sendRecoveryTrustData           = sendRecoveryTrustData;



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
    sendgrid.send({

        to: email,
        from: 'tarun@vevsatechnologies.com',
        subject:  'Email  Verification',
        text:'',
        html: 'Hello,<br><br>'+
                    'In order to complete your recovery process, you must fill the following<br>'+
                    'code on your Verification screen: '+otp+'<br><br>'+
                    'Thank you for verifying youself.'
      }, 

      function(err, json) {
        if (err) { return console.error(err); }


        logOtpIntoDb(handlerInfo, otp, email, function(logErr, logRes) {
        if(logErr) {
          return res.send({
            "log": "There was some error in generating otp",
            "flag": constants.responseFlags.ACTION_FAILED,
            "err":logErr
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
        console.log(json);
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



function verifyOtpViaEmail(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    "apiModule": "commonfunctions",
    "apiHandler": "verifyEmailOtp"
  };

  var otp = reqParams.otp;
  var session_id = reqParams.session_id;
  var email = reqParams.email;
  var publicKey = reqParams.publicKey;
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

    updateUserDetailsFromEmail(handlerInfo, email,publicKey ,function(userErr,userRes){
      if(userErr)   return res.send(constants.databaseErrorResponse);



       res.send({
          "log": "User verified",
          "flag": constants.responseFlags.ACTION_COMPLETE,
          "userDetails":userRes
        });

    });

   
    
  });
}

function updateUserDetailsFromEmail(handlerInfo, email,user_public_key, callback) {
  var status = 1;
   var sqlQuery = "update tb_users SET email = ? , email_status = ? WHERE user_public_key = ?";
  var tt = connection.query(sqlQuery, [email,status , user_public_key], function(err, result) {
    if(err) {
      return res.send({
        "log" : "Internal server error",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }

     callback(null, result);

  });
}

function fetchUserDetailsFromEmail(handlerInfo, email, callback) {
  var sqlQuery = "SELECT * FROM tb_users WHERE email = ?";
  var tt = connection.query(sqlQuery, [email], function(err, result) {
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
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


function loginUser(req, res) {
  var handlerInfo   = {
    "apiModule": "loginUser",
    "apiHandler":"loginUser"
  };
  var publicKey        = req.body.publicKey;
  var privateKeyHash   = req.body.privateKeyHash;

  var sqlQuery = "SELECT * from tb_users WHERE user_public_key = ? AND user_private_key_hash = ?";
  var tt = connection.query(sqlQuery, [publicKey,privateKeyHash], function(err, result) {
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

function sendRecoveryOtpViaEmail(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    "apiModule" : "commonfunctions",
    "apiHandler": "sendOtpViaEmail"
  };

  var email     = reqParams.user_email;
  var getDuplicate = "SELECT * FROM tb_users WHERE email = ?";
  var tt = connection.query(getDuplicate, [email], function(dupErr, dupRes) {
    if(dupRes.length == 0) {
      return res.send({
        "log": "A user does not exists with this email",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }

    var otp       = Math.floor((Math.random()*1000000)+1);
    sendgrid.send({

        to: email,
        from: 'tarun@vevsatechnologies.com',
        subject:  'Email  Verification',
        text:'',
        html: 'Hello,<br><br>'+
                    'In order to complete your recovery process, you must fill the following<br>'+
                    'code on your Verification screen: '+otp+'<br><br>'+
                    'Thank you for verifying youself.'
      }, 

      function(err, json) {
        if (err) { return console.error(err); }


        logOtpIntoDb(handlerInfo, otp, email, function(logErr, logRes) {
        if(logErr) {
          return res.send({
            "log": "There was some error in generating otp",
            "flag": constants.responseFlags.ACTION_FAILED,
            "err":logErr
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
        console.log(json);
      });
  });
}


function verifyRecoveryOtpViaEmail(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    "apiModule": "commonfunctions",
    "apiHandler": "verifyEmailOtp"
  };

  var otp = reqParams.otp;
  var session_id = reqParams.session_id;
  var email = reqParams.email;
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

    fetchUserDetailsFromEmail(handlerInfo, email,function(userErr,userRes){
      if(userErr)   return res.send(constants.databaseErrorResponse);



       res.send({
          "log": "User verified",
          "flag": constants.responseFlags.ACTION_COMPLETE,
          "userDetails":userRes[0]
        });

    });

   
    
  });
}


function sendRecoveryTrustData(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    "apiModule": "commonfunctions",
    "apiHandler": "verifyEmailOtp"
  };

  var publicKey = reqParams.publicKey;
  var newPublicKey = reqParams.newPublicKey;
  var trustData = reqParams.trustData;


  logRequestIntoDb(handlerInfo, publicKey, newPublicKey, function(err, result) {
    if(err) {
      return res.send(constants.databaseErrorResponse);
    }

    var request_id = result.insertId;



    for(i = 0 , i < trustData.length ; i++){

      logRequestDetails(handlerInfo, request_id ,trustData[i].user_public_key ,function(userErr,userRes){
      if(userErr)   return res.send(constants.databaseErrorResponse);

    });


    }


       res.send({
          "log": "User verified",
          "flag": constants.responseFlags.ACTION_COMPLETE
        });
    
  });
}


function logRequestIntoDb(handlerInfo, publicKey, newPublicKey, callback) {
 var sqlQuery = "INSERT INTO tb_recovery_request (from_public_key,new_public_key,logged_on) VALUES( ?, ? , NOW())";
  var tt = connection.query(sqlQuery, [publicKey,newPublicKey], function(err, result) {
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}


function logRequestDetails(handlerInfo, request_id, publicKey, callback) {
 var sqlQuery = "INSERT INTO tb_recovery_request (request_id,user_public_key,logged_on) VALUES( ?, ? , NOW())";
  var tt = connection.query(sqlQuery, [request_id,publicKey], function(err, result) {
    if(err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}





