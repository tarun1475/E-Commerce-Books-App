/**
 * @module messenger
 */
/////////////////////////////////////////////////////////////////////
// Module dependencies
/////////////////////////////////////////////////////////////////////
var request     = require('request');
var nodemailer  = require('nodemailer');
var smtpTransport   = require('nodemailer-smtp-transport');

var transport = nodemailer.createTransport(smtpTransport({
  host: 'smtp.gmail.com',
  secureConnection: false,
  port: 587,
  auth: {
    user: "helpvevsa@gmail.com",
    pass: "9779766030"
  }
}));
      
exports.sendMessageToUser       = sendMessageToUser;
exports.sendEmailToUser         = sendEmailToUser;

function sendMessageToUser(phone_no, message, callback) {

    return callback(null, "Test");
}

function sendEmailToUser(from, to, subject, text, htmlText, callback) {
  var mailOptions = {
    "from": from,
    "to": to,
    "subject": subject,
    "text": text,
    "html": htmlText
  };
  transport.sendMail(mailOptions, function(err, info) {
    if(err) {
      console.log(err);
      return callback(err, null);
    }
    console.log("Email sent "+ info.response);
    callback(null, info);
  });
}
