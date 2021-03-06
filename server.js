var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mysql = require('mysql');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var cookieParser = require('cookie-parser')

var urlencodedParser = bodyParser.urlencoded({ extended: false })

var db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "yoursolution",
  database: "smart_attendance"
});

app.use(express.static(__dirname + '/public'));
app.use(cookieParser());

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

//WEB
app.get('/', function (req, res) {
    if (req.cookies.teacher_ID != null) {
        res.sendFile( __dirname + "/html/" + "index.html" );
    } else {
        res.clearCookie("teacher_ID")
        .clearCookie("name")
        .sendFile( __dirname + "/html/" + "login.html" );
    }
})

app.post('/webLogin',urlencodedParser,function(req,res){
    var teacher_ID = req.body.teacher_ID;
    var password = req.body.password;
    var sql = 'SELECT * FROM Teachers WHERE teacher_ID = ? AND password = ?';
    console.log(req.body)
    db.query(sql, [ teacher_ID , password ] ,function (err,results) {
        if (results[0] != null ) {
            res.cookie("teacher_ID",teacher_ID)
            .cookie("name",results[0].name)
            .sendFile( __dirname + "/html/" + "index.html" )

        } else {
            res.sendFile( __dirname + "/html/" + "login.html" );
        }
    })
})

app.post('/webSignup',urlencodedParser,function(req,res){
    var name = req.body.name,
        teacher_ID = req.body.teacher_ID,
        password = req.body.password;
    var sql = 'SELECT * FROM Teachers WHERE teacher_ID = ?';
    db.query(sql, [teacher_ID] ,function (err,results) {
        if (results[0] != null ) {
            res.end("OK")
        } else {
            res.end("ERROR");
        }
    })
})

app.get('/weblogout', function (req, res) {
    res.clearCookie("teacher_ID")
    .clearCookie("name")
    .clearCookie("student_ID")
    .sendFile( __dirname + "/html/" + "login.html" );
})

app.get('/home', function (req, res) {
    var teacher_ID = req.cookies.teacher_ID
    //console.log("/home :"+teacher_ID)
    if (teacher_ID != null) {
        res.sendFile( __dirname + "/html/" + "index.html" );
    } else {
        res.clearCookie("teacher_ID")
        .clearCookie("name")
        .sendFile( __dirname + "/html/" + "login.html" );
    }
})

app.get('/class', function (req, res) {
    var teacher_ID = req.cookies.teacher_ID;
    //console.log("/class :"+teacher_ID)
    if (teacher_ID != null) {
        res.sendFile( __dirname + "/html/" + "class.html" );
    } else {
        res.clearCookie("teacher_ID")
        .clearCookie("name")
        .sendFile( __dirname + "/html/" + "login.html" );
    }
})

app.get('/students*', function (req, res) {
    var teacher_ID = req.cookies.teacher_ID,
        room_ID    = (req.url).split("/")[2];
    //console.log("/students/room* :",teacher_ID,room_ID)
    if (teacher_ID != "") {
        res.cookie("room_ID",room_ID)
        .sendFile( __dirname + "/html/" + "students.html" );
    } else {
        res.clearCookie("teacher_ID")
        .clearCookie("name")
        .sendFile( __dirname + "/html/" + "login.html" );
    }
})

app.get('/attendance/*', function (req, res) {
    var teacher_ID = req.cookies.teacher_ID,
        student_ID    = (req.url).split("/")[2];
    //console.log("/students/room* :",teacher_ID,student_ID)
    if (teacher_ID != "") {
        res.cookie("student_ID",student_ID)
        .sendFile( __dirname + "/html/" + "attendance.html" );
    } else {
        res.clearCookie("teacher_ID")
        .clearCookie("name")
        .sendFile( __dirname + "/html/" + "login.html" );
    }})

