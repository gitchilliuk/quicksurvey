/**
 * Angular service module for connecting to JSON APIs
 * encapsulate socket in a service and inject it into Angular controllers as needed.
 */
angular.module('pollServices', ['ngResource']).
        factory('Poll', function ($resource) {
            return $resource('polls/:pollId', {}, {
                // Use this method for getting a list of polls
                query: {method: 'GET', params: {pollId: 'polls'}, isArray: true}
            });
        }).
        factory('socket', function ($rootScope) {
            var socket = io.connect();
            return {
                on: function (eventName, callback) {
                    socket.on(eventName, function () {
                        var args = arguments;
                        $rootScope.$apply(function () {
                            callback.apply(socket, args);
                        });
                    });
                },
                emit: function (eventName, data, callback) {
                    socket.emit(eventName, data, function () {
                        var args = arguments;
                        $rootScope.$apply(function () {
                            if (callback) {
                                callback.apply(socket, args);
                            }
                        });
                    });
                }
            };
        })
        .directive('goLocation', function ($location) {
            return function (scope, element, attrs) {
                var path;

                attrs.$observe('goLocation', function (val) {
                    path = val;
                });

                element.bind('click', function () {
                    scope.$apply(function () {
                        $location.path(path);
                    });
                });
            };
        });        