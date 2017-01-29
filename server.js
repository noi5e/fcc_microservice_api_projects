var url = require('url');
var https = require('https');
var querystring = require('querystring');

var mongo = require('mongodb').MongoClient;
var mongoURI = process.env['MONGO_URI'];

var chrono = require('chrono-node');
var strftime = require('strftime');
var async = require('async');
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });

var express = require('express');
var app = express();

// --**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**
//                         FILE METADATA MICROSERVICE
// --**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**

app.post('/filemetadata', upload.single('upload'), function(request, response) {

  console.log(request.file);

  response.send({size: request.file.size});
});

app.use('/filemetadata', express.static(__dirname + '/filemetadata_static'));

// --**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**
//                       IMAGE SEARCH ABSTRACTION LAYER
// --**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**

app.get('/latest/imagesearch', function(request, response) {

  mongo.connect(mongoURI, function(error, database) {
    if (error) throw error;

    var queries = database.collection('queries');

    var responseJSON = [];

    var lastTen = queries.find({}, { _id: 0 }).limit(10).sort({ when: -1 }).toArray(function(error, data) {
      response.send(data);
    });

    database.close();
  });

});

app.get('/imagesearch/:searchQuery', function(request, response) {

  var apiKey = process.env['GOOGLE_API_KEY'];

  var queryObject = {
    key: apiKey,
    q: request.params.searchQuery,
    cx: '008842857176783284677:jrqevlh9gzs',
    searchType: 'image'
  }

  if (request.query.offset) {
    queryObject.start = request.query.offset
  }

  var queryString = querystring.stringify(queryObject);

  var httpResponseBody = '';

  console.log('https://www.googleapis.com/customsearch/v1?' + queryString)

  https.get('https://www.googleapis.com/customsearch/v1?' + queryString, function(httpResponse) {
    console.log('Got response: ' + httpResponse.statusCode);

    mongo.connect(mongoURI, function(error, database) {
      if (error) throw error;

      var queries = database.collection('queries');

      queries.insert({ term: decodeURIComponent(request.params.searchQuery), when: new Date().toISOString() });

      database.close();
      
    });

    httpResponse.on('data', function(data) {
      httpResponseBody += data;
    });

    httpResponse.on('end', function() {

      var filteredResponse = JSON.parse(httpResponseBody).items.map(function(datum) {
        return {
          url: datum.link,
          snippet: datum.snippet,
          thumbnail: datum.image.thumbnailLink,
          context: datum.image.contextLink
        };
      });

      response.send(filteredResponse);
    })
  }).on('error', function(error) {
    console.log('Got error: ' + error.message);
  });

});

// --**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**
//                         URL SHORTENER MICROSERVICE
// --**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**

app.get('/debug', function(request, response) {
  
  mongo.connect(mongoURI, function(error, database) {
    if (error) throw error;

    var counters = database.collection('counters');

    counters.insertOne({ name: url_count, seq: 1 }).then(function(boolean) {
      response.send(boolean);
    });
  });

});

app.get(/url-shortener\/([a-zA-Z\d]+)$/, function(request, response) {

  mongo.connect(mongoURI, function(error, database) {
    if (error) throw error;

    var urls = database.collection('urls');

    urls.findOne({ short_code: request.params[0] }).then(function(document) {
      if (document && document.original_url.match(/^http:\/\//)) {
        response.redirect(document.original_url);
      } else if (document) {
        response.redirect('http://' + document.original_url);
      } else {
        response.send({ error: 'URL short code doesn\'t exist in database.' });
      }

      database.close();
    });
    
  });
});

app.get(/url-shortener\/((https?:\/\/)?(\w+\.\w+)+(\.\w+)?)$/, function(request, response) {
  
  mongo.connect(mongoURI, function(error, database) {
    if (error) throw error;

    var urls = database.collection('urls');
    var counters = database.collection('counters');

    var alphabet = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
    var base = alphabet.length; // base is the length of the alphabet (58 in this case)

    function generateShortUrl(num){
      var encoded = '';
      while (num){
        var remainder = num % base;
        num = Math.floor(num / base);
        encoded = alphabet[remainder].toString() + encoded;
      }
      return encoded;
    }

    var matchingDocument, newShortCode;

    async.series(
      {
        'original_url': function(callback) {
          urls.findOne({ original_url: request.params[0] }).then(function(document) { 
            matchingDocument = document;
            callback(null, request.params[0]);
          });
        },
        'short_url': function(callback) {
          if (matchingDocument) {
            callback(null, matchingDocument.short_url);
          } else {
            counters.findOne({ _id: 'url_count' }).then(function(document) {
              console.log("couldn't find matching URL in database")

              newShortCode = generateShortUrl(document.seq);
              counters.updateOne({ _id: 'url_count' }, { $inc: { seq: 1 } });
              callback(null, 'https://warm-lake-11675.herokuapp.com/url-shortener/' + newShortCode);
            });
          }
        }
      },
      function(error, results) {
        if (newShortCode) {
          urls.insert({ original_url: request.params[0], short_url: 'https://warm-lake-11675.herokuapp.com/url-shortener/' + newShortCode, short_code: newShortCode });
        }

        response.send(results);
        database.close();
      }
    );

  });
});

app.use('/url-shortener', express.static(__dirname + '/url_shortener_static'));

// --**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**
//                         REQUEST HEADER PARSER MICROSERVICE
// --**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**

app.get('/request-header-parser', function(request, response) {

  var responseObject = {
    ipaddress: request.headers['x-forwarded-for'],
    language: request.headers['accept-language'].split(',')[0],
    software: request.headers['user-agent'].match(/^[\S]* \(([\w; ]*)\)/)[1]
  };

  response.send(responseObject);
});

// --**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**
//                              TIMESTAMP MICROSERVICE
// --**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**--**

function getNaturalDate(unixMilliseconds) {
  return strftime('%B %d, %Y', new Date(unixMilliseconds));
}

function getUnixMilliseconds(naturalDate) {
  return chrono.parseDate(naturalDate).getTime();
}

app.get('/timestamp/:time', function(request, response) {
  var responseObject = {
    unix: null,
    natural: null
  };

  try {
    responseObject.natural = getNaturalDate(new Date(+request.params.time * 1000));
    responseObject.unix = +request.params.time;

    if (responseObject.natural.match(/undefined/)) { responseObject.natural = null }
  } finally {
    if (chrono.parseDate(decodeURI(request.params.time)) !== null) {
      var chronoDateObject = chrono.parse(decodeURI(request.params.time));
      var chronoKnownValues = chronoDateObject[0].start.knownValues;
      var unixTime = new Date(chronoKnownValues.year, chronoKnownValues.month - 1, chronoKnownValues.day).getTime();

      responseObject.natural = strftime('%B %d, %Y', new Date(unixTime));
      responseObject.unix = unixTime / 1000;
    }

    response.send(responseObject);
  }
});

app.use('/timestamp', express.static(__dirname + '/timestamp_static'));

app.listen(process.env.PORT || 8080, function () {
  console.log('Example app listening on port 8080!');
});
