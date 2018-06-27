app.post('/matday',urlencodedParser,function (req,res) {
    var data = req.body,
        id   = parseInt(data.id),
        major= parseInt(data.major),
        minor= parseInt(data.minor),
        date  = parseInt(data.date),
        h1   = parseInt(data.h1),
        m1   = parseInt(data.m1),
        h2   = parseInt(data.h2),
        m2   = parseInt(data.m2),
        h    = h1,
        sql = "insert into Attendance values ?"

    for (var m = m1; m < 66 ; m += 5) {
        if( h==h2 && m>m2){
            break
        }
        if(m>59){
            m = m-60;
            h++
        }
        var time = (new Date(2018,4,date,h,m)).getTime()
        var rssi = getRandomInt(-90,-30),
            values = [
            [time,id,major,minor,rssi]
        ]
        console.log(values,h,m)
        db.query(sql,[values],function (err,results) {
            if (err) throw err;
        })
    }
    res.end()
})