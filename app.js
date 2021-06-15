/*
  axtocsv - AX data to CSV file
　  DCS InfluxDBから履歴データのCSVを作成しZIPファイルで保存する
*/
const hostname = require('os').hostname()
console.log('hostname=',hostname)
const moment = require('moment')
const axExec=require("./applications/axExecution")
const config=require("./app_config")[hostname];
const cron = require('node-cron')
const fs = require('fs');

const path = require('path')


//---------------------------------------------
// main()
async function main(){
    let toDate=`${moment.utc().clone().add(-1,'days').format("YYYY-MM-DD 23:59:59")}`
    let startDate=moment.utc(toDate,moment.ISO_8601).clone().add((config.days*-1+1),'days').format("YYYY-MM-DD 00:00:00")
    if(config.useSpecifiedDate){
        toDate=moment.utc(config.specifiedDate,moment.ISO_8601).clone().add(config.days,'days').format("YYYY-MM-DD 23:59:59")
        startDate=moment.utc(toDate,moment.ISO_8601).clone().add((config.days*-1+1),'days').format("YYYY-MM-DD 00:00:00")
    }
    console.log(`== ${logtime()} strart read from ${startDate} to ${toDate} as UTC`)
    let err = await axExec.check()              // influxDBへのPING
    if(!err){
        err = await axExec.connentdb()          // influxDB接続
        if(!err){
            err = await axExec.readinfo()       // DB情報取得
            if(!err){
                // make csv files, and then make zip
                await makezipfiles(startDate)
            }
        }
    }
    if(err) console.log('** exit for error:',err)
    return
}

//---------------------------------------------
// zip file生成
async function makezipfiles(startDate){
    // remove ./work/csv
//    var dist = path.join(process.env.PWD||process.cwd(),"work",path.sep,"csv")
//    if (fs.existsSync(dist)) {fs.unlinkSync(dist)}

    for(let d=0;d<config.days;d++){
        let readstarttime=moment.utc(startDate,moment.ISO_8601).clone().add(d,'days').add(-1,'hours')
        let reqstarttime=moment.utc(startDate,moment.ISO_8601).clone().add(d,'days')
        let reqendtime=moment.utc(startDate,moment.ISO_8601).clone().add(d+1,'days').add(-1,'seconds')
        let date=reqstarttime.toISOString().split('T')[0].replace(/-/g,'');
        console.log(`-- ${logtime()} make ${config.siteName}_${date}_csv.zip : ${reqstarttime.format("YYYY-MM-DD HH:mm:ss")}-${reqendtime.format("YYYY-MM-DD HH:mm:ss")} read from ${readstarttime.toISOString()} utc`)
        if(!axExec.existsZip_ax (config.siteName, date)||config.rewitezip){
            // make CSV files of a day
            const CsvfileNames = await axExec.makecsv_ax(reqstarttime.toISOString(), reqendtime.toISOString(), date,readstarttime.toISOString())
            // make ZIP file from above CSV files
            if(CsvfileNames.length>0){
                const zipfile = await axExec.makezip_ax(config.siteName, date, CsvfileNames)
            }
        }
    }
    console.log(`-- ${logtime()} make end`)
    return
}

// log time
function logtime(){
    return `${moment().format("YYYY/MM/DD HH:mm:ss")}`
}

//----------------------------------
// main
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
