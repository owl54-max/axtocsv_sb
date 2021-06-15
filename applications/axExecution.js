const Influx = require('influx');
const hostname = require('os').hostname()
const config=require("../app_config")[hostname]
const moment = require('moment')

//** */ sb2 site(HQ)
const host = config.influxdb.host                    // InfluxDB host
const port = config.influxdb.port
const db_name = config.influxdb.db_name                    // data base name
const meature = config.influxdb.meature                    // measurement
const createdb_option = config.influxdb.createdb_option;  // create database(db_name) when not exist it.

const influx = new Influx.InfluxDB({ host: host, database: db_name, port: port });
const influxdb=require('../models/influxdb');
const pointindex=require('../routes/pointindex.js');
// log time
function logtime(){
    return `${moment().format("HH:mm:ss")}`
}


module.exports = {
    /** DBへのPING*/
    check:()=>{
        return new Promise((resolve)=>{
            // db hostへのping確認
            //console.log('-- check db-network by ping to '+host)
            influxdb.check(influx).then(() => {resolve()})
            .catch(()=>{resolve('ping error to the influxdb.')})
        })
    },
    /** DB接続*/
    connentdb:()=>{
        return new Promise((resolve)=>{
            influxdb.connentdb(influx, createdb_option).then(() => {resolve()})
            .catch(err=>{resolve('connect error to the database')});
        })
    },
    //** DB情報取得（DB名一覧、measurements、tag情報、ユーザ名*/
    readinfo:async ()=>{
            //** database名一覧*/
            let err
            err = await pointindex.connectWithMongoDB()             // connect with mongoDB if useSiteDbOption=true
            err = await influxdb.existDatabase(influx, db_name)     // influxDBのDB名検査
            err = await influxdb.existMeasurement(influx, meature)  // influxDBのmeasurement検査
        //    let tagNames =await influxdb.gettags(influx)          // influxDBのTags読み込み
        //    let user = await influxdb.getUsers(influx)            // influxDBのユーザ名読み込み
        //    let iids = await influxdb.getIidsFromTags(influx)     // influxDBのiid読み込み

            return(err)
    },
    makecsv_ax:async (reqstarttime, reqendtime, date,readstarttime)=>{
            // 有効ポイント抽出
            let csvFileList=[]
        //    let iidNames = await influxdb.getFields(reqstarttime) // get iids
            let pointInfo = await influxdb.getFields(reqstarttime) // get iids
            let iids=Object.keys(pointInfo)
            console.log(`-- ${logtime()} found ${iids.length} points`)
            if(iids.length>0){
                FromToDatetime=[reqstarttime, reqendtime,readstarttime]
                csvFileList = await influxdb.makecsv_ax2(influx,FromToDatetime,iids, date, pointInfo)
            }
            return csvFileList
    },
    // make zip file from csv files
    existsZip_ax:(site, date)=>{
        if(config.rewitezip) return false
        return influxdb.existsZip_ax(site, date)
    },
    // make zip file from csv files
    makezip_ax: async (site, date, CsvfileNames)=>{
        console.log('site=',site,'date=',date,'nmbs of csv=',CsvfileNames.length)
        await influxdb.zipFile_ax(site, date, CsvfileNames)
        return
    },
}
