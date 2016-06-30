
var levels = {
  trace : 0,
  debug : 1,
  info  : 2,
  warn  : 3,
  error : 4
};

exports.trace               = trace;
exports.debug               = debug;
exports.info                = info;
exports.warn                = warn;
exports.error               = error;
exports.logDatabaseQuery    = logDatabaseQuery;

// A variadic function to log the stuff
function log(loggingLevel, loggingParameters) {
  var handlineInfo   = logginParameters[0];
  var apiModule      = handlingInfo.apiModule;
  var apiHandler     = handlingInfo.apiHandler;

  var defaultLoggingLevel = debuggingPermisssions[apiModule].defaultLoggingLevel;

  // We need to log all the errors
  if(loggingLevel !== levels.error && (!isLoggingEnabled(apiModule, apiHandler) || loggingLevel > defaultLoggingLevel)) {
    return;
  }

  var stream = process.stdout;
  if(loggingLevel === levels.error) {
    stream = process.stderr;
  }

  for(var i = 1; i < loggingParameters.length; i++) {
    stream.write(apiModule+ " ::: " + apiHandler + " ::: " + JSON.stringify(loggingParameters[i]) + "\n");
  }
}

function trace(/* arguments */) {
  log(levels.trace, arguments);
}

function debug(/* arguments */) {
  log(levels.debug, arguments);
}

function info(/* arguments */) {
  log(levels.info, arguments);
}

function warn(/* arguments */) {
  log(levels.warn, arguments);
}

function error(/* arguments */) {
  log(levels.error, arguments);
}

function logDatabaseQuery(handlerInfo, eventFired, error, result, query) {
  if(error) {
    if(typeof query !== 'undefined') 
      module.exports.error(handlerInfo, {event: eventFired}, {error: error}, {result : result}, {query : query});
    else
      module.exports.error(handlerInfo, {event: eventFired}, {error: error}, {result: result});
  }
  else {
    if(typeof query !== 'undefined') 
      module.exports.error(handlerInfo, {event: eventFired}, {error: error}, {result: result}, {query: query});
    else 
      module.exports.trace(handlerInfo, {event: eventFired}, {error: error}, {result: result});
  }
}
