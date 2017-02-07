/**
 * 
 * @type Module express|Module express
 */
var express = require('express');
/**
 * 
 * @type Module routes|Module routes
 */
var routes = require('./routes');
/**
 * 
 * @type Module http|Module http
 */
var http = require('http');
/**
 * 
 * @type Module path|Module path
 */
var path = require('path');
/**
 * 
 * @type type
 */
var app = express();
/**
 * 
 * @type Module passport|Module passport,'passport-local
 */
var passport = require('passport')
        , LocalStrategy = require('passport-local').Strategy;
app.use(express.static('public'));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({secret: 'keyboard cat'}));
app.use(passport.initialize());
app.use(passport.session());

/**
 * 
 * @type Server
 */
var server = http.createServer(app);
var io = require('socket.io').listen(server);

app.set('port', process.env.VCAP_APP_PORT || 8000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());

app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

/**
 *  Handle Errors gracefully
 */
app.use(function (err, req, res, next) {
    if (!err) {
        return next();
    }
    console.log(err.stack);
    res.json({error: true});
});

/**
 * 
 * @type Module auth|Module auth
 */
var auth = require('./models/auth');
/**
 * Handle Login Post
 */
app.post("/login", function (req, res) {
    auth.authenticate(req.body.username, req.body.password, function (err, user) {
        if (user) {
            req.session.regenerate(function () {
                req.session.user = user;
                res.redirect('#/polls');
            });
        } else {
            req.session.error = 'Authentication failed, please check your ' + ' username and password.';
            return res.render('login', {message: req.session.error})
        }
    });
});

app.get('/confirm-login', function (req, res) {
    //Send User Details on Call
    res.send(req.session.user);
});
/**
 * Handle Logout
 */
app.get('/logout', function (req, res) {
    req.session.destroy(function () {
        res.redirect('/');
    });
});

/**
 * Main App Page
 */
app.get('/', auth.requiredAuthentication, routes.index);
app.get("/login", function (req, res) {
    res.render("login");
});
/**
 * API Routes
 */
app.get('/polls/polls', auth.requiredAuthentication, routes.list);
app.get('/polls/:id', auth.requiredAuthentication, routes.poll);
app.post('/polls', auth.requiredAuthentication, routes.create);
app.post('/vote', auth.requiredAuthentication, routes.vote);

io.sockets.on('connection', function (socket) {
    routes.vote(socket);
    routes.Saved(socket);
});

/**
 * Start Server
 */
server.listen(app.get('port'), function () {
    console.log('Express server listening on port: ' + app.get('port'));
});