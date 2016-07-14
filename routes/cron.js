/**
 * @module Cron
 *
 */

///////////////////////////////////////////////////////////////////////
// MODULE DEPENDENCIES
//////////////////////////////////////////////////////////////////////
var async        = require('async');
var bookRequests = require('./book_requests');
var constants    = require('./constants');
var utils        = require('./commonfunctions');

exports.processPendingBookRequests        = processPendingBookRequests;

function processPendingBookRequests(req, res) {
    var handlerInfo = {
        "apiModule": "cron",
        "apiHandler": "processPendingBookRequests"
    };
    bookRequests.getPendingRequestArr(constants.bookRequestStatus.PENDING, function(err, result) {
        if(err) {
            return res.send(constants.databaseErrorResponse);
        }
        var pendingRequests = result;
        var asyncTasks = [];
        var minimumResponse = [];
        for(var i = 0; i < pendingRequests.length; i++) {
            asyncTasks.push(bookRequests.getMinimumBookResponseWrapper.bind(null, pendingRequests[i], minimumResponse));
        }
        async.series(asyncTasks, function(asyncErr, asyncRes) {
            if(asyncErr) {
                // No need to handle errors in this case:
                console.log(asyncErr);
            }
            // Send minimum responses as push notification to users
            var sendNotifications = [];
            for(var i = 0; i < minimumResponse.length; i++) {
                sendNotifications.push(utils.sendNotification(minimumResponse[i][0].user_id, minimumResponse[i], null, null));
            }
            async.parallel(sendNotifications, function(pushErr, pushRes) {
                if(pushErr) {
                    logging.error(handlerInfo, "sending minimum response to device", pushErr, null);
                    return res.send({
                        "log": "There was some error in sending push",
                        "flag": constants.responseFlags.ACTION_FAILED
                    });
                }
                res.send({
                    "log": "action complete",
                    "flag": constants.responseFlags.ACTION_COMPLETE
                });
            });
        });
    });
}
