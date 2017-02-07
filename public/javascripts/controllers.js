/**
 * 
 * @param object $scope An object that refers to the application model
 * @param object $routeParams service allows you to retrieve the current set of route parameters
 * @param object socket Socket.IO enables real-time bidirectional event-based communication.
 * @param object Poll
 * @param object $http The $http service is a core Angular service that facilitates communication with the remote HTTP servers via the browser's 
 *                     XMLHttpRequest object or via JSONP
 * @returns {undefined}
 */
var timeoutId;
var msg = "";
var oldTitle = document.title;
function blink(msg) {
    document.title = document.title == msg ? ' ' : msg;
}
function clear() {
    clearInterval(timeoutId);
    document.title = oldTitle;
    window.onmousemove = null;
    timeoutId = null;
}
/**
 * Controller for the poll list
 * @param object $scope An object that refers to the application model
 * @param object $routeParams service allows you to retrieve the current set of route parameters
 * @param object socket Socket.IO enables real-time bidirectional event-based communication.
 * @param object Poll
 * @returns {undefined}
 */
function PollListCtrl($scope, $rootScope, socket, Poll, $http) {
    if (!$rootScope.user) {
        $http.get("/confirm-login").success(function (data) {
            $rootScope.user = data; //Get User Data
        });
    }
    $scope.polls = Poll.query();
    socket.on('Saved', function (data) {
        //alert("Called");
        $scope.polls = Poll.query();
        $('#newpoll1').show().bind('mouseover', function () {
            $('#newpoll1').slideUp('slow');
            $('#newpoll2').fadeOut('slow');
        });
        $('#newpoll2').show().bind('mouseover', function () {
            $('#newpoll1').slideUp('slow');
            $('#newpoll2').fadeOut('slow');
        });
        if (!timeoutId) {
            timeoutId = setInterval(function () {
                blink("A new poll has been just introduced by a teacher.")
            }, 1000);
            window.onmousemove = clear;
        }
    });
    //When teacher is on list page
    socket.on('vote', function () {
        $scope.polls = Poll.query();
    });
}

/**
 * Controller for an individual poll
 * @param object $scope An object that refers to the application model
 * @param object $routeParams service allows you to retrieve the current set of route parameters
 * @param object socket Socket.IO enables real-time bidirectional event-based communication.
 * @param object Poll The Main Application Object
 * @param object $location The $location service parses the URL in the browser address bar (based on the window.location) and makes the URL 
 *                         available to your application.
 * @param object $timeout
 * @returns {undefined}
 */
function PollItemCtrl($scope, $routeParams, socket, Poll, $location, $timeout) {
    $scope.poll = Poll.get({pollId: $routeParams.pollId});
    socket.on('myvote', function (data) {
        if (data._id === $routeParams.pollId) {
            $scope.poll = data;
        }
    });

    socket.on('vote', function (data) {
        if (data._id === $routeParams.pollId) {
            $scope.poll.choices = data.choices;
            $scope.poll.totalVotes = data.totalVotes;
        }
    });

    $scope.vote = function () {
        var pollId = $scope.poll._id,
                choiceId = $scope.poll.userVote;
        questiontext = $scope.poll.question;
        allchoices = $scope.poll.choices;
        if (!choiceId) {
            alert('You must select an option to vote for');
        } else {
            var voteObj = {poll_id: pollId, choice: choiceId, question: questiontext, choices: allchoices};
            socket.emit('send:vote', voteObj);
            alert("Thanks for your opinion.");
            //$timeout(function () {
            $location.path('/view/' + $scope.poll._id);
            //}, 1000);

        }
    };
}


/**
 * 
 * @param object $scope An object that refers to the application model
 * @param object $routeParams service allows you to retrieve the current set of route parameters.
 * @param object socket Socket.IO enables real-time bidirectional event-based communication.
 * @param object Poll The Main Application Object
 * @returns {undefined}
 */
function PollVoteCtrl($scope, $routeParams, socket, Poll) {
    $scope.poll = Poll.get({pollId: $routeParams.pollId});
    //alert($routeParams.pollId);
    socket.on('myvote', function (data) {
        console.dir(data);
        if (data._id == $routeParams.pollId) {
            $scope.poll = data;
        }
    });

    socket.on('vote', function (data) {

        console.dir(data);
        if (data._id == $routeParams.pollId) {
            console.dir(data.choices);
            $scope.poll.choices = data.choices;
            $scope.poll.totalVotes = data.totalVotes;
        }
    });

    $scope.vote = function () {
        var pollId = $scope.poll._id,
                choiceId = $scope.poll.userVote;
        questiontext = $scope.poll.question;
        allchoices = $scope.poll.choices;

    };
}

// Controller for creating a new poll
/**
 * 
 * @param object $scope An object that refers to the application model
 * @param object $location The $location service parses the URL in the browser address bar (based on the window.location) and makes the URL 
 *                         available to your application.
 * @param object socket Socket.IO enables real-time bidirectional event-based communication.
 * @param object Poll The Main Application Object
 * @returns {undefined}
 */
function PollNewCtrl($scope, $location, socket, Poll) {
    // Define an empty poll model object
    $scope.poll = {
        question: '',
        choices: [
            {text: ''},
            {text: ''},
            {text: ''},
            {text: ''}
        ]
    };

    // Method to add an additional choice option
    $scope.addChoice = function () {
        $scope.poll.choices.push({text: ''});
    };

    // Validate and save the new poll to the database
    $scope.createPoll = function () {
        var poll = $scope.poll;

        // Check that a question was provided
        if (poll.question.length > 0) {
            var choiceCount = 0;

            // Loop through the choices, make sure at least two provided
            for (var i = 0, ln = poll.choices.length; i < ln; i++) {
                var choice = poll.choices[i];

                if (choice.text.length > 0) {
                    choiceCount++
                }
            }

            if (choiceCount > 1) {
                // Create a new poll from the model
                var newPoll = new Poll(poll);
                // Call API to save poll to the database
                newPoll.$save(function (p, resp) {
                    if (!p.error) {
                        // If there is no error, redirect to the main view
                        socket.emit('send:Saved', p);
                        //alert("Response."+p.classid);


                        $location.path('polls');
                    } else {
                        alert('Could not create poll.....' + p.error);
                    }
                });
            } else {
                alert('You must enter at least two choices');
            }
        } else {
            alert('You must enter a question');
        }
    };
}