/*
 * Module dependencies.
 */

process.env.NODE_CONFIG_DIR = __dirname + '/config/';
config          = require('config');
var express     = require('express');
var http        = require('http');
var https       = require('https');
var bodyParser  = require('body-parser');
var fs          = require('fs');
var logger      = require('morgan');
var error       = require('./routes/error');
var users       = require('./routes/users');
var vendors     = require('./routes/vendors');
var requests    = require('./routes/book_requests');
var utils       = require('./routes/commonfunctions');
var cron        = require('./routes/cron');
var analytics   = require('./routes/analytics');
var app         = express();

connection      = undefined;
require('./routes/mysqlLib');

var options = {
  key : fs.readFileSync(__dirname + '/certs/vevsa.com.key.pem'),
  cert: fs.readFileSync(__dirname + '/certs/vevsa.com.crt.pem')
};

// all environments
app.set('port', process.env.PORT || config.get('port') || 4013);
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use('/books-auth/documentation', express.static(__dirname+'/docs'));

/////////////////////////////////////////////////////////////
// APIs for HearBeat
/////////////////////////////////////////////////////////////
// API to check if connection is alive or not
app.get('/heartbeat', function(req, res, next) {
  connection.query(
    'SELECT 1 FROM DUAL WHERE 1 = 1', function(err, result) {
    if(err) {
      console.log(err);
      return res.status(500).send('Internal server Error!');
    }
    res.send('Vevsa.com - You save we save!');
  });
});


app.get('/', function(req, res) {
  res.send('Vevsa.com - You save we save!');
});

/**
 * Users APIs
 */
app.post('/books-auth/create_user'             , utils.logRequest
   , users.createNewAppUser
   , error);

app.post('/books-auth/create_vendor'           , utils.logRequest
   , vendors.createNewVendor
   , error);

app.get('/books-auth/get_user_requests'        , utils.verifyClientToken
   , users.getRecentRequestsByUserId
   , error);

app.get('/books-auth/send_otp'                 , utils.logRequest
   , utils.sendOTP
   , error);

app.get('/books-auth/verify_otp'               , utils.logRequest
   , utils.verifyOTP
   , error);

app.get('/books-auth/get_vendor_sales'         , utils.logRequest
  , utils.verifyClientToken
  , vendors.getVendorSales
  , error);

app.post('/books-auth/login'                   , utils.logRequest
  , utils.loginUser
  , error);

/**
 * APIs related to book requests
 */
app.post('/req_book_auth/raise_request'        , utils.logRequest
   , utils.verifyClientToken
   , requests.raiseBooksRequest
   , error);

app.post('/req_book_auth/get_pending_requests'  , utils.logRequest
   , utils.verifyClientToken
   , requests.getBookRequests
   , error);

app.post('/req_book_auth/put_response'          , utils.logRequest
   , utils.verifyClientToken
   , requests.putBookRequestResponse
   , error);


app.post('/books-auth/confirm_book_order'       , utils.logRequest
   , utils.verifyClientToken
   , requests.confirmBookOrder
   , error);


/**
 * APIs for crontabs
 */
app.get('/req_book_auth/process_pending_req'     , utils.logRequest
   , cron.processPendingBookRequests
   , error);

app.post('/books-auth/get_minimum_response'      , utils.logRequest
    , requests.getMinimumPriceResponse
    , error);

/**
 * Panel related apis
 */
app.post('/books-auth/get/details_user'          , utils.logRequest
    , utils.verifyPanelToken
    , users.getUserDetailsPanel
    , error);

app.post('/books-auth/get/details_vendor'        , utils.logRequest
    , utils.verifyPanelToken
    , vendors.getVendorDetailsPanel
    , error);

app.get('/books-auth/searchUser'               , utils.logRequest
    , utils.verifyPanelToken
    , users.searchUser
    , error);

app.get('/books-auth/searchVendor'              , utils.logRequest
    , utils.verifyPanelToken
    , vendors.searchVendor
    , error);

app.post('/books-auth/block/user'                , utils.logRequest
    , utils.verifyPanelToken
    , users.blockUserById
    , error);

app.post('/books-auth/block/vendor'              , utils.logRequest
    , utils.verifyPanelToken
    , vendors.blockVendorById
    , error);

app.post('/books-auth/report'                    , utils.logRequest
    , utils.verifyPanelToken
    , analytics.getOverallReportPanel
    , error);

app.post('/books-auth/get_requests'              , utils.logRequest
    , utils.verifyPanelToken
    , analytics.getOverallRequests
    , error);

app.post('/books-auth/get_vendors_engagement'    , utils.logRequest
    , utils.verifyPanelToken
    , analytics.getVendorEngagements
    , error);

app.post('/books-auth/get_deliveries'            , utils.logRequest
    , utils.verifyPanelToken
    , requests.getDeliveries
    , error);

app.post('/books-auth/get_delivery_details'     , utils.logRequest
   , utils.verifyPanelToken
   , requests.getDeliveryDetailsById
   , error);
/**
 * To change the port, please edit the configuration file
 * @type {https.Server}
 */

/*
var httpServer = https.createServer(options, app).listen(app.get('port'), function()  {
  console.log('Express server listening on port ' + app.get('port'));
});
*/

var httpServer = http.createServer(app).listen(app.get('port'), function()  {
  console.log('Express server listening on port ' + app.get('port'));
});