//GET THINGS FROM WEB
app.post('/getRooms',urlencodedParser,function (req,res) {
    //console.log("/getRooms: ",req.body.teacher_ID,req.body.room_ID)
    var cmd = "SELECT room_ID,major,minor FROM Rooms WHERE teacher_ID = "+req.body.teacher_ID
        db.query(cmd,function(err,results){
            if (err) throw err;
            var array = []
            for (var i = 0; i < results.length; i++) {
                array.push(results[i]);
            }
            //console.log(array)
            res.end(JSON.stringify(array))
        })
})

app.post('/getStudents',urlencodedParser,function (req,res) {
    //console.log("/getStudents: ",req.body.teacher_ID,req.body.room_ID)
    var sql = "SELECT s.student_ID AS student_ID, s.name AS name \
        FROM Students AS s\
        JOIN Students_Teachers AS ST ON (s.student_ID = ST.student_ID)",
        join = "JOIN Students_Rooms AS SR ON (s.student_ID = SR.student_ID)"
        where = " WHERE ST.teacher_ID = ?",
        room = " AND SR.room_ID = ?",
        order = " ORDER BY student_ID",
        values = [parseInt(req.cookies.teacher_ID)]

        if(req.cookies.room_ID != "undefined"){
            //console.log("!= null")
            sql = sql+join+where+room+order;
            values.push(req.cookies.room_ID);
        } else {
            //console.log("== null")
            sql = sql+where+order;
        }
        db.query(sql,values,function(err,results){
            if (err) throw err;
            array = []
            for (var i = 0; i < results.length; i++) {
                array.push(results[i])
            }
            res.end(JSON.stringify(array))
        });
})

app.post('/getAttendance',urlencodedParser,function (req,res){
    var student_ID  =   parseInt(req.body.student_ID),
        start       =   parseInt(req.body.start),
        end         =   parseInt(req.body.end);
        room_ID     =   req.cookies.room_ID;
    var sql = "SELECT a.time AS time, r.room_ID AS room \
    FROM Attendance AS a\
    JOIN Rooms AS r ON (a.major = r.major AND a.minor = r.minor)\
    WHERE a.student_ID = ?\
    AND a.time > ?\
    AND a.time < ?",
    room = " AND r.room_ID = ?",
    order = " ORDER BY time",
    values = [student_ID,start,end]
    if(room_ID != null){
        //console.log("!= undefined")
        sql = sql+room+order;
        values.push(room_ID)
    } else {
        //console.log("== undefined")
        sql = sql+order
    }
    //console.log(sql)
    //console.log(values)
    db.query(sql,values,function(err,results){
        if (err) throw err;
        var span    = parseInt(req.body.start),
            array = [],
            dateArray = [];
        for (var i = 0; i < 7; i++) {
            dateArray.push(dateFormat(span));
            span += 86400000;            
        }
        if(results[0] != null){    
            var date    = new Date(parseInt(results[0].time)),
                day     = date.getDay(),
                start   = date.getTime(),
                end     = date.getTime(),
                room    = results[0].room;
                // console.log(end)
            for (var i = 1; i < results.length; i++) {
                var d = new Date(parseInt(results[i].time)),
                    r = results[i].room;
                // console.log(d.getDay())
                if((d.getDay() == day) && (r == room) && ((d.getTime() - end) < 900000)){
                    end = parseInt(results[i].time)
                    // console.log("true")
                    if (results[i+1] == null && end - start > 900000) {
                        // console.log("null")
                        var json = {
                            day     : day,
                            start   : timeFormat(start),
                            end     : timeFormat(end),
                            room    : room,
                        }
                        // console.log(json)
                        array.push(json)
                    }
                } else {
                    if (end - start > 900000) {
                        var json = {
                            day     : day,
                            start   : timeFormat(start),
                            end     : timeFormat(end),
                            room    : room,
                        }
                        array.push(json)
                    }
                    day     = d.getDay(),
                    room    = r,
                    start   = d.getTime(),
                    end     = d.getTime() 
                }
            }
            // console.log(array)
            res.end(JSON.stringify({
                span : JSON.stringify(dateArray),
                event: JSON.stringify(array)
            }))
        } else {
            res.end(JSON.stringify({
                span : JSON.stringify(dateArray),
                event: JSON.stringify(array)
            }))
        }
    });
})

