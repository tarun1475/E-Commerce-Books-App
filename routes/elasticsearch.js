/**
 * @module elasticsearch
 */

var request   = require('request');
var logging   = require('./logging');
var constants = require('./constants');

exports.addBookViaPanel    = addBookViaPanel;
exports.searchBook         = searchBook;
exports.addBookToIndex     = addBookToIndex;
exports.searchBookInIndex  = searchBookInIndex;

/**
 * <b> API [POST] /books-auth/add_book </b> <br>
 * API to input books for the elastic search db. <br>
 * Request body requires the following parameters :
 * @param token               {STRING} access token
 * @param name                {STRING} Book name
 * @param stream              {STRING}  OPTIONAL : college stream
 * @param semester            {STRING}  OPTIONAL : college semester
 * @param author              {STRING}  OPTIONAL : book author
 * @param medium              {STRING}  OPTIONAL : medium
 * @param publisher           {STRING}  OPTIONAL : publisher
 * @param Class               {STRING}  OPTIONAL : Class
 * @param competitionName     {STRING}  OPTIONAL : competition name
 * @param isNcert             {INTEGER} OPTIONAL : if book is ncert
 * @param isGuide             {INTEGER} OPTIONAL : if book is guide
 */
function addBookViaPanel(req, res) {
    var handlerInfo       = {
        "apiModule": "elasticSearch",
        "apiHandler": "addBookViaPanel"
    };
    var reqParams         = req.body;
    var name              = reqParams.name || "";
    var stream            = reqParams.stream | "";
    var semester          = reqParams.semester || "";
    var author            = reqParams.author || "";
    var publisher         = reqParams.publisher || "";
    var Class             = reqParams.Class || "";
    var competitionName   = reqParams.competition_name || "";
    var isNcert           = reqParams.is_ncert || "";
    var isGuide           = reqParams.is_guide || "";
    var medium            = reqParams.medium || "";
    addBookToIndex(handlerInfo, name, stream, semester, author, medium, publisher, Class, competitionName, isNcert,
        isGuide, function(err, result) {
        if(err) {
            logging.error(handlerInfo, "adding book to index", err, result);
            return res.send({
                "log": "There was some error in adding book to index",
                "flag": constants.responseFlags.ACTION_FAILED
            });
        }
        res.send({
            "log": "book added successfully",
            "flag": constants.responseFlags.ACTION_COMPLETE
        });
    });
}

/**
 * <b> API [POST] /books-auth/get_books </b><br>
 * Elastic search wrapper. This would search for books .
 * @param token  {STRING} access token
 * @param key    {STRING} search key
 */
function searchBook(req, res) {
    var handlerInfo = {
        "apiModule": "elasticSearch",
        "apiHandler": "searchBook"
    };
    var reqParams = req.body;
    var searchKey = reqParams.key;
    searchBookInIndex(handlerInfo, searchKey, function(err, result) {
        if(err) {
            return res.send({
                "log": err,
                "flag": constants.responseFlags.ACTION_FAILED
            });
        }
        res.send({
            "log": "successfully searched through database",
            "flag": constants.responseFlags.ACTION_COMPLETE,
            "data": result
        });
    });
}

function addBookToIndex(handlerInfo, name, stream, semester, author, medium, publisher, Class, competitionName,
                        isNcert, isGuide, callback) {
    var reqUrl = ("http://"+config.get('elasticsearch.host')+":"+config.get('elasticsearch.port')
        +"/"+config.get("elasticsearch.addBookUrl"));
    var reqBody = {};
    if(name != "") {
        reqBody.name = name;
    }
    if(stream |= "") {
        reqBody.stream = stream;
    }
    if(semester != "") {
        reqBody.semester = semester;
    }
    if(author != "") {
        reqBody.author = author;
    }
    if(medium != "") {
        reqBody.medium = medium;
    }
    if(publisher != "") {
        reqBody.Class = Class;
    }
    if(competitionName != "") {
        reqBody.competitionName = competitionName;
    }
    if(isNcert != "") {
        reqBody.isNcert = isNcert;
    }
    if(isGuide != "") {
        reqBody.isGuide = isGuide;
    }
    makeElasticSearchServerCall(handlerInfo, "POST", reqUrl, reqBody, function(err, result) {
        if(err) {
            logging.error(handlerInfo, "adding a book to index", err, result);
            return callback(err, null);
        }
        return callback(null, result);
    });
}

function searchBookInIndex(handlerInfo, key, callback) {
    var reqUrl = ("http://"+config.get('elasticsearch.host')+":"+config.get('elasticsearch.port')
    +"/"+config.get("elasticsearch.searchBook"));
    var reqBody = {};
    reqBody.query = {};
    reqBody.query.query_string = {};
    reqBody.query.query_string.query = "%"+key+"%";
    console.log(reqBody.query);
    makeElasticSearchServerCall(handlerInfo, "POST", reqUrl, reqBody, function(err, result) {
        if(err) {
            return callback(err, null);
        }
        return callback(null, result.hits.hits);
    });
}

function makeElasticSearchServerCall(handlerInfo, requestType, requestUrl, requestBody, callback) {
    var options    = {};
    options.method = requestType;
    options.json   = true;
    options.rejectUnauthorized = false;
    options.url    = requestUrl;
    options.headers= {
        'Content-Type': 'application/json'
    };
    options.body   = requestBody;
    request(options, function(error, response, body) {
        logging.trace(handlerInfo, "server call", body);
        if(response.statusCode != 200) {
            return callback(error, null);
        }
        callback(null, body);
    });
}
