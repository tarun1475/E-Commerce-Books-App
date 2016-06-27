/**
 * @module messenger
 */
/////////////////////////////////////////////////////////////////////
// Module dependencies
/////////////////////////////////////////////////////////////////////
var request = require('request');

exports.sendMessageToUser       = sendMessageToUser;


function sendMessageToUser(phone_no, message, callback) {
    return callback(null, "Test");
}
