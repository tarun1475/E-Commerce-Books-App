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
      "flag": constants.responseFlags.ACTION_COMPLETE
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
  var resultData = [];

  var Query = "SELECT * from tb_users_personal_data WHERE user_id = ?";
  var tt = connection.query(Query, [trustData[i].user_id], function(err, result) {
    if(err) {
      return res.send({
        "log" : "Internal server error",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
   
  // if(result.length > 0)
  resultData.push(result[0].user_trust_data);

  });

  resultData.push(trustData[i].encrypted_key_data);
  var sqlQuery = "update tb_users_personal_data SET user_trust_data = ? WHERE user_id = ?";
  var tt = connection.query(sqlQuery, [resultData,trustData[i].user_id], function(Err, Result) {
    

    if(Err) {
      return res.send({
        "log" : "Internal server error",
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }

  });
  
}

 res.send({
      "log" : "User Registered successfully",
      "flag": constants.responseFlags.ACTION_COMPLETE
    });


}
