var mysql = require('mysql');

function handleDisconnectLive() {
  connection = mysql.createPool(config.get('dbLiveSettings'));

  connection.on('error', function(err) {
    console.log('db error');
    if(err.code == 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnectLive();
    }
    else {
      throw err;
    }
  });
}

handleDisconnectLive();
