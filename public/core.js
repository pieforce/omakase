var omakase = angular.module('omakase', []);

function mainController($scope, $http) {
    $scope.searchStr = '';
    $scope.location = '';
    $scope.loading = false;

    $scope.getResults = function(searchStr) {
        $scope.loading = true;
        $http.get('/api/search/' + searchStr + '/' +  $scope.location.text + '/30')
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
        $http.get('/api/search/restaurants/' +  $scope.location.text + '/30')
            .success(function(data) {
                $scope.results = data;
                $scope.loading = false;
            })
            .error(function(data) {
                console.log('Error: ' + data);
                $scope.loading = false;
            })
    }

    

    $scope.getTopRestaurantResult = function() {
        $scope.loading = true;
        $http.get('/api/search/restaurants/' +  $scope.location.text + '/1')
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

    $scope.rate = function(id, reviewCount, numStars, numDollarSigns, appeal, rating) {
        // Update stars to reflect user rating
        for (var i=1; i <= rating; i++) {
            document.getElementsByName(id + '-' + i)[0].setAttribute('class', 'btn btn-danger btn-sm');
        }
        // Disable rating star buttons
        const NUM_OF_STARS = 5;
        for (var i=1; i <= NUM_OF_STARS; i++) {
            document.getElementsByName(id + '-' + i)[0].setAttribute('disabled', 'true');
        }
        

        numDollarSigns = typeof(numDollarSigns) == "undefined" ? 1 : numDollarSigns.length;
        $http.get('/api/vote/' + id + '/' + reviewCount + '/' + numStars + '/' + numDollarSigns + '/' + appeal + '/' + rating)
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
