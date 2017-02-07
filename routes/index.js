var pgclient = require("../models/Poll")();
//var PollSchema = require('../models/Poll.js').PollSchema;
var Poll = pgclient;
var sessionvar = {};
var Response = null;
// Main application view
exports.index = function (req, res) {
    if (req.session.user) {
        res.render('index');
    } else {
        res.redirect('/login');
    }
    Response = res;
};

// JSON API for list of polls
exports.list = function (req, res) {
    var classid = '0';
    if (req.session.user) {
        sessionvar = req.session.user;
        classid = req.session.user.classid;
        var SQL = "SELECT \n\
                        q.id as _id,\n\
                        q.question, \n\
                        '" + (req.session.user.role == 'student' ? 0 : 1) + "' as showit,\n\
                        count(DISTINCT qsa.studentid) AS totalvoted,\n\
                        sum((CASE WHEN qsa.studentid=" + req.session.user.id + " THEN 1 ELSE 0 END))>0 as studentvoted \n\
                    FROM \n\
                        node_qp_questions q,\n\
                        node_qp_answers qa,\n\
                        node_qp_studentanswers qsa \n\
                    WHERE \n\
                        q.id=qa.questionid AND \n\
                        qa.questionid=qsa.questionid AND \n\
                        q.classid = " + classid + " \n\
                    GROUP BY \n\
                        _id,\n\
                        q.question,\n\
                        showit";
        pgclient.query(SQL, function (err, result) {
            if (err) {
                return console.error('Error running query Getting Question: (index.js)' + SQL, err);
            }
            res.json(result.rows);
        });


    } else {
        res.redirect('/login');
    }
};
exports.Saved = function (socket) {

    socket.on('send:Saved', function (data) {
        if (sessionvar.role === 'student') {
            var SQL = "\
                SELECT \n\
                            ms.id \n\
                       FROM \n\
                            masterstudent ms \n\
                       INNER JOIN \n\
                            student s \n\
                       ON (s.masterstudentid=ms.id) \n\
                       WHERE \n\
                        s.classid =" + data.classid + " AND \n\
                        ms.id='" + sessionvar.id + "'\n\
                ";
            pgclient.query(SQL, function (err, result) {
                if (err) {
                    return console.error('Error running query Getting master student ids in class: (index.js)' + SQL, err);
                }
                if (result.rows.length > 0) {
                    socket.broadcast.emit('Saved', {usertype: sessionvar.role, usrid: sessionvar.id});
                }
            });
        }


    });
};
// JSON API for getting a single poll
exports.poll = function (req, res) {
    if (req.session.user) {
        // Poll ID comes in the URL
        var pollId = req.params.id;
        var poll = {}, userVoted = 0, totalVotes = 0, userChoice = {};

        // Find the poll by its ID, use lean as we won't be changing it
        var SQL = "\
            SELECT \n\
                ans.ansid as _id,\n\
                ans.answer as text,\n\
                (select count(*) FROM node_qp_studentanswers WHERE ansid=ans.ansid AND questionid='" + pollId + "') as votes \n\
            FROM \n\
                node_qp_answers ans  \n\
            WHERE \n\
                ans.questionid=" + pollId + " \n\
            GROUP BY \n\
                ans.ansid,ans.answer \n\
            ORDER BY ans.ansid";
        pgclient.query(SQL, function (errorobj, ansresult) {
            if (errorobj) {
                return console.error('error running query (index.js):' + SQL, errorobj);
            }
            poll.choices = ansresult.rows;

        });
        var SQL = "SELECT \n\
                        q.id as questionid,\n\
                        q.question,\n\
                        ans.ansid,\n\
                        ans.answer,\n\
                        count(stdans.id) as anscount \n\
                    FROM \n\
                        node_qp_questions q \n\
                    INNER JOIN node_qp_answers ans \n\
                        ON(q.id=ans.questionid) \n\
                    LEFT JOIN node_qp_studentanswers stdans \n\
                        ON(stdans.ansid=ans.ansid AND stdans.questionid=ans.questionid) \n\
                    WHERE \n\
                        q.id=" + pollId + " \n\
                    GROUP BY \n\
                        ans.ansid, \n\
                        q.id,q.question, \n\
                        ans.ansid, \n\
                        ans.answer \n\
                    ORDER BY \n\
                        ans.ansid \n\
                    ASC";
        pgclient.query(SQL, function (err, result) {
            if (err) {
                return console.error('error running query (index.js):' + SQL, err);
            }
            for (i = 0; i < result.rows.length; i++) {
                anscount = Number(result.rows[i].anscount);
                totalVotes += anscount;
                userChoice = {_id: result.rows[i].ansid, text: result.rows[i].answer};
                poll._id = result.rows[i].questionid;
                poll.question = result.rows[i].question;
            }

            poll.userVoted = true;
            poll.userChoice = userChoice;
            poll.totalVotes = totalVotes;
            res.json(poll);

        });
    } else {
        res.redirect('/login');
    }
};

