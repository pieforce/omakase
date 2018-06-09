'use strict';

const yelp = require('yelp-fusion');
const brain = require('brain.js');
const fs = require('fs');
const apiConfig = require('../config/api');

// Constants
const TRAINING_DATA_PATH = './config/brainTrainingData.json';
const API_KEY = 'GQy2ALXHhP-dQgRYZUWZ8yVn_IUgc2U2Tg_Ah4ONThDYwtLG3gh_8s1fEQR5GYukmFswGkRgf1BImmWgsHXes48S7H927fN5kooT_Zt-ursn4LZX-uKqW83C6qEaW3Yx';
const YELP_CLIENT = yelp.client(apiConfig.yelpApiKey);

// Train neural net
var trainingDataJson = JSON.parse(fs.readFileSync(TRAINING_DATA_PATH, 'utf8'));
var net = new brain.NeuralNetwork();
net.train(trainingDataJson);
let trainedNet = net.toFunction();

module.exports = function (app) {

    // Perform Yelp search and run neural net analysis on each result
    app.get('/api/results/:searchStr/:location', function (req, res) {
        var searchStr = req.params.searchStr.replace('%20', ' ');
        var location = req.params.location.replace('%20', ' ');

        YELP_CLIENT.search({
            term: searchStr,
            location: location,
            limit: 50,
            sort_by: 'rating',
            open_now: true
        }).then(response => {
            for (var i=0; i < response.jsonBody.businesses.length; i++) {
                var result = response.jsonBody.businesses[i];
                // If no price is returned, assume one dollar sign ($ / $$$$) or 1/4 = 0.25
                // If valid price range, count # of dollar signs
                var resultPrice = isEmpty(result.price) ? 0.25 : ((result.price.split('$').length - 1) / 4);
                var resultReviewCount = isEmpty(result.rating) ? 0 : result.review_count / 10000;
                var resultRating = isEmpty(result.rating) ? 0 : result.rating / 5;
    
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

    // application -------------------------------------------------------------
    app.get('*', function (req, res) {
        res.sendFile(__dirname + '/index.html'); // load the single view file (angular will handle the page changes on the front-end)
    });
};



function getYelpSearchResults(searchStr, location) {
    YELP_CLIENT.search({
        term: searchStr,
        location: location,
        limit: 50,
        sort_by: 'rating',
        open_now: true
    }).then(response => {
        for (var i=0; i < response.jsonBody.businesses.length; i++) {
            var result = response.jsonBody.businesses[i];
            // If no price is returned, assume one dollar sign ($ / $$$$) or 1/4 = 0.25
            // If valid price range, count # of dollar signs
            var resultPrice = isEmpty(result.price) ? 0.25 : ((result.price.split('$').length - 1) / 4);
            var resultReviewCount = isEmpty(result.rating) ? 0 : result.review_count / 10000;
            var resultRating = isEmpty(result.rating) ? 0 : result.rating / 5;

            // Run neural net analysis and print result
            var output = trainedNet({ 
                review_count: resultReviewCount,
                rating: resultRating,
                price: resultPrice
            });
            // console.log(result.name + ': ' +  (output.appeal * 100).toFixed(0) + '%');

            response.jsonBody.businesses[i]['appeal'] = output.appeal;
        }
        // console.log(response.jsonBody);
        return response.jsonBody;
    }).catch(e => {
        console.log(e);
    });
}

function isEmpty(str) {
    if (str === undefined || str.length == 0 || str == '') {
        return true;
    } else {
        false;
    }
}