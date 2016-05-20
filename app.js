/*
 * Module dependencies.
 */

process.env.NODE_CONFIG_DIR = __dirname + '/config/';
config          = require('config');
var express     = require('express');
var http        = require('http');
var https       = require('https');
var bodyParser  = require('body-parser');
var logger      = require('morgan');
var app         = express();

connection      = undefined;
require('./routes/mysqlLib');

// all environments
app.set('port', process.env.PORT || config.get('port') || 4013);
app.use(logger('dev'));

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

var httpServer = http.createServer(app).listen(app.get('port'), function()  {
  console.log('Express server listening on port ' + app.get('port'));
});
