/**
 * @module uploads
 */
// Created by rohankumar on 21/07/16.

var AWS                     = require('aws-sdk');
var async                   = require('async');
var fs                      = require('fs');
var constants               = require('./constants');
var utils                   = require('./commonfunctions');
var logging                 = require('./logging');
var multer                  = require('multer');

AWS.config.update({
  accessKeyId: constants.credentialsS3.accessKeyId,
  secretAccessKey: constants.credentialsS3.secretAccessKey
});

var s3                      = new AWS.S3();
exports.uploadFileToS3      = uploadFileToS3;

/**
 * <b> API [POST] /books-auth/s3/upload </b> <br>
 * This API would upload the specified file to s3 and would return a path to that file.<br>
 * The client needs to send file in form data
 * @param req
 * @param res
 * @returns {*}
 */
function uploadFileToS3(req, res) {
  var handlerInfo = {
    "apiModule": "uploads",
    "apiHandler": "uploadFileToS3"
  };
  var reqParams = req.body;
  var filePath  = req.file.path;
  var fileName  = filePath.split('/');
  fileName  = fileName[fileName.length -1];
  var source    = reqParams.user_id || "NA";
  var remoteFilePath = {};
  console.log("local filePath : "+filePath, "fileName : "+fileName);
  remoteFilePath.name = "";
  if(utils.checkBlank([filePath])) {
    return res.send({
      "log": "Invalid file name provided",
      "flag": constants.responseFlags.ACTION_FAILED
    });
  }
  var asyncTasks = [];
  console.log("LAUNCH ASYNC: ");
  asyncTasks.push(uploadFileToS3Helper.bind(null, handlerInfo, filePath, fileName, remoteFilePath));
  asyncTasks.push(logUploadIntoDb.bind(null, handlerInfo, source, fileName, remoteFilePath));
  asyncTasks.push(unlinkUploadedFile.bind(null, handlerInfo, filePath));
  async.series(asyncTasks, function(err, result) {
    if(err) {
      return res.send({
        "log": err,
        "flag": constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      "log": "Successfully uploaded file to s3",
      "flag": constants.responseFlags.ACTION_COMPLETE,
      "file_path": remoteFilePath.name
    });
  });
}


/**
 * Helper function to upload files to s3
 * @param handlerInfo {OBJECT} handler info for that api
 * @param filePath {STRING} path of file on server
 * @param fileName {STRING} name of file
 * @param remoteFilePath {OBJECT} the s3 url path would be appended in this object's name key
 * @param callback {FUNCTION} a callback function
 */
function uploadFileToS3Helper(handlerInfo, filePath, fileName, remoteFilePath, callback) {
  console.log("uploadFileToS3Helper()");
  var fileStream = fs.createReadStream(filePath);
  var bucketName = 'vevsabooks';
  var folderName = 'bookImages/';
  var remoteFileName = (folderName + fileName);
  var params = {Bucket: bucketName, Key: remoteFileName, Body: fileStream};
  s3.putObject(params, function(err, data) {
    if(err) {
      logging.error(handlerInfo, 'Error in uploading to S3', err);
      return callback(err, null);
    }
    var docPath = 'http://s3-ap-southeast-1.amazonaws.com/'+ bucketName + '/'+ remoteFileName;
    logging.trace(handlerInfo, 'Successfully uploaded file', docPath);
    remoteFilePath.name = docPath;
    callback(null, docPath);
  });
}

/**
 * function to log uploads in db
 * @param handlerInfo {OBJECT} handler info for that api
 * @param uploadedBy {INTEGER} It is the user_id who uploaded the picture
 * @param actualFileName {STRING} the file name with which the file was uploaded
 * @param fileName {STRING} the file name on s3
 * @param callback {FUNCTION} callback function
 */
function logUploadIntoDb(handlerInfo, uploadedBy, actualFileName, fileName, callback) {
  console.log("logUploadIntoDb()");
  var logFileQuery = "INSERT INTO tb_file_upload_logs(uploaded_by, uploaded_at, actual_filename, file_path) VALUES(?, NOW(), ?, ?)";
  var fileLogQuery = connection.query(logFileQuery, [uploadedBy, actualFileName, fileName.name], function(err, result) {
    if(err) {
      logging.logDatabaseQuery(handlerInfo, "logging uploaded file into db", err, result, fileLogQuery.sql);
      return callback("There was some error in logging file", null);
    }
    callback(null, "operation successful");
  });
}

function unlinkUploadedFile(handlerInfo, localFilePath, callback) {
  console.log("unlinkUploadedFile()");
  fs.exists(localFilePath, function(exists) {
    if(exists) {
      logging.trace(handlerInfo, 'File Exists. Deleting now...');
      fs.unlinkSync(localFilePath);
    }
    else {
      logging.error(handlerInfo, 'File not found, so not deleting.');
    }
    callback(null, null);
  });
}
