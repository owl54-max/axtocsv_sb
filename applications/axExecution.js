const Influx = require('influx');
//const moment = require('moment')
//const os = require('os')
const hostname = require('os').hostname()
//const fs = require('fs')
//const path = require('path')
//const archiver = require('archiver')
const config=require("../app_config")[hostname]

//** */ sb2 site(HQ)
const host = config.influxdb.host                    // InfluxDB host
const port = config.influxdb.port
const db_name = config.influxdb.db_name                    // data base name
const meature = config.influxdb.meature                    // measurement
//const keyPoint = config.influxdb.keyPoint                   //
//const where_query_tags = config.influxdb.where_query_tags 　//
//** */ CEL2 BigData(localhost)
//const and_query_tags = config.influxdb.and_query_tags
//var tagNames=config.influxdb.tagNames
// read option
//const pointsInGroup=config.influxdb.pointsInGroup         // 一度に読込むポイント点数
//const limitEvryRead=config.influxdb.limitEvryRead         // 一度に読込む時刻列データ数
//const samplingtime=config.influxdb.samplingtime           // データ数周期
const createdb_option = config.influxdb.createdb_option;  // create database(db_name) when not exist it.

const influx = new Influx.InfluxDB({ host: host, database: db_name, port: port });
const influxdb=require('../models/influxdb');
const pointindex=require('../routes/pointindex.js');

//const influxdb2=require('../models/influxdb2');
//const { data } = require('../../bigdata_read/models/db_controllers');
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
            err = await pointindex.connect()
            err = await influxdb.existDatabase(influx, db_name)
            err = await influxdb.existMeasurement(influx, meature)
            let tagNames =await influxdb.gettags(influx)
            let user = await influxdb.getUsers(influx)
            let iids = await influxdb.getIidsFromTags(influx)

            return(err)
    },
    makecsv_ax:async (reqstarttime, reqendtime, date,readstarttime)=>{
            // 有効ポイント抽出
        //    let iidNames=Object.keys(config.jsonio)
        //    console.log('iidNames',iidNames)
            let points = await pointindex.getPoints(reqstarttime)
        //    iidNames = Object.keys(points.fileds)
            let iidNames=(config.useSiteDbOption)? Object.keys(points.fileds):Object.keys(config.jsonio);
            console.log('iidNames',iidNames)
            FromToDatetime=[reqstarttime, reqendtime,readstarttime]
            const csvFileList = await influxdb.makecsv_ax(influx,FromToDatetime,iidNames, date)
            return csvFileList
        //    .then((csvFileList)=>{
        //        resolve([date,csvFileList])
        //    })
        //})
    },
    // make zip file from csv files
    existsZip_ax:(site, date)=>{
        if(config.rewitezip) return false
        return influxdb.existsZip_ax(site, date)
    },
    // make zip file from csv files
    makezip_ax: (site, date, CsvfileNames)=>{
        influxdb.zipFile_ax(site, date, CsvfileNames)
    },
}
