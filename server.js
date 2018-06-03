var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mysql = require('mysql');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var cookieParser = require('cookie-parser')
var userCookies = {}

var urlencodedParser = bodyParser.urlencoded({ extended: false })

var db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "yoursolution",
  database: "smart_attendance"
});

app.use(express.static(__dirname + '/public'));
app.use(cookieParser());

app.get('/', function (req, res) {
    if (req.cookies.remember == userCookies[req.cookies.teacher_ID]) {
        res.sendFile( __dirname + "/html/" + "index.html" );
    } else {
        res.clearCookie("teacher_ID")
        .clearCookie("name")
        .clearCookie("remember")
        .sendFile( __dirname + "/html/" + "login.html" );
    }
})

app.post('/weblogin',urlencodedParser,function(req,res){
    var teacher_ID = req.body.teacher_ID;
    var password = req.body.password;
    if (req.body.remember =="on" ) {
        userCookies[teacher_ID] = makeid();
    }
    var sql = 'SELECT * FROM Teachers WHERE teacher_ID = ? AND password = ?';
    db.query(sql, [ teacher_ID , password ] ,function (err,results) {
        if (results[0] != null ) {
            res.cookie("teacher_ID",teacher_ID)
            .cookie("name",results[0].name)
            .cookie("remember",userCookies[teacher_ID])
            .sendFile( __dirname + "/html/" + "index.html" )

        } else {
            res.sendFile( __dirname + "/html/" + "login.html" );
        }
    })
})

app.get('/weblogout', function (req, res) {
    res.clearCookie("teacher_ID")
    .clearCookie("name")
    .clearCookie("remember")
    .clearCookie("student_ID")
    .sendFile( __dirname + "/html/" + "login.html" );
    userCookies[req.cookies.teacher_ID] = null;
})

app.get('/home', function (req, res) {
    var teacher_ID = req.cookies.teacher_ID
    if (teacher_ID != null) {
        res.sendFile( __dirname + "/html/" + "index.html" );
    } else {
        res.clearCookie("teacher_ID")
        .clearCookie("name")
        .clearCookie("remember")
        .sendFile( __dirname + "/html/" + "login.html" );
    }
})

app.get('/class', function (req, res) {
    console.log(req.cookies)
    var teacher_ID = req.cookies.teacher_ID
    if (teacher_ID != null) {
        res.sendFile( __dirname + "/html/" + "class.html" );
    } else {
        res.clearCookie("teacher_ID")
        .clearCookie("name")
        .clearCookie("remember")
        .sendFile( __dirname + "/html/" + "login.html" );
    }
})

app.get('/students', function (req, res) {
    console.log(req.cookies)
    var teacher_ID = req.cookies.teacher_ID
    if (teacher_ID != null) {
        res.sendFile( __dirname + "/html/" + "students.html" );
    } else {
        res.clearCookie("teacher_ID")
        .clearCookie("name")
        .clearCookie("remember")
        .sendFile( __dirname + "/html/" + "login.html" );
    }
})

app.post('/getRooms',urlencodedParser,function (req,res) {
    console.log(req.body.teacher_ID)
    var cmd = "SELECT room_ID,major,minor FROM Rooms WHERE teacher_ID = "+req.body.teacher_ID
        db.query(cmd,function(err,results){
            if (err) throw err;
            var array = []
            for (var i = 0; i < results.length; i++) {
                array.push(results[i]);
            }
            console.log(array)
            res.end(JSON.stringify(array))
        })
})

app.post('/getStudents',urlencodedParser,function (req,res) {
    var cmd = "SELECT ST.student_ID AS student_ID, s.name AS name \
        FROM Students_Teachers AS ST\
        JOIN Students AS s ON (ST.student_ID = s.student_ID) \
        JOIN Teachers AS t ON (ST.teacher_ID = t.teacher_ID) \
        WHERE ST.teacher_ID = ? \
        ORDER BY student_ID"
        db.query(cmd,[parseInt(req.body.teacher_ID)],function(err,results){
            if (err) throw err;
            array = []
            for (var i = 0; i < results.length; i++) {
                array.push(results[i])
            }
            res.end(JSON.stringify(array))
        });
})

