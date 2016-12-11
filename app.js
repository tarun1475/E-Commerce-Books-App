/*
 * Module dependencies.
 */

process.env.NODE_CONFIG_DIR = __dirname + '/config/';
config                  = require('config');
var express             = require('express');
var http                = require('http');
var https               = require('https');
var bodyParser          = require('body-parser');
var fs                  = require('fs');
var cors                = require('cors');
var logger              = require('morgan');
var multer              = require('multer');
var favicon             = require('serve-favicon');
var error               = require('./routes/error');
var users               = require('./routes/users');
var vendors             = require('./routes/vendors');
var requests            = require('./routes/book_requests');
var utils               = require('./routes/commonfunctions');
var cron                = require('./routes/cron');
var analytics           = require('./routes/analytics');
var elasticSearch       = require('./routes/elasticsearch');
var uploads             = require('./routes/uploads');
var app                 = express();

connection              = undefined;
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
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(cors());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");  
  next();
});

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

// For storing data on server


app.get('/', function(req, res) {
  res.send('Vevsa.com - You save we save!');
});

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/uploads/');
    },
    filename: function (req, file, cb) {
        var fileName = file.originalname.replace(/[|&;$%@"<>()+,' '?]/g, "");
        cb(null, fileName);
    }
});
var upload = multer({storage: storage});

/**
 * Users APIs
 */
app.post('/books-auth/check_version'             , utils.logRequest
   , users.checkVersion
   , error);
   
app.post('/books-auth/create_user'             , utils.logRequest
   , users.createNewAppUser
   , error);

app.post('/books-auth/create_vendor'           , utils.logRequest
   , vendors.createNewVendor
   , error);

app.get('/books-auth/get_user_requests'        , utils.verifyClientToken
   , users.getRecentRequestsByUserId
   , error);

app.post('/books-auth/send_otp'                 , utils.logRequest
   , utils.sendOTP
   , error);
app.post('/books-auth/send_vendor_otp'                 , utils.logRequest
   , utils.sendVendorOTP
   , error);
app.post('/books-auth/forgot_vendor_pass'                 , utils.logRequest
   , utils.forgotVendorPass
   , error);
app.get('/books-auth/verify_forgot_vendor_otp'               , utils.logRequest
   , utils.verifyForgotVendorOTP
   , error);
app.get('/books-auth/verify_vendor_otp'               , utils.logRequest
   , utils.verifyVendorOTP
   , error);
   
app.get('/books-auth/verify_web_otp'               , utils.logRequest
   , utils.verifyWebOTP
   , users.createNewAppUser
   , error);

app.get('/books-auth/verify_otp'               , utils.logRequest
   , utils.verifyOTP
   , users.createNewAppUser
   , error);

app.get('/books-auth/get_vendor_sales'         , utils.logRequest
  , utils.verifyClientToken
  , vendors.getVendorSales
  , error);

app.post('/books-auth/login'                   , utils.logRequest
  , utils.loginUser
  , error);
app.post('/books-auth/login_web_user'                   , utils.logRequest
  , utils.loginWebUser
  , error);

app.get('/books-auth/my_details'               , utils.logRequest
  , utils.verifyClientToken
  , users.getMyDetails
  , error);

app.get('/books-auth/get_vendor_details'               , utils.logRequest
  , users.getVendorDetails
  , error);


app.get('/books-auth/my_orders'                , utils.logRequest
  , utils.verifyClientToken
  , users.getMyOrders
  , error);

app.get('/books-auth/delete_account'          , utils.logRequest
  , utils.verifyClientToken
  , users.markUserInActive
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

app.post('/books-auth/get_books'                , utils.verifyClientToken
   , elasticSearch.searchBook
   , error);

app.post('/books-auth/upload'                   , utils.logRequest
    //, utils.verifyClientToken
    , upload.single('fileName'), function(req, res, next) {
      console.log("file path is : "+req.file.path);
      return res.send({
        path: req.file.path
  });
});

app.post('/books-auth/s3/upload'                 , utils.logRequest
   //, utils.verifyClientToken
   , upload.single('fileName')
   , uploads.uploadFileToS3);
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
app.post('/books-auth/check_response'              , utils.logRequest
    , analytics.checkResponse
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

app.post('/books-auth/update_delivery_status'       , utils.logRequest
   , utils.verifyPanelToken
   , requests.updateDeliveryStatus
   , error);

app.post('/books-auth/add_book'                 , utils.verifyClientToken
    , elasticSearch.addBookViaPanel
    , error);

app.get('/req_book_auth/get_all_users'         , utils.logRequest
    , utils.verifyPanelToken
    , users.getAllUsers
    , error);
/**
 * To change the port, please edit the configuration file
 * @type {https.Server}
 */

/*
 * Referral apis related to some web-referral scheme
 *
 */
app.post('/books-auth/email/send_otp'             , utils.logRequest
    , utils.sendOtpViaEmail
    , error);

app.post('/books-auth/email/verify_otp'           , utils.logRequest
    , utils.verifyEmailOtp
    , error);

app.get('/books-auth/refer'                       , utils.logRequest
    , utils.serverReferUserPage
    , error);

app.post('/books-auth/referrals/login'            , utils.logRequest
    , utils.loginReferralProgramme
    , error);

app.get('/books-auth/referrals/leaderboard'       , utils.logRequest
    , utils.getReferralLeaderBoard
    , error);

app.get('/books-auth/referrals/user_referrals'    , utils.logRequest
    , utils.getUserReferrals
    , error);

/*
 * Web APIs.
 */
app.post('/books-auth/create_webReq'             , utils.logRequest
   , users.createWebReq
   , error);


/*
var httpServer = https.createServer(options, app).listen(app.get('port'), function()  {
  console.log('Express server listening on port ' + app.get('port'));
});
*/

var httpServer = http.createServer(app).listen(app.get('port'), function()  {
  console.log('Express server listening on port ' + app.get('port'));
});
