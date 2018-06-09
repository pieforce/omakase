'use strict';

const yelp = require('yelp-fusion');
const brain = require('brain.js');
var fs = require('fs');

// Constants
const TRAINING_DATA_PATH = './brainTrainingData.json';
const API_KEY = 'GQy2ALXHhP-dQgRYZUWZ8yVn_IUgc2U2Tg_Ah4ONThDYwtLG3gh_8s1fEQR5GYukmFswGkRgf1BImmWgsHXes48S7H927fN5kooT_Zt-ursn4LZX-uKqW83C6qEaW3Yx';
const client = yelp.client(API_KEY);

// Train neural net
var trainingDataJson = JSON.parse(fs.readFileSync(TRAINING_DATA_PATH, 'utf8'));
var net = new brain.NeuralNetwork();
net.train(trainingDataJson);
let trainedNet = net.toFunction();

// Perform Yelp search and run neural net analysis on each result
client.search({
    term: 'Restaurants',
    location: 'Irvine, CA',
    limit: 50,
    sort_by: 'rating',
    open_now: true
  }).then(response => {
    response.jsonBody.businesses.forEach(function(result) {
        var resultReviewCount = result.review_count;
        if (isEmpty(resultReviewCount)) {
            resultReviewCount = 0;
        } else {
            resultReviewCount = resultReviewCount / 10000;
        }

        var resultRating = result.rating;
        if (isEmpty(resultRating)) {
            resultRating = 0;
        } else {
            resultRating = resultRating / 5;
        }

        var resultPrice = result.price;
        if (isEmpty(resultPrice)) {
            resultPrice = 0.25; // If no price range, assume one dollar sign ($ / $$$$)
        } else {
            resultPrice = (result.price.split('$').length - 1) / 4; // Count # of dollar signs
        }

        // Run analysis and print result
        var output = trainedNet({ 
            review_count: resultReviewCount,
            rating: resultRating,
            price: resultPrice
        });
        console.log(result.name + ': ' +  (output.appeal * 100).toFixed(0) + '%');
    });
  }).catch(e => {
    console.log(e);
  });


  function isEmpty(str) {
    if (str === undefined || str.length == 0 || str == '') {
        return true;
    } else {
       false;
    }
  }