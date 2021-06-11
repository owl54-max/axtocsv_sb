/*
  axtocsv - AX data to CSV file
　  DCS InfluxDBから履歴データのCSVを作成しZIPファイルで保存する
*/
const os = require('os')
const moment = require('moment')
const axExec=require("./applications/axExecution")
const config=require("./app_config")
const cron = require('node-cron')

// main function
function main(){
    let toDate=`${moment.utc().clone().add(-1,'days').format("YYYY-MM-DD 23:59:59")}`
    let startDate=moment.utc(toDate,moment.ISO_8601).clone().add((config.days*-1+1),'days').format("YYYY-MM-DD 00:00:00")
    //let toDate=`${moment.utc().clone().add(0,'days')}`
    if(config.useSpecifiedDate){
        toDate=moment.utc(config.specifiedDate,moment.ISO_8601).clone().add(config.days,'days').format("YYYY-MM-DD")
        startDate=moment.utc(toDate,moment.ISO_8601).clone().add((config.days*-1+1),'days').format("YYYY-MM-DD")
    }
    console.log(`== ${logtime()} strart read from ${startDate} to ${toDate} as UTC`)
    axExec.check().then(()=>{               // DBへのPING
        axExec.connentdb().then(()=>{       // DB接続
            axExec.readinfo()               // DB情報取得
            async function makezipfiles(){
                for(let d=0;d<config.days;d++){
                    let readstarttime=moment.utc(startDate,moment.ISO_8601).clone().add(d,'days').add(-1,'hours')
                    let reqstarttime=moment.utc(startDate,moment.ISO_8601).clone().add(d,'days')
                    let reqendtime=moment.utc(startDate,moment.ISO_8601).clone().add(d+1,'days').add(-1,'seconds')
                    let date=reqstarttime.toISOString().split('T')[0].replace(/-/g,'');
                    console.log(`-- ${logtime()} make ${config.siteName}_${date}_csv.zip : ${reqstarttime.format("YYYY-MM-DD HH:mm:ss")}-${reqendtime.format("YYYY-MM-DD HH:mm:ss")} read from ${readstarttime.toISOString()} utc`)
                    if(!axExec.existsZip_ax (config.siteName, date)){
                        await axExec.makecsv_ax(reqstarttime.toISOString(), reqendtime.toISOString(), date,readstarttime.toISOString())
                        .then((CsvfileNames)=>{
                            axExec.makezip_ax(config.siteName, CsvfileNames[0], CsvfileNames[1])
                            return
                        })
                    }
                }
            }
            makezipfiles()
        })
        .catch(()=>{
            console.log(`** ${logtime()} Abort becuse cannot find the DB`)
        })
    })
    .catch(()=>{
        console.log(`** ${logtime()} Abort becuse cannot connect to db host`)
    })
}
// log time
function logtime(){
    return `${moment().format("YYYY/MM/DD HH:mm:ss")}`
}
// exec every 30 minutes
if(config.cyclic){
console.log(`== ${logtime()} strart AX-to-CSV by run cycle:`,config.cyclictime)
cron.schedule(config.cyclictime,()=>{
    main()
    //console.log(`== ${logtime()} wait to next cycle time`)
})
}else{
    main()
    console.log(`== ${logtime()} exit because option cyclic is `,config.cyclic)
}
