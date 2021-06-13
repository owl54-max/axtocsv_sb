/*
  axtocsv - AX data to CSV file
　  DCS InfluxDBから履歴データのCSVを作成しZIPファイルで保存する
*/
//const os = require('os')
const hostname = require('os').hostname()
console.log('hostname=',hostname)
//const CONFIG = require('./USER_DEFINE.js')[hostname];

const moment = require('moment')
const axExec=require("./applications/axExecution")
const config=require("./app_config")[hostname];
const cron = require('node-cron')

// main function
async function main(){
    let toDate=`${moment.utc().clone().add(-1,'days').format("YYYY-MM-DD 23:59:59")}`
    let startDate=moment.utc(toDate,moment.ISO_8601).clone().add((config.days*-1+1),'days').format("YYYY-MM-DD 00:00:00")
    //console.log('== current from:',startDate,'to:',toDate)
    //let toDate=`${moment.utc().clone().add(0,'days')}`
    if(config.useSpecifiedDate){
        toDate=moment.utc(config.specifiedDate,moment.ISO_8601).clone().add(config.days,'days').format("YYYY-MM-DD 23:59:59")
        startDate=moment.utc(toDate,moment.ISO_8601).clone().add((config.days*-1+1),'days').format("YYYY-MM-DD 00:00:00")
    }
    console.log(`== ${logtime()} strart read from ${startDate} to ${toDate} as UTC`)
    let err = await axExec.check()             // DBへのPING
    if(!err){
        err = await axExec.connentdb()      // DB接続
        if(!err){
            err = await axExec.readinfo()               // DB情報取得
            if(!err){
                // make csv files, and then make zip
                await makezipfiles(startDate)
            }
        }
    }
    if(err) console.log('** exit for error:',err)
    return
}
async function makezipfiles(startDate){
//    return new Promise((resolve)=>{
        for(let d=0;d<config.days;d++){
            let readstarttime=moment.utc(startDate,moment.ISO_8601).clone().add(d,'days').add(-1,'hours')
            let reqstarttime=moment.utc(startDate,moment.ISO_8601).clone().add(d,'days')
            let reqendtime=moment.utc(startDate,moment.ISO_8601).clone().add(d+1,'days').add(-1,'seconds')
            let date=reqstarttime.toISOString().split('T')[0].replace(/-/g,'');
            console.log(`-- ${logtime()} make ${config.siteName}_${date}_csv.zip : ${reqstarttime.format("YYYY-MM-DD HH:mm:ss")}-${reqendtime.format("YYYY-MM-DD HH:mm:ss")} read from ${readstarttime.toISOString()} utc`)
            //console.log(config.siteName,date,axExec.existsZip_ax (config.siteName, date))
            if(!axExec.existsZip_ax (config.siteName, date)||config.rewitezip){
            //    console.log(reqstarttime.toISOString(),reqendtime.toISOString(),date,readstarttime.toISOString())
                console.log('++++')
                const CsvfileNames = await axExec.makecsv_ax(reqstarttime.toISOString(), reqendtime.toISOString(), date,readstarttime.toISOString())
            //    .then((CsvfileNames)=>{
                console.log('==222==',CsvfileNames)
                const zipfile = await axExec.makezip_ax(config.siteName, CsvfileNames[0], CsvfileNames[1])
            //        resolve()
                return
            //    })
            }
        }
        console.log(`-- ${logtime()} make end`)
//        resolve()
//    })
}

// log time
function logtime(){
    return `${moment().format("YYYY/MM/DD HH:mm:ss")}`
}

//----------------------------------
(async()=>{
    // exec every 30 minutes
    if(config.cyclic){
    console.log(`== ${logtime()} strart AX-to-CSV by run cycle:`,config.cyclictime)
    cron.schedule(config.cyclictime,()=>{
        main()
    })
    }else{
        await main()
        console.log(`== ${logtime()} exit because option cyclic is`,config.cyclic)
        process.exit(0)
    }
})();
