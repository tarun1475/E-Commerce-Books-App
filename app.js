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

app.post('/books-auth/create_user'
   , users.createNewAppUser
   , error);

app.post('/books-auth/create_vendor'
   , vendors.createNewVendor
   , error);

app.post('/req_book_auth/raise_request'         , utils.verifyClientToken
   , requests.raiseBooksRequest
   , error);

app.post('/req_book_auth/get_pending_requests'  , utils.verifyClientToken
   , requests.getBookRequests
   , error);

app.post('/req_book_auth/put_response'          , utils.verifyClientToken
   , requests.putBookRequestResponse
   , error);

app.post('/books-auth/get_minimum_response'     , utils.verifyClientToken
   , requests.getMinimumPriceResponse
   , error);

app.post('/books-auth/confirm_book_order'       , utils.verifyClientToken
   , requests.confirmBookOrder
   , error);

app.post('/books-auth/get_delivery_details'     , utils.verifyClientToken
   , requests.getDeliveryDetailsById
   , error);

var httpServer = https.createServer(options, app).listen(app.get('port'), function()  {
  console.log('Express server listening on port ' + app.get('port'));
});