app.post('/attendance',urlencodedParser,function(req,res){
    var student_ID = req.body.student_ID;
    res.cookie("student_ID",student_ID)
    .end()
})



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
    console.log(new Date(),req.body.student_ID)
    var data = req.body
    var date = new Date()
    var time = date.getTime()
    var student_ID = parseInt(data.student_ID)
    var major = parseInt(data.major)
    var minor = parseInt(data.minor)
    var rssi = parseInt(data.rssi)
    var accuracy = parseInt(data.accuracy)
    var resTime = timeFormat(time).split('T')[1]

    var a = [
        [ time, student_ID , major, minor, rssi, accuracy]
    ];

    var sql = "SELECT room_ID FROM Rooms WHERE major = ? AND minor = ?"
    db.query(sql,[data.major,data.minor],function(err,results){
        if (err) throw err;
        if (results[0] != null){
            res.end(JSON.stringify({
		time: resTime,
		room: results[0].room_ID
	    }))
            sql = "INSERT INTO Attendance (time,student_ID,major,minor,rssi,accuracy) VALUES ?"
            db.query(sql,[a],
            function(err,results){
                if (err) throw err;
            });
        }
    })
})

app.post('/rssi',urlencodedParser,function(req,res){
    console.log(req.body)
    res.end();
})
app.get('/gethere',function(req,res){
    console.log(new Date())
    res.end();
})
// io.on('connection', function(socket) {

//     socket.on("search",function(data){
//         var cmd = "SELECT a.time AS time, r.room_ID AS room, s.name AS student, t.name AS teacher \
//         FROM Attendance AS a \
//         JOIN Rooms AS r ON (a.major = r.major AND a.minor = r.minor) \
//         JOIN Students AS s ON (a.student_ID = s.student_ID) \
//         JOIN Teachers AS t ON (r.teacher_ID = t.teacher_ID) \
//         WHERE a.student_ID = ? \
//         ORDER BY time"
//         db.query(cmd,[parseInt(data)],function(err,results){
//             if (err) throw err;
//             var room = "";
//             var teacher = "";
//             var json = {
//                 start: "2010-01-01T00:00:00",
//                 end: "2010-01-01T00:00:00",
//                 text: ""
//             };
            
//             for (var i = 0; i < array.length; i++) {
//                 var t = parseInt(results[i].time);
//                 t = new Date(t)
//                 var s = new Date(json.start)
//                 var e = new Date(json.end)
//                 var a = dateCompare(t,s);               //Comparing Date
//                 var b = (results[i].room == room);      //Comparing Room
//                 var c = timeCompare(t,e);               //Comparing Time
//                 if (a && b && c) {
//                     json.end = timeFormat(t);
//                     var j = parseInt(i)+1;
//                     if(results[j] == null){
//                         socket.emit('attendance',json);
//                     }
//                 } else {
//                     socket.emit('attendance',json);
//                     json.start = timeFormat(t);
//                     json.end = json.start;
//                     room = results[i].room;
//                     teacher = results[i].teacher;
//                     json.text = "Room: " + room + " Teacher: " + teacher;
//                 } 
                
//             }
//         });
//     })
    
//     socket.on('disconnect', function () {
//     //    console.log('A user disconnected');
//     });
// });

http.listen(8800, function() {
    console.log('listening on *:8800');
    console.log('cookies: ',userCookies)
});

function dateCompare(t,s) {
    var ret = (t.getFullYear() == s.getFullYear()) && (t.getMonth() == s.getMonth()) && (t.getDate() == s.getDate());
    return ret;
}

function timeCompare(t,e) {
    var a = t.getHours() == e.getHours();
    var b = (t.getMinutes() - e.getMinutes()) <= 10;
    return (a && b);
}

function timeFormat(t){
    var ret = new Date(t)
    
    var year = ret.getFullYear();
    year = year.toString();
    var month = ret.getMonth()+1;
    month =  month < 10 ? '0'+ month: month.toString();
    var date = ret.getDate();
    date =  date < 10 ? '0'+ date: date.toString();
    var hours = ret.getHours();
    hours =  hours < 10 ? '0'+ hours: hours.toString();
    var minutes = ret.getMinutes();
    minutes =  minutes < 10 ? '0'+ minutes: minutes.toString();
    var seconds = ret.getSeconds();
    seconds =  seconds < 10 ? '0'+ seconds: seconds.toString();

    ret = year+"-"+month+"-"+date+"T"+hours+":"+minutes+":"+seconds;
    return ret;
}

function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < 5; i++){
        text += possible.charAt(Math.floor(Math.random() * possible.length));
        for (const key in userCookies) {
            if (text == userCookies[key]) {
                text = "";
                i = 0;
                break;
            }
        }
    }
    
    return text;
  }