app.post('/getInfo',urlencodedParser,function (req,res){
    var sql = "SELECT name FROM Students WHERE student_ID = ?",
        student_ID = req.body.student_ID;
    db.query(sql,[student_ID],function (err,results) {
        if(err) throw err;
        res.end(JSON.stringify({
            id:student_ID,
            name:results[0].name
        }))
    })
})
//APP
app.post('/applogin',urlencodedParser,function(req,res){
    var student_ID = req.body.username;
    var password = req.body.password;
    var sql = 'SELECT * FROM Students WHERE student_ID = ? AND password = ?';
    db.query(sql, [ student_ID , password ] ,function (err,results) {
        if(err) throw err;
        if (results[0] != null ) {
            var data = {status:"OK"}
            res.end(JSON.stringify(data))
        } else {
            var data = {status:"ERROR"}
            res.end(JSON.stringify(data))
        }
    })
})

app.post('/appsignup',urlencodedParser,function(req,res){
    console.log(req.body)
    var name = req.body.name;
    var student_ID = parseInt(req.body.username);
    var password = req.body.password;
    var sql = 'SELECT * FROM Students WHERE student_ID = ?';
    db.query(sql, [student_ID] ,function (err,results) {
        if(err) throw err;
        if (results[0] == null ) {
            var data = {status:"OK"}
            var sql = 'INSERT INTO Students (name,student_ID,password) VALUES ?'
            db.query(sql,[[[name,student_ID,password]]],function(err,results){
                if (err) throw err
            })
            res.end(JSON.stringify(data))
        } else {
            var data = {status:"ERROR"}
            res.end(JSON.stringify(data))
        }
    })
})

app.post('/app',urlencodedParser, function (req, res) {
    var data = req.body
    var date = new Date()
    var time = date.getTime()
    var student_ID = parseInt(data.student_ID)
    var major = parseInt(data.major)
    var minor = parseInt(data.minor)
    var rssi = parseInt(data.rssi)
    var resTime = timeFormat(time)
    console.log(resTime,student_ID,major,minor,rssi)

    var a = [
        [ time, student_ID , major, minor, rssi]
    ];

    var sql = "SELECT room_ID FROM Rooms WHERE major = ? AND minor = ?"
    db.query(sql,[data.major,data.minor],function(err,results){
        if (err) throw err;
        if (results[0] != null){
            res.end(JSON.stringify({
		time: resTime,
		room: results[0].room_ID
        }))
            sql = "INSERT INTO Attendance (time,student_ID,major,minor,rssi) VALUES ?"
            db.query(sql,[a],
            function(err,results){
                if (err) throw err;
            });
        }
    })
})

http.listen(8800, function() {
    //console.log('listening on *:8800');
});

function timeFormat(timeStamp){
    var ret = new Date(timeStamp)

    var hours = ret.getHours();
    hours =  hours < 10 ? '0'+ hours: hours.toString();
    var minutes = ret.getMinutes();
    minutes =  minutes < 10 ? '0'+ minutes: minutes.toString();

    ret = hours+":"+minutes;
    return ret;
}

function dateFormat(timeStamp){
    var ret = new Date(timeStamp)

    var date = ret.getDate();
    date =  date < 10 ? '0'+ date: date.toString();
    var month = ret.getMonth();
    month =  month < 9 ? '0'+ (month+1): month.toString();

    ret = date+"/"+month;
    return ret;
}

// function makeid() {
//     var text = "";
//     var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
//     for (var i = 0; i < 5; i++){
//         text += possible.charAt(Math.floor(Math.random() * possible.length));
//         for (const key in userCookies) {
//             if (text == userCookies[key]) {
//                 text = "";
//                 i = 0;
//                 break;
//             }
//         }
//     }
    
//     return text;
//   }
