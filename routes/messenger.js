/**
 * @module messenger
 */
/////////////////////////////////////////////////////////////////////
// Module dependencies
/////////////////////////////////////////////////////////////////////
var sys        = require('util');
var fs         = require('fs');
var exec       = require('child_process').exec, child;
var logging    = require('./logging');

exports.sendEmailToUser = sendEmailToUser;

function sendEmailToUser(from, to, subject, text, htmlText, callback) {
  var handlerInfo = {
    "apiModule": "messenger",
    "apiHandler": "sendEmailToUser"
  };
  var mailOptions = {
    "from": from,
    "to": to,
    "subject": subject,
    "text": text,
    "html": htmlText
  };
  sendMailToUsers(handlerInfo, mailOptions, function(err, info) {
    if(err) {
      logging.error(handlerInfo, err);
      return callback(err, null);
    }
    else {
      logging.trace(handlerInfo, "Email sent "+ info);
    }
    callback(null, info);
  });
}

function sendMailToUsers(handlerInfo, mailOptions, callback) {
  var commandStr = "( echo 'From: "+mailOptions.from+"'\n";
  commandStr    += "echo 'To: "+mailOptions.to.join(' ')+"'\n";
  commandStr    += "echo 'Subject: "+mailOptions.subject+"'\n";
  commandStr    += "echo 'Content-Type: text/html'\n";
  commandStr    += "echo 'MIME-Version: 1.0'\n";
  commandStr    += "echo ''\n";
  commandStr    += "echo '"+mailOptions.html+"'\n";
  commandStr    += ") | sendmail -t";
  console.log("executed "+commandStr);
  child = exec(commandStr, function(error, stdout, stderr) {
    logging.trace(handlerInfo, stdout);
    if(error !== null) {
      logging.error(handlerInfo, error);
    }
    return callback(null, null);
  });
}
