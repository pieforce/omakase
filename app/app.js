'use strict';

const yelp = require('yelp-fusion');
const brain = require('brain.js');
const fs = require('fs');
const mongo = require('mongodb').MongoClient;
const apiConfig = require('../config/api');

// Constants
const TRAINING_DATA_PATH = './config/brainTrainingData.json';
const YELP_CLIENT = yelp.client(apiConfig.yelpApiKey);
const MAX_NUM_REVIEWS = 100000;
const MAX_NUM_STARS = 5;
const MAX_NUM_DOLLAR_SIGNS = 4;
const MAX_NUM_SEARCH_RESULTS = 50;
const MAX_SEARCH_RADIUS_METERS = 16000; // 16000 m == 10 mi, approx

// Train neural net
var net = new brain.NeuralNetwork();
var trainedNet = null;
mongo.connect(apiConfig.mlabUrl, (err, db) => {
    if (err) throw err;
    var dbo = db.db(apiConfig.mlabDatabase);
    dbo.collection(apiConfig.mlabTrainingCollection).findOne(
        {
            'info.snapshot' : apiConfig.mlabTrainingSnapshot
        }, function(err, result) {
            if (err) throw err;
            net.train(result.data);
            trainedNet = net.toFunction();
            db.close();

            console.log('!----------[BRAIN START]----------!');
            console.log(' * Training snapshot loaded: ' + apiConfig.mlabTrainingSnapshot);
            console.log('!----------[BRAIN START]----------!');
        }
    );
});

