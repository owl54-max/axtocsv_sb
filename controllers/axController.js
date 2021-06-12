const Influx = require('influx');
const moment = require('moment')
const os = require('os')
const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const config=require("../app_config")

//** */ sb2 site(HQ)
const host = config.influxdb.host                    // InfluxDB host
const port = config.influxdb.port
const db_name = config.influxdb.db_name                    // data base name
const meature = config.influxdb.meature                    // measurement
const keyPoint = config.influxdb.keyPoint                   //
const where_query_tags = config.influxdb.where_query_tags 　//
//** */ CEL2 BigData(localhost)
const and_query_tags = config.influxdb.and_query_tags
var tagNames=config.influxdb.tagNames
// read option
const pointsInGroup=config.influxdb.pointsInGroup         // 一度に読込むポイント点数
const limitEvryRead=config.influxdb.limitEvryRead         // 一度に読込む時刻列データ数
const samplingtime=config.influxdb.samplingtime           // データ数周期
const createdb_option = config.influxdb.createdb_option;  // create database(db_name) when not exist it.

const influx = new Influx.InfluxDB({ host: host, database: db_name, port: port });
const influxdb=require('../models/influxdb');
const { data } = require('../../bigdata_read/models/db_controllers');

module.exports = {
    hello:(req, res, next)=>{res.end('Welcome to AX Convertion!')},
    /** DBへのPING*/
    check:(req, res, next)=>{
        // db hostへのping確認
        console.log('-- check db-network by ping to '+host)
        influxdb.check(influx).then(() => {next()})
        .catch(()=>{res.end(`** Error ping to the ${host.url.host} is offline `)})
    },
    /** DB接続*/
    connentdb:(req, res, next)=>{
        influxdb.connentdb(influx, createdb_option).then(() => {next()})
        .catch(err=>{res.end(`** error: Not connect the database [${db_name}]`)});
    },
    //** DB情報取得（DB名一覧、measurements、tag情報、ユーザ名*/
    readinfo:(req, res, next)=>{
        //** database名一覧*/
        influxdb.getDatabaseNames(influx).then(()=>{})
        .then(()=>{influxdb.getMeasurements(influx).then(()=>{})})
        .then(()=>{influxdb.gettags(influx).then(()=>{})})
        .then(()=>{influxdb.getUsers(influx).then(()=>{})})
        .then(()=>{influxdb.getIidsFromTabs(influx).then(()=>{})})
    //    .then(()=>{influxdb.getPidsFromFields(influx).then(()=>{})})
        
        .then(()=>{res.sendStatus(200)})
    },


    showdb:(req, res, next)=>{
        // read the latest record inported
        var start =Date.now()
        //let query = `select last("${keyPoint}"),"${keyPoint}" from ${meature} where ${query_tags}`;
        let query = `select last("${keyPoint}"),"${keyPoint}" from ${meature} ${where_query_tags}`;
        //console.log(query)
        influx.queryRaw(query).then(datas => {
            //console.log(datas.results[0])
            if (datas.results[0].error){
                console.log(`** error: ${datas.results[0].error}! [${db_name}]`)
                res.end(`** error: ${datas.results[0].error}! [${db_name}]`)
            } else {
                let Y = datas.results[0].series[0].values.length -1
                console.log(`-- The latest time =${datas.results[0].series[0].values[Y][0]}`)
                return `${datas.results[0].series[0].values[Y][0]}`
            }
        })
        .then((latesttime)=>{
            influxdb.gettags(influx)
            .then(tagNames=>{
                //** 最新時刻の全データ１行を読み込む*/
                let query = `select * from ${meature} ${where_query_tags} and time='${latesttime}'`;
                influx.queryRaw(query).then(datas => {
                    // 最新保存データ１レコードを読込みfield名以外の項目名(Tag名など)を削除
                    let pointNames = datas.results[0].series[0].columns
                    tagNames.map(function( str ) {
                        let index=pointNames.indexOf(str)
                        if (index>-1){
                            //* pointNamesからfield名以外の項目名(Tag名など)を削除*/
                            pointNames.splice(index,1)
                        }
                    })
                    // 読込ポイントをpointsInGroup単位にfields配列ヘ設定
                    var fields=[]
                    let groups = Math.floor(pointNames.length/pointsInGroup)
                    let last = pointNames.length-groups*pointsInGroup
                    for (let i=0; i<=groups; i++){
                        index=i*pointsInGroup
                        if(i<groups){
                            fields.push(pointNames.slice(index,index+pointsInGroup))
                        }else if(last>0){
                            fields.push(pointNames.slice(index,index+last))
                        }    
                    }

                    let params={meature:meature,
                                starttime:`'${latesttime}'-10m`,//開始時刻
                                endtime:`'${latesttime}'`,      //終了時刻
                                where_query_tags:where_query_tags,//検索Tag条件
                                samplingtime:samplingtime,      //読込みデータ周期
                                keyPoint:keyPoint,              //データ検索キーポイント名
                                limit:limitEvryRead,            //一度に読込むデータ数
                                pointsInGroup:pointsInGroup,    //１グループ当たりのポイント数
                                fields:fields,                   //各グループ読込ポイント配列

                            }
                    //console.log(params)
                    console.log('-- total '+(pointNames.length)+'points grouped='+params.fields.length+
                                ' ('+params.pointsInGroup+' points/group,last='+last+' points)'
                                +' read Limit='+params.limit+' read period='+params.samplingtime)
                    console.log('-- read from at: '+params.starttime+ ' to at '+params.endtime)
                    let countdown=fields.length;
                    for(let ii=0; ii<fields.length; ii++){
                        influxdb.readFromInflux(influx, params, ii)
                        .then(results=>{
                            countdown--
                            console.log('## Complete readFromInflux() group='+results[1])
                            if(countdown<1) {
                                var duration = Date.now()-start
                                console.log(`## Complete readFromInflux() all ${duration} ms`)
                                res.sendStatus(200)
                            }
                        })
                    }

                    //res.sendStatus(200)
                })
            })            
        })
    },
    showdb4:(req, res, next)=>{

        async function main(){
            while (true){
                console.log("sleep..."+' '+moment().format("YYYY/MM/DD hh:mm:ss"));
                await influxdb.sleep(1000);

            }
        }
        main();
        console.log("end");
    },

    showdb2:(req, res, next)=>{
        // read the latest record inported
        var start =Date.now()
        influxdb.getIidsFromTabs(influx)
        .then(iidNames=>{
//            console.log(iidNames)
            let pointNames = Array.from(iidNames)
            let keyTagName = pointNames.slice(0,1)  // get a iid from the top
            let query = `select "ts","vr","iid" from ${meature} where time>now()-360d and iid='${keyTagName}'`;
            console.log(query)
            influx.queryRaw(query).then(datas => {
                //** */ read latest data of the specified point
                if (datas.results[0].error){
                    console.log(`** error: ${datas.results[0].error}! [${db_name}]`)
                    res.end(`** error: ${datas.results[0].error}! [${db_name}]`)
                } else {
                    let P = pointNames.length;
                    let Y = datas.results[0].series[0].values.length -1;
                    let oldestDateTime=`${datas.results[0].series[0].values[0][0]}`
                    let latestDateTime=`${datas.results[0].series[0].values[Y][0]}`                   
                    console.log(`-- Found data from ${oldestDateTime} to ${latestDateTime} ${Y} datas ${P} points`)
                    return [oldestDateTime, latestDateTime]
                }
            })
            .then((FromToDatetime)=>{  
                    pointNames.splice(40,)   // get top 3 points for debug
//                    pointNames=['SB_010200000000000096']
//                    pointNames=['SB_010200010000007892']
/**///            console.log(pointNames)
                    var fields=[]
                    let groups = Math.floor(pointNames.length/pointsInGroup)
                    let last = pointNames.length-groups*pointsInGroup
                    for (let i=0; i<=groups; i++){
                        index=i*pointsInGroup
                        if(i<groups){
                            fields.push(pointNames.slice(index,index+pointsInGroup))
                        }else if(last>0){
                            fields.push(pointNames.slice(index,index+last))
                        }    
                    }

                    let params={meature:meature,
                                starttime:`'${FromToDatetime[0]}'`,//開始時刻
                                endtime:`'${FromToDatetime[1]}'`,  //終了時刻
                                where_query_tags:where_query_tags, //検索Tag条件
                                samplingtime:samplingtime,      //読込みデータ周期
                                keyPoint:keyPoint,              //データ検索キーポイント名
                                limit:limitEvryRead,            //一度に読込むデータ数
                                pointsInGroup:pointsInGroup,    //１グループ当たりのポイント数
                                fields:fields,                  //各グループ読込ポイント配列
                                pointNames:pointNames           //all iids
                            }

                    //console.log(params)
                    console.log('-- total '+(pointNames.length)+' points: '+
                                params.pointsInGroup+' points/group x '+params.fields.length+' groups'+
                                ' read period='+params.samplingtime)
                    console.log('-- read from at: '+params.starttime+ ' to at '+params.endtime)

                    console.log(`${Date.now()-start} ms`)

                    let error_count=0
                    let normal_count=0
                    let warm_count=0
                    let error_msg={}
                    let normal_msg={}
                    var start2 =Date.now()
                    let countdown=pointNames.length;
                    for(let ii=0; ii<pointNames.length; ii++){
                        let query = `select "ts","vr","iid" from ${meature} where time>=${params.starttime} 
                                    and time<${params.endtime} and iid='${pointNames[ii]}' Limit 86400`;
                        influx.queryRaw(query).then(datas => {
                            //** */ read latest data of the specified point
                            if (datas.results[0].error){
                                console.log(`** error: ${datas.results[0].error}! [${db_name}]`)
                                res.end(`** error: ${datas.results[0].error}! [${db_name}]`)
                            } else {
                                if("series" in datas.results[0]){
                                    normal_count++
                                    normal_msg["Normal: success"]=normal_count
                                    let Y = datas.results[0].series[0].values.length -1;
                                    let oldestDateTime=`${datas.results[0].series[0].values[0][0]}`
                                    let latestDateTime=`${datas.results[0].series[0].values[Y][0]}`                   
                                    console.log(`-- Read nrml ${pointNames[ii]} err=${error_count} nml=${normal_count} dwn=${countdown} ${oldestDateTime} to ${latestDateTime} ${Y} datas `)
                                    return `${datas.results[0].series[0].values[Y][0]}`
                                } else {
                                    warm_count++
                                    normal_msg["Normal: warming"]=warm_count
                                //    console.log(`-- Read warm ${pointNames[ii]} err=${error_count} nml=${normal_count} dwn=${countdown}`)
                                    return 
                                    
                                }
                            }
                        })
                        .then(()=>{
                            countdown--            
                            if(countdown<1) {
                                var duration = Date.now()-start2
                                console.log(`## Complete readFromInflux() all ${error_count+normal_count}: err=${error_count} nml=${normal_count} warm=${warm_count} ${duration}ms`)
                                console.log(error_msg)
                                console.log(normal_msg)
                                res.sendStatus(200)
                            }
                        })
                        .catch(err=>{
                            countdown--
                            error_count++
                            if(err in error_msg){
                                error_msg[err]++
                            } else {
                                error_msg[err]=1
                            }
                            if(countdown<1) {
                                var duration = Date.now()-start2
                                console.log(`## Complete readFromInflux() all ${error_count+normal_count}: err=${error_count} nml=${normal_count} warm=${warm_count} ${duration}ms`)
                                console.log(error_msg)
                                console.log(normal_msg)
                                res.sendStatus(200)
                            }
                        })
                    }

            })            
        })
    },
    makecsv:(req, res, next)=>{
        // read the latest record inported
        var start =Date.now()
        console.log('-- start make csv')
//        let reqstarttime='2020-03-13T00:00:00Z';
//        let reqendtime='2020-03-13T23:59:59Z';
//        let reqsamplingtime='10s';
        let reqstarttime='2020-03-14T00:00:00Z';
        let reqendtime='2020-03-14T23:59:59Z';
        let reqsamplingtime='10s';

        let reqlimitEvryRead=2000;


        let reqpointsInGroup=16;     
        influxdb.gettags(influx)
        .then(tagNames=>{
            //** 読込開始時刻の全データ１行を読み込む*/
            let query = `select * from ${meature} ${where_query_tags} and time='${reqstarttime}'`;
            console.log(query)
            influx.queryRaw(query)
            .then(datas => {
                // 最新保存データ１レコードを読込みfield名以外の項目名(Tag名など)を削除
                let pointNames = datas.results[0].series[0].columns
    //            console.log()
                tagNames.map(function( str ) {
                    let index=pointNames.indexOf(str)
                    if (index>-1){
                        //* pointNamesからfield名以外の項目名(Tag名など)を削除*/
                        pointNames.splice(index,1)
                    }
                })
                // 読込ポイントをreqpointsInGroup単位にfields配列ヘ設定
                var fields=[]
                let groups = Math.floor(pointNames.length/reqpointsInGroup)
                let last = pointNames.length-groups*reqpointsInGroup
                for (let i=0; i<=groups; i++){
                    index=i*reqpointsInGroup
                    if(i<groups){
                        fields.push(pointNames.slice(index,index+reqpointsInGroup))
                    }else if(last>0){
                        fields.push(pointNames.slice(index,index+last))
                    }    
                }

                let params={meature:meature,
                            starttime:`'${reqstarttime}'`,//開始時刻
                            endtime:`'${reqendtime}'`,    //終了時刻
                            where_query_tags:where_query_tags, //検索Tag条件
                            and_query_tags:and_query_tags,
                            samplingtime:reqsamplingtime, //読込みデータ周期
                            keyPoint:keyPoint,            //データ検索キーポイント名
                            limit:reqlimitEvryRead,       //一度に読込むデータ数
                            pointsInGroup:reqpointsInGroup,//１グループ当たりのポイント数
                            fields:fields                 //各グループ読込ポイント配列
                        }
                console.log('-- total '+(pointNames.length)+'points grouped='+params.fields.length+
                            ' ('+params.pointsInGroup+' points/group,last='+last+' points)'
                            +' read Limit='+params.limit+' read period='+params.samplingtime)
                console.log('-- read from at: '+params.starttime+ ' to at '+params.endtime)
                let NN=fields.length;
                NN=2
                let countdown_csvs=NN;
                for(let ii=0; ii<NN; ii++){
                    influxdb.readFromInflux(influx, params, ii)
                    .then(results=>{
                        Y=results[0].length
                        X=results[0][0].length
                        console.log('X='+X+' Y='+Y)
                        console.log(results)
                        countdown_csvs--
                        let csvAndFilename=influxdb.convertToCsvFormat(results)
                        influxdb.saveCsvFile(csvAndFilename)
                        .then((fileName)=>{
                            console.log('## Complete making and saving a csv file: '+fileName+' '+countdown_csvs)
                            return
                        })
                        .catch((err)=>{
                            console.log(err.message)
                            return
                        })
                        .then(()=>{
                            if(countdown_csvs<1) {
                                var duration = Date.now()-start
                                console.log(`## Complete readFromInflux() all ${duration}ms`)
                                res.sendStatus(200)
                            }
                        })
                    })
                }
            })
        })            
    },

    makecsv_ax:(req, res, next)=>{
        let reqstarttime='2020-02-18T11:35:34.426Z';
        let reqendtime  ='2020-02-19T11:35:34.426Z';
        FromToDatetime=[reqstarttime, reqendtime]
        influxdb.getIidsFromTabs(influx)
        .then(iidNames=>{
            influxdb.makecsv_ax(influx,FromToDatetime,iidNames)         
        })
    },
    //** make zip file from csv files*/
    makezip_ax:(req, res, next)=>{
        // read the latest record inported
        let site='sb2'
        let date='20200218'
        // make zip
        res.end(`${moment().format("YYYY/MM/DD hh:mm:ss")} Start make zip file: ${site}_${date}.zip`)
        influxdb.zipFile(site, date)
    
    },

}