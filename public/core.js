var omakase = angular.module('omakase', []);

function mainController($scope, $http) {
    $scope.searchStr = '';
    $scope.location = '';
    $scope.loading = false;

    $scope.getResults = function(searchStr) {
        $scope.loading = true;
        $http.get('/api/search/' + searchStr + '/' +  $scope.location.text + '/20')
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
        $http.get('/api/search/restaurants/' +  $scope.location.text + '/20')
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
        numDollarSigns = typeof(numDollarSigns) == "undefined" ? 1 : numDollarSigns.length;
        $http.get('/api/vote/' + id + '/' + reviewCount + '/' + numStars + '/' + numDollarSigns + '/' + appeal + '/' + rating)
            .success(function(data) {
                console.log('Rated: ' + data.appeal);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            })
    }
}