// API Routes
module.exports = function (app) {

    // Perform Yelp search and run neural net analysis on each result
    app.get('/api/search/:searchStr/:location/:resultLimit', function (req, res) {

        var searchStr = req.params.searchStr.replace('%20', ' ');
        var location = req.params.location.replace('%20', ' ');
        var resultLimit = req.params.resultLimit;

        // Enforce search result limit
        if (isEmpty(resultLimit)) {
            resultLimit = 5;
        } else if (resultLimit > MAX_NUM_SEARCH_RESULTS) {
            resultLimit = MAX_NUM_SEARCH_RESULTS;
        } else if (resultLimit < 0) {
            resultLimit = 5;
        }

        console.log('!----------[SEARCH]----------!');
        console.log(' * searchStr: ' + searchStr);
        console.log(' * location: ' + location);
        console.log('!----------[SEARCH]----------!');

        var searchParams = {
            term: searchStr,
            location: location,
            radius: MAX_SEARCH_RADIUS_METERS,
            limit: resultLimit,
            sort_by: 'rating',
            open_now: true
        }

        // Search and run analysis on results
        YELP_CLIENT.search(searchParams).then(response => {
            for (var i=0; i < response.jsonBody.businesses.length; i++) {
                var result = response.jsonBody.businesses[i];
                // If no price is returned, assume one dollar sign ($ / $$$$) or 1/4 = 0.25
                // If valid price range, count # of dollar signs
                var resultPrice = isEmpty(result.price) ? 0.25 : ((result.price.split('$').length - 1) / MAX_NUM_DOLLAR_SIGNS);
                var resultReviewCount = isEmpty(result.review_count) ? 0 : result.review_count / MAX_NUM_REVIEWS;
                var resultRating = isEmpty(result.rating) ? 0 : result.rating / MAX_NUM_STARS;
                var resultId = getHash(result.id);
    
                // Run neural net analysis and print result
                var output = net.run({ 
                    id : resultId,
                    review_count: resultReviewCount,
                    rating: resultRating,
                    price: resultPrice
                });
                // Insert appeal as percentage
                response.jsonBody.businesses[i]['appeal'] = parseInt((output.appeal * 100).toFixed(0));
            }
            res.json(response.jsonBody.businesses);
        }).catch(e => {
            console.log(e);
        });

        // Log metrics
        searchParams['ip'] = req.connection.remoteAddress;
        searchParams['timestamp'] = new Date();
        mongo.connect(apiConfig.mlabUrl, (err, db) => {
            if (err) throw err;
            var dbo = db.db(apiConfig.mlabDatabase);
            dbo.collection(apiConfig.mlabMetricsCollection).updateOne(
                { 
                    info: {
                        snapshot: apiConfig.mlabMetricsSnapshot
                    } 
                },
                {
                    $push: {
                        api: {
                            searchParams
                        }
                    }
                }, function(err, result) {
                    if (err) throw err;
                    console.log('MongoDB updates: ' + result.result.n);
                    db.close();
                }
            );
        });
    });

    // Get the best-ranked result after performing Yelp search and running neural net analysis on each result
    app.get('/api/decide/:searchStr/:location', function (req, res) {

        var searchStr = req.params.searchStr.replace('%20', ' ');
        var location = req.params.location.replace('%20', ' ');

        console.log('!----------[DECIDE]----------!');
        console.log(' * searchStr: ' + searchStr);
        console.log(' * location: ' + location);
        console.log('!----------[DECIDE]----------!');

        var decideSearchParams = {
            term: searchStr,
            location: location,
            limit: MAX_NUM_SEARCH_RESULTS,
            radius: MAX_SEARCH_RADIUS_METERS,
            sort_by: 'rating',
            open_now: true
        }

        YELP_CLIENT.search(decideSearchParams).then(response => {
            var bestResultIndex = 0;
            var bestResultAppeal = 0.00;
            for (var i=0; i < response.jsonBody.businesses.length; i++) {
                var result = response.jsonBody.businesses[i];
                // If no price is returned, assume one dollar sign ($ / $$$$) or 1/4 = 0.25
                // If valid price range, count # of dollar signs
                var resultPrice = isEmpty(result.price) ? 0.25 : ((result.price.split('$').length - 1) / MAX_NUM_DOLLAR_SIGNS);
                var resultReviewCount = isEmpty(result.review_count) ? 0 : result.review_count / MAX_NUM_REVIEWS;
                var resultRating = isEmpty(result.rating) ? 0 : result.rating / MAX_NUM_STARS;
                var resultId = getHash(result.id);
    
                // Run neural net analysis and print result
                var output = net.run({ 
                    id : resultId,
                    review_count: resultReviewCount,
                    rating: resultRating,
                    price: resultPrice
                });

                if (output.appeal > bestResultAppeal) {
                    bestResultIndex = i;
                    bestResultAppeal = output.appeal;
                }
                // Insert appeal as percentage
                response.jsonBody.businesses[i]['appeal'] = parseInt((output.appeal * 100).toFixed(0));
            }
            res.json([response.jsonBody.businesses[bestResultIndex]]);
        }).catch(e => {
            console.log(e);
        });

        // Log metrics
        decideSearchParams['ip'] = req.connection.remoteAddress;
        decideSearchParams['timestamp'] = new Date();
        mongo.connect(apiConfig.mlabUrl, (err, db) => {
            if (err) throw err;
            var dbo = db.db(apiConfig.mlabDatabase);
            dbo.collection(apiConfig.mlabMetricsCollection).updateOne(
                { 
                    info: {
                        snapshot: apiConfig.mlabMetricsSnapshot
                    } 
                },
                {
                    $push: {
                        api: {
                            decideSearchParams
                        }
                    }
                }, function(err, result) {
                    if (err) throw err;
                    console.log('MongoDB updates: ' + result.result.n);
                    db.close();
                }
            );
        });
    });

    // Get details of a business based on Yelp ID
    app.get('/api/details/:id', function (req, res) {
        YELP_CLIENT.business(req.params.id).then(response => {

            console.log('!----------[DETAIL LOOKUP]----------!');
            console.log(' * restId: ' + req.params.id);
            console.log('!----------[DETAIL LOOKUP]----------!');

            res.json(response.jsonBody);
        }).catch(e => {
            console.log(e);
        });
    });

    // Get appeal of a business based on Yelp ID
    app.get('/api/appeal/:id', function (req, res) {
        YELP_CLIENT.business(req.params.id).then(response => {
            var result = response.jsonBody;
            // If no price is returned, assume one dollar sign ($ / $$$$) or 1/4 = 0.25
            // If valid price range, count # of dollar signs
            var resultPrice = isEmpty(result.price) ? 0.25 : ((result.price.split('$').length - 1) / MAX_NUM_DOLLAR_SIGNS);
            var resultReviewCount = isEmpty(result.review_count) ? 0 : result.review_count / MAX_NUM_REVIEWS;
            var resultRating = isEmpty(result.rating) ? 0 : result.rating / MAX_NUM_STARS;
            var resultRestId = getHash(req.params.id);

            // Run neural net analysis and print result
            var output = net.run({ 
                id: resultRestId,
                review_count: resultReviewCount,
                rating: resultRating,
                price: resultPrice
            });

            console.log('!----------[APPEAL LOOKUP]----------!');
            console.log(' * restId: ' + resultRestId);
            console.log(' * appeal: ' + output.appeal);
            console.log('!----------[APPEAL LOOKUP]----------!');

            // Return appeal as percentage
            res.json({'id': resultRestId, 'appeal': parseInt((output.appeal * 100).toFixed(0))});
        }).catch(e => {
            console.log(e);
        });
    });

    // Train brain by rating for a business
    app.get('/api/rate/:id/:reviewCount/:numStars/:numDollarSigns/:appeal/:rating', function (req, res) {
        // If no price is returned, assume one dollar sign ($ / $$$$) or 1/4 = 0.25
        // If valid price range, count # of dollar signs
        var restId = getHash(req.params.id);
        var reviewCount = req.params.reviewCount;
        var numDollarSigns = req.params.numDollarSigns;
        var numStars = req.params.numStars;
        var appeal = req.params.appeal;
        var userRating = req.params.rating;

        numDollarSigns = isEmpty(numDollarSigns) ? 0.25 : (numDollarSigns / MAX_NUM_DOLLAR_SIGNS);
        reviewCount = isEmpty(reviewCount) ? 0 : reviewCount / MAX_NUM_REVIEWS;
        numStars = isEmpty(numStars) ? 0 : numStars / MAX_NUM_STARS;
        appeal = isEmpty(appeal) ? 0 : appeal / 100;
        userRating = (isEmpty(userRating) ? 0 : userRating / MAX_NUM_STARS);

        // Formula for adjusting current appeal based on user input
        //   *Assumption: userRating is a float between 0 and 1
        //   *Assumption: appeal is a float between 0 and 1
        //   *Note: Divisor controls magnitude of rating impact - Higher divisor, lower impact
        var adjAppeal = appeal * (1 + ((userRating - appeal) / 30))
        if (adjAppeal > 1) {
            adjAppeal = 1;
        } else if (adjAppeal < 0) {
            adjAppeal = 0;
        }

        console.log('!----------[RATED]----------!');
        console.log(' * restId: ' + req.params.id);
        console.log(' * restIdHash: ' + restId);
        console.log(' * rating: ' + userRating);
        console.log(' * appeal: ' + appeal);
        console.log(' * adjAppeal: ' + adjAppeal);
        console.log('!----------[RATED]----------!');

        res.json({'id': restId, 'appeal': (adjAppeal * 100).toFixed(0)});        

        // Feed rating info to neural network to train it
        net.train({ 
            input: {
                id: restId,
                review_count: reviewCount,
                rating: numStars,
                price: numDollarSigns
            },
            output: {
                appeal: adjAppeal
            }
        });

        // Save rating info to training database
        mongo.connect(apiConfig.mlabUrl, (err, db) => {
            if (err) throw err;
            var dbo = db.db(apiConfig.mlabDatabase);
            dbo.collection(apiConfig.mlabTrainingCollection).updateOne(
                { 
                    info: {
                        snapshot: apiConfig.mlabTrainingSnapshot
                    } 
                },
                {
                    $push: {
                        data: {
                            input: {
                                id: restId,
                                review_count: reviewCount,
                                rating: numStars,
                                price: numDollarSigns
                            },
                            output: {
                                appeal: adjAppeal
                            }
                        }
                    }
                }, function(err, result) {
                    if (err) throw err;
                    console.log('MongoDB updates: ' + result.result.n);
                    db.close();
                }
            );
        });

        var ratingParams = {
            id: restId,
            review_count: reviewCount,
            rating: numStars,
            userRating: userRating,
            price: numDollarSigns,
            appeal: adjAppeal
        }

        // Log metrics
        ratingParams['ip'] = req.connection.remoteAddress;
        ratingParams['timestamp'] = new Date();
        mongo.connect(apiConfig.mlabUrl, (err, db) => {
            if (err) throw err;
            var dbo = db.db(apiConfig.mlabDatabase);
            dbo.collection(apiConfig.mlabMetricsCollection).updateOne(
                { 
                    info: {
                        snapshot: apiConfig.mlabMetricsSnapshot
                    } 
                },
                {
                    $push: {
                        api: {
                            ratingParams
                        }
                    }
                }, function(err, result) {
                    if (err) throw err;
                    console.log('MongoDB updates: ' + result.result.n);
                    db.close();
                }
            );
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

function getHash(str) {
    var hash = 0;
    if (str.length == 0) return hash;
    for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer08
    }
    hash = '0.' + Math.abs(hash);
    return hash;
}