var omakase = angular.module('omakase', []);

function mainController($scope, $http) {
    $scope.searchStr = '';
    $scope.location = '';
    $scope.loading = false;

    $scope.getResults = function(searchStr) {
        console.log($scope.searchStr);
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
        console.log($scope.searchStr);
        $http.get('/api/details/' +  id)
            .success(function(data) {
                $scope.photos = data;
                $scope.loading = false;
            })
            .error(function(data) {
                console.log('Error: ' + data);
                $scope.loading = false;
            })
    }

}
