/**
 * 
 * @type Routes
 * Angular module, defining routes for the app
 */
angular.module('polls', ['pollServices']).
        config(['$routeProvider', function ($routeProvider) {
                $routeProvider.
                        when('/polls', {templateUrl: 'views/list.html', controller: "PollListCtrl", authenticate: true}).
                        when('/poll/:pollId', {templateUrl: 'views/item.html', controller: "PollItemCtrl", authenticate: true}).
                        when('/new', {templateUrl: 'views/new.html', controller: "PollNewCtrl", authenticate: true}).
                        when('/view/:pollId', {templateUrl: 'views/vote.html', controller: "PollVoteCtrl", authenticate: true}).
                        when('/login', {templateUrl: 'views/login.html', authenticate: false}).
                        when('/logout', {templateUrl: 'views/login.html', authenticate: false}).
                        // If invalid route, just redirect to the main list view
                        otherwise({redirectTo: '/'});
            }]);