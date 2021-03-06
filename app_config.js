
var dcsValidPointList = require('./data/SB2_ax_tagtbl_rev1_0622.json');

module.exports = {
    "sgxVPNVmGwLinux":{
        // For SB2 on HQ
        useSpecifiedDate:false,         // true:指定よりday日分（true:昨日までのday日間）
        specifiedDate:'2020-09-19',     // 指定日（useSpecifiedDate=falseは今日）
        days:1,                         // days from startDate
        gMax:0,                         // >0：読込Group数（=0 全グループ）
        rewitezip:true,                 // true:zipファイル上書き（false：zip有は生成バイパス）
        cyclic:false,                   // true:起動後サイクリック実行
        cyclictime:'0 */10 * * * *',     // サイクリック時間
        // site spec
        siteName:'sb2',                 // site
        timezineID:'Asia/Makassar',     // インドネシア南スラウェシ（+08:00）

        jsonio:dcsValidPointList,       // 有効dscTagNo定義JSONファイルパス
        cyclesec:1,                    // sampling cycle(sec)
        badDatacode:null,               // influxデータ数値外コード
        // influxdb spec
        influxdb:{
            //** */ sb2 site(HQ)
            host: '192.168.101.11' ,    // InfluxDB host(AX_Server(DB))
            port : '8086',              // InfluxDB port
            db_name: 'axhst',           // data base name
            meature: 'hist',            // measurement
            createdb_option:false,      // create database(db_name) when not exist it.
            pointsInGroup:16 ,          // 一度に読込むポイント点数
            limitEvryRead:86400 ,       // 一度に読込む時刻列データ数
        },
        useSiteDbOption:false,
        site_db : {
            "cel2":"mongodb://localhost:27017/site_cel2"
        },
    //    point_index_tbls:{
    //        points:'./data/point_index_tbls.csv'
    //    }
    },

    "mbb.local":{
        // for MAC-M1
        useSpecifiedDate:true,         // true:指定よりday日分（true:昨日までのday日間）
        specifiedDate:'2021-02-09',     // 指定日（useSpecifiedDate=falseは今日）
        days:3,                         // days from startDate
        gMax:0,                         // >0：読込Group数（=0 全グループ）
        rewitezip:true,                 // true:zipファイル上書き（false：zip有は生成バイパス）
        cyclic:false,                   // true:起動後サイクリック実行
        cyclictime:'*/10 * * * * *',     // サイクリック時間
        // site spec
        siteName:'sb2',                 // site
        timezineID:'Asia/Makassar',     // インドネシア南スラウェシ（+08:00）

        jsonio:dcsValidPointList,       // 有効dscTagNo定義JSONファイルパス
        cyclesec:600,                    // sampling cycle(sec)
        badDatacode:null,               // influxデータ数値外コード
        // influxdb spec
        influxdb:{
            //** */site
            host: '192.168.0.26' ,      // InfluxDB host(AX_Server(DB))
            port : '8086',              // InfluxDB port
            db_name: 'cel2_test',       // data base name
            meature: 'histrical',       // measurement
            createdb_option:false,      // create database(db_name) when not exist it.
            pointsInGroup:16 ,          // 一度に読込むポイント点数
            limitEvryRead:86400 ,       // 一度に読込む時刻列データ数
        },
        // mongoose
        useSiteDbOption:true,           // true: get point info from mongoose
        site_db : {
            "cel2":"mongodb://localhost:27017/site_cel2"
        },
    //    point_index_tbls:{
    //        points:'./data/point_index_tbls.csv'
    //    }
    },

    "TPSCPC065047":{
        // from RPC (remote)
        useSpecifiedDate:false,         // true:指定よりday日分（true:昨日までのday日間）
        specifiedDate:'2020-09-19',     // 指定日（useSpecifiedDate=falseは今日）
        days:1,                         // days from startDate
        gMax:0,                         // >0：読込Group数（=0 全グループ）
        rewitezip:true,                 // true:zipファイル上書き（false：zip有は生成バイパス）
        cyclic:false,                   // true:起動後サイクリック実行
        cyclictime:'0 */10 * * * *',     // サイクリック時間
        // site spec
        siteName:'sb2',                 // site
    //    timezineID:'Asia/Tokyo',      // TimezineID
        timezineID:'Asia/Makassar',      // インドネシア南スラウェシ（+08:00）
    //    timezineID:'America/Caracas',      // TimezineID
    //    timezineID:'Australia/Darwin',      // TimezineID

        jsonio:dcsValidPointList,       // 有効dscTagNo定義JSONファイルパス
        cyclesec:1,                    // sampling cycle(sec)
        badDatacode:null,               // influxデータ数値外コード
        // influxdb spec
        influxdb:{
            //** */ sb2 site(HQ)
            host: '192.168.101.11' ,    // InfluxDB host(AX_Server(DB))
            port : '8086',              // InfluxDB port
            db_name: 'axhst',           // data base name
            meature: 'hist',            // measurement
            createdb_option:false,      // create database(db_name) when not exist it.
            pointsInGroup:16 ,          // 一度に読込むポイント点数
            limitEvryRead:86400 ,       // 一度に読込む時刻列データ数
        },
        useSiteDbOption:false,
        site_db : {
            "cel2":"mongodb://localhost:27017/site_cel2"
        },
    //    point_index_tbls:{
    //        points:'./data/point_index_tbls.csv'
    //    }

    }

}
