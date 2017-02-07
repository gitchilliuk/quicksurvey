var pg_client = require("./Poll")();
module.exports = {
    authenticate: function (username, password, fn) {
        if (!module.parent) {
            console.log('authenticating %s:%s', username, password);
        }
        var role = (-1 !== username.toLowerCase().indexOf('tec') ? 'teacher' : 'student');
        var SQL = '';
        if (role === 'teacher') {
            SQL = "\
            SELECT \n\
                id,\n\
                teacherfirst as firstname, \n\
                teacherlast as lastname,\n\
                id as classid, \n\
                login as username,\n\
                'teacher' as role \n\
            FROM \n\
                class \n\
            WHERE \n\
                lower(login)='" + username.toLowerCase() + "' AND\n\
                password='" + password + "'\n\
            ";
        } else {
            SQL = "\
            SELECT \n\
                s.*,\n\
                ms.uid as username,\n\
                'student' as role \n\
            FROM \n\
                masterstudent ms \n\
            INNER JOIN \n\
                student s \n\
            ON (s.masterstudentid=ms.id)  \n\
            WHERE \n\
                lower(ms.uid)='" + username.toLowerCase() + "' AND \n\
                (ms.password='" + password + "' OR EXISTS(SELECT 1 FROM school sc WHERE lower(sc.login)='" + password.toLowerCase() + "' AND sc.id=ms.schoolid)) AND \n\
                s.active is TRUE AND \n\
                classid IS NOT NULL\n\
            ";
        }
        pg_client.query(SQL, function (err, result) {
            if (err) {
                return fn(new Error('cannot find user'));
            }
            if (!result.rows[0]) {
                return fn(new Error('cannot find user'));
            }
            return fn(err, result.rows[0]);
        });

    },
    requiredAuthentication: function (req, res, next) {
        if (req.session.user) {
            next();
        } else {
            req.session.error = 'Access denied!';
            res.redirect('/login');
        }
    },
    userExist: function (req, res, next) {
        User.count({
            username: req.body.username
        }, function (err, count) {
            if (count === 0) {
                next();
            } else {
                req.session.error = "User Exist"
                res.redirect("/signup");
            }
        });
    }
}