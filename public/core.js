var omakase = angular.module('omakase', []);

function mainController($scope, $http) {
    $scope.searchStr = '';
    $scope.location = '';

    // when landing on the page, get all todos and show them
    $scope.initResults = function() {
        $http.get('/api/results/restaurants/irvine')
            .success(function(data) {
                $scope.results = data;
                console.log(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    }

    $scope.getResults = function() {
        console.log($scope.searchStr);
        $http.get('/api/results/restaurants/' +  $scope.location.text)
            .success(function(data) {
                $scope.results = data;
                console.log(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    }

}
