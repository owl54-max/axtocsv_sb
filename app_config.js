
var dcsValidPointList = require('./data/SB2_AX-Server_IO_List_rev1b_mod.json');

module.exports = {
    "mbb.local":{
        // for test
        useSpecifiedDate:true,         // true:指定よりday日分（true:昨日までのday日間）
        specifiedDate:'2021-04-03',     // 指定日（useSpecifiedDate=falseは今日）
        days:3,                         // days from startDate
        gMax:0,                         // >0：読込Group数（=0 全グループ）
        rewitezip:true,                 // true:zipファイル上書き（false：zip有は生成バイパス）
        cyclic:false,                   // true:起動後サイクリック実行
        cyclictime:'0 */1 * * * *',     // サイクリック時間
        // site spec
        siteName:'sb2',                 // site
        jsonio:dcsValidPointList,       // 有効dscTagNo定義JSONファイルパス
        cyclesec:10,                    // sampling cycle(sec)
        badDatacode:null,               // influxデータ数値外コード
        // influxdb spec
        influxdb:{
            //** */site
            host: '192.168.0.26' ,      // InfluxDB host(AX_Server(DB))
            port : '8086',              // InfluxDB port
            db_name: 'cel2_test',       // data base name
            meature: 'histrical',       // measurement
            keyPoint: 'vr' ,
        //    where_query_tags: `where iid='SB_010200000000000001' or iid='SB_010200000000000002'` ,//
            createdb_option:false,      // create database(db_name) when not exist it.
            pointsInGroup:16 ,          // 一度に読込むポイント点数
            limitEvryRead:86400 ,       // 一度に読込む時刻列データ数
        }
    },
    "default":{
        // for test
        useSpecifiedDate:true,         // true:指定よりday日分（true:昨日までのday日間）
        specifiedDate:'2020-09-13',     // 指定日（useSpecifiedDate=falseは今日）
        days:3,                         // days from startDate
        gMax:0,                         // >0：読込Group数（=0 全グループ）
        rewitezip:true,                 // true:zipファイル上書き（false：zip有は生成バイパス）
        cyclic:false,                   // true:起動後サイクリック実行
        cyclictime:'0 */1 * * * *',     // サイクリック時間
        // site spec
        siteName:'sb2',                 // site
        jsonio:dcsValidPointList,       // 有効dscTagNo定義JSONファイルパス
        cyclesec:10,                    // sampling cycle(sec)
        badDatacode:null,               // influxデータ数値外コード
        // influxdb spec
        influxdb:{
            //** */ sb2 site(HQ)
            host: '192.168.101.11' ,    // InfluxDB host(AX_Server(DB))
            port : '8086',              // InfluxDB port
            db_name: 'axhst',           // data base name
            meature: 'hist',            // measurement
            keyPoint: 'vr' ,
        //    where_query_tags: `where iid='SB_010200000000000001' or iid='SB_010200000000000002'` ,//
            createdb_option:false,      // create database(db_name) when not exist it.
            pointsInGroup:16 ,          // 一度に読込むポイント点数
            limitEvryRead:86400 ,       // 一度に読込む時刻列データ数
        }
    }
}