// JSON API for creating a new poll
exports.create = function (req, res) {
    if (req.session.user.role !== 'student') {
        var reqBody = req.body,
                // Filter out choices with empty text
                choices = reqBody.choices.filter(function (v) {
                    return v.text !== '';
                }),
                // Build up poll object to save
                pollObj = {question: reqBody.question, choices: choices};
        // Create poll model from built up poll object
        //var poll = new Poll(pollObj);
        var insSQL = "INSERT INTO node_qp_questions (question,classid) VALUES('" + reqBody.question + "','" + req.session.user.classid + "') returning id";
        pgclient.query(insSQL, function (errObj, resRet) {
            if (errObj) {
                return console.error('error running query (index.js):' + insSQL, errObj);
            }
            newQuesID = resRet.rows[0].id;
            for (i = 0; i < choices.length; i++) {
                var insSQL = "INSERT INTO node_qp_answers (questionid,answer) VALUES('" + newQuesID + "','" + choices[i].text + "')";
                pgclient.query(insSQL, function (errObj1, resRet1) {
                    if (errObj1) {
                        return console.error('error running query (index.js):' + insSQL, errObj1);
                    }

                });
            }
        });
        res.json({success: true, classid: req.session.user.classid});
    } else {
        res.write("Student cannot create!");
        res.redirect('/#/polls');
    }


};

exports.vote = function (socket) {
    if (sessionvar.role === 'student') {
        var bUserVoted = false;
        socket.on('send:vote', function (data) {
            var ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address;
            var SQL = "SELECT * FROM node_qp_studentanswers WHERE questionid='" + data.poll_id + "' AND studentid=" + sessionvar.id + "";
            pgclient.query(SQL, function (errObj, resRet0) {
                if (errObj) {
                    return console.error('error running query (index.js):' + SQL, errObj);
                }
                if (resRet0.rows.length > 0) {
                    bUserVoted = true;
                }
            });
            if (!bUserVoted) {
                var totalVotes = 0;
                var theDoc = {
                    question: data.question, _id: data.poll_id, choices: data.choices,
                    userVoted: false, totalVotes: 0
                };
                var insSQL = "INSERT INTO node_qp_studentanswers (ansid,questionid,studentid) VALUES('" + data.choice + "','" + data.poll_id + "'," + sessionvar.id + ")";
                pgclient.query(insSQL, function (errObj, resRet) {
                    if (errObj) {
                        return console.error('error running query (index.js):' + insSQL, errObj);
                    }
                });
                var SQL = "SELECT q.id as questionid,q.question,ans.ansid as _id,ans.answer as text,count(stdans.ansid) as anscount,count(stdans.ansid) as votes FROM node_qp_questions q INNER JOIN node_qp_answers ans ON(q.id=ans.questionid) LEFT JOIN node_qp_studentanswers stdans ON (ans.ansid=stdans.ansid AND ans.questionid=ans.questionid) WHERE q.id=" + data.poll_id /*+(sessionvar?(sessionvar.role=='student'?" AND stdans.studentid="+sessionvar.id:""):"")*/ + " GROUP BY stdans.ansid, q.id,q.question, ans.ansid, ans.answer ORDER BY ans.ansid ASC";
                pgclient.query(SQL, function (err, result) {
                    if (err) {
                        return console.error('error running query (index.js):' + SQL, err);
                    }
                    for (i = 0; i < result.rows.length; i++) {
                        anscount = Number(result.rows[i].anscount);
                        totalVotes += anscount;
                        userVoted = true;
                        theDoc.totalVotes = totalVotes;
                        theDoc.userVoted = userVoted;
                    }
                    theDoc.choices = result.rows;
                    socket.broadcast.emit('vote', theDoc);
                    socket.broadcast.emit('myvote', theDoc);


                });
            } else {
                console.log("Student Already Voted.");
            }
        });
    } 
};
