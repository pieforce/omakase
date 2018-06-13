'use strict';

const yelp = require('yelp-fusion');
const brain = require('brain.js');
const fs = require('fs');
const apiConfig = require('../config/api');

// Constants
const TRAINING_DATA_PATH = './config/brainTrainingData.json';
const YELP_CLIENT = yelp.client(apiConfig.yelpApiKey);
const MAX_NUM_REVIEWS = 10000;
const MAX_NUM_STARS = 5;
const MAX_NUM_DOLLAR_SIGNS = 4;

// Train neural net
var trainingDataJson = JSON.parse(fs.readFileSync(TRAINING_DATA_PATH, 'utf8'));
var net = new brain.NeuralNetwork();
net.train(trainingDataJson);
let trainedNet = net.toFunction();

// API Routes
module.exports = function (app) {

    // Perform Yelp search and run neural net analysis on each result
    app.get('/api/search/:searchStr/:location/:resultLimit', function (req, res) {
        var searchStr = req.params.searchStr.replace('%20', ' ');
        var location = req.params.location.replace('%20', ' ');
        var resultLimit = req.params.resultLimit;

        if (isEmpty(resultLimit)) {
            resultLimit = 5;
        } else if (resultLimit > 50) {
            resultLimit = 50;
        } else if (resultLimit < 0) {
            resultLimit = 5;
        }
        console.log('resultLimit: ' + resultLimit)

        YELP_CLIENT.search({
            term: searchStr,
            location: location,
            limit: resultLimit,
            sort_by: 'rating',
            open_now: true
        }).then(response => {
            for (var i=0; i < response.jsonBody.businesses.length; i++) {
                var result = response.jsonBody.businesses[i];
                // If no price is returned, assume one dollar sign ($ / $$$$) or 1/4 = 0.25
                // If valid price range, count # of dollar signs
                var resultPrice = isEmpty(result.price) ? 0.25 : ((result.price.split('$').length - 1) / MAX_NUM_DOLLAR_SIGNS);
                var resultReviewCount = isEmpty(result.rating) ? 0 : result.review_count / MAX_NUM_REVIEWS;
                var resultRating = isEmpty(result.rating) ? 0 : result.rating / MAX_NUM_STARS;
    
                // Run neural net analysis and print result
                var output = trainedNet({ 
                    review_count: resultReviewCount,
                    rating: resultRating,
                    price: resultPrice
                });
                // Insert appeal as percentage
                response.jsonBody.businesses[i]['appeal'] = (output.appeal * 100).toFixed(0);
            }
            res.json(response.jsonBody.businesses);
        }).catch(e => {
            console.log(e);
        });
    });

    // Get details of a business based on Yelp ID
    app.get('/api/details/:id', function (req, res) {
        YELP_CLIENT.business(req.params.id).then(response => {
            res.json(response.jsonBody);
        }).catch(e => {
            console.log(e);
        });
    });

    // application -------------------------------------------------------------
    app.get('*', function (req, res) {
        res.sendFile(__dirname + '/index.html'); // load the single view file (angular will handle the page changes on the front-end)
    });
}

function isEmpty(str) {
    if (str === undefined || str.length == 0 || str == '') {
        return true;
    } else {
        false;
    }
}