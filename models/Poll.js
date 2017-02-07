var PollModel = function () {
    var pg = require('pg');
    //var conString = "postgres://web:mati7069@192.168.20.192:6432/kctest";
    var conString = "postgres://postgres:root@127.0.0.1:5432/quick_poll";
    var pgclient = new pg.Client(conString);
    pgclient.connect(function (err) {
        if (err) {
            return console.error('could not connect to postgres', err);
        }
    });
    return pgclient;
}
module.exports = PollModel;
