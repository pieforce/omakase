var omakase = angular.module('omakase', []);

function mainController($scope, $http) {    
    const NUM_OF_STARS = 5;  
    const NUM_OF_RESULTS = 30;
    $scope.searchStr = '';
    $scope.location = '';
    $scope.accuracy = '';
    $scope.loading = false;
    $scope.showLocationEntry = false;
    $scope.showAccuracy = false;

    $scope.toggleLocationEntry = function() {
        $scope.showLocationEntry = !$scope.showLocationEntry;
    }

    $scope.getLocation = function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(pos) {
                var latitude = pos.coords.latitude;
                var longitude = pos.coords.longitude;
                var accuracy = pos.coords.accuracy;
                $scope.showAccuracy = true;
                $scope.location.text = latitude + ', ' + longitude;
                document.getElementById('accuracy').textContent = 'Geoloc accuracy: ' + (accuracy * 0.00062137).toFixed(2) + ' mi';
                document.getElementById('location').value = latitude + ', ' + longitude;
            }, function(err) {
                console.log('Geolocation error: ' + err);
            }, {
                enableHighAccuracy: true, 
                timeout: 30000, 
                maximumAge: 10000
            });
        } else {
            alert('Geolocation is not supported by this browser');
        }
    }

    $scope.getResults = function(searchStr) {
        $scope.loading = true;
        $http.get('/api/search/' + searchStr + '/' +  $scope.location.text + '/' + NUM_OF_RESULTS)
            .success(function(data) {
                $scope.results = data;
                $scope.loading = false;
            })
            .error(function(data) {
                console.log('Error: ' + data);
                $scope.loading = false;
            })
    }

    $scope.getBestRestaurant = function() {
        $scope.loading = true;
        $http.get('/api/decide/restaurants/' + $scope.location.text)
            .success(function(data) {
                $scope.results = data;
                $scope.loading = false;
            })
            .error(function(data) {
                console.log('Error: ' + data);
                $scope.loading = false;
            })
    }

    $scope.getRestaurantResults = function() {
        $scope.loading = true;
        $http.get('/api/search/restaurants/' +  $scope.location.text + '/' + NUM_OF_RESULTS)
            .success(function(data) {
                $scope.results = data;
                $scope.loading = false;
            })
            .error(function(data) {
                console.log('Error: ' + data);
                $scope.loading = false;
            })
    }

    $scope.getAddtlPhotos = function(id) {
        $http.get('/api/details/' +  id)
            .success(function(data) {
                $scope.photos = data;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            })
    }

    $scope.updateUserRating = function(id, rating) {
        // Update stars to reflect user rating
        for (var i=1; i <= NUM_OF_STARS; i++) {
            if (i <= rating) {
                document.getElementsByName(id + '-' + i)[0].setAttribute('class', 'btn btn-danger btn-sm');
            } else {
                document.getElementsByName(id + '-' + i)[0].setAttribute('class', 'btn btn-outline-danger btn-sm');
            }
        }
    }

    $scope.submitRating = function(id, reviewCount, numStars, numDollarSigns, appeal) {
        // Get number of stars
        var rating = document.querySelectorAll('.rating-form-' + id + ' > [class="btn btn-danger btn-sm"]').length;
        if (rating <= 0 || rating > 5) {
            return;
        }

        // Hide submit link
        document.getElementsByName('rating-submit-' + id)[0].setAttribute('style', 'display:none');

        // Disable rating star buttons
        for (var i=1; i <= NUM_OF_STARS; i++) {
            document.getElementsByName(id + '-' + i)[0].setAttribute('disabled', 'true');
        }

        // Submit rating
        numDollarSigns = typeof(numDollarSigns) == "undefined" ? 1 : numDollarSigns.length;
        $http.get('/api/rate/' + id + '/' + reviewCount + '/' + numStars + '/' + numDollarSigns + '/' + appeal + '/' + rating)
            .success(function(data) {
                console.log('Rated: ' + data.appeal);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            })
    }

    $scope.hideFormByRestId = function(id) {
        document.getElementsByClassName('rating-form-' + id)[0].setAttribute('style', 'display:none');
    }
}
