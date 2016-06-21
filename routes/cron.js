/**
 * @module Cron
 *
 * This module is responsible for timely check of pending book requests 
 * which is done via crontabs on the production server. Make sure cron-
 * tabs are added in the /etc/cron directory.
 *
 */

///////////////////////////////////////////////////////////////////////
// MODULE DEPENDENCIES
//////////////////////////////////////////////////////////////////////
var async        = require('async');
var bookRequests = require('./book_requests');

exports.processPendingBookRequests        = processPendingBookRequests;

function processPendingBookRequests(req, res) {
    getPendingRequestArr(constants.bookRequestStatus.PENDING, function(err, result) {
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
        });
    });
}