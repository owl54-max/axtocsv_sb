require('date-utils')
const os = require('os')
const fs = require('fs')
const path = require('path')
const moment = require('moment')
const archiver = require('archiver')
const iconv = require('iconv-lite')
const {hex2num}=require('hex-2-num')
const { waitForDebugger } = require('inspector')
const config=require("../app_config")
const influxdb2=require("./influxdb2")

module.exports = {
    //** DB hostへping*/
    check:(influx)=>{
        return new Promise((resolve, reject)=>{
            influx.ping(5000).then(influx_hosts => {
                influx_hosts.forEach(host => {
                    if (host.online) {
                        console.log(`-- Success ping to the ${host.url.host} responded in ${host.rtt}ms running ${host.version})`)
                        resolve()
                    } else {
                        console.log(`** Error ping to the ${host.url.host} is offline `)
                        reject()
                    }
                })
            })
        })
    },
    //** DB接続*/
    connentdb:(influx, createdb_option)=>{
        return new Promise((resolve, reject)=>{
            let db_name=influx._options.database;
            //console.log(`1:db_name:${db_name}`)
            influx.getDatabaseNames()
            .then(names => {
                //console.log(`2:names:${names}: ${names.includes(db_name)}:${createdb_option}`)
                if (!names.includes(db_name)) {
                    if (createdb_option) {
                        //console.log(`3:create database ${db_name}`)
                        influx.createDatabase(db_name);
                        console.log(`-- success: Create and Connect to the database [${db_name}]`)
                        resolve ()
                    } else {
                        //console.log(`3:Not found database ${db_name}`)
                        console.log(`** error: cannot find such a database [${db_name}]`)
                        reject (`3:Not found database ${db_name}`)
                    }
                } else {
                    //console.log(`3:Found database ${db_name}`)
                    console.log(`-- success: Connect to the database [${db_name}]`)
                    resolve ()
                }
            })
            .catch(err=>{
                console.log(`** error: cannot find such a database [${db_name}]`)
                console.log(err)
                reject (`3:Not found the database ${db_name}`)
            })
        })
    },
    //** DB名一覧*/
    getDatabaseNames:(influx)=>{
        return new Promise((resolve, reject)=>{
            influx.getDatabaseNames().then(names =>{
                console.log('-- database names are: ' + names.join(', '))
            })
            resolve()
        })
    },
    //** measurement一覧*/
    getMeasurements:(influx)=>{
        return new Promise((resolve, reject)=>{
            influx.getMeasurements().then(names =>{
                console.log('-- measurement names are: ' + names.join(', '))
            })
            resolve()
        })
    },
    //** ユーザー一覧*/
    getUsers:(influx)=>{
        return new Promise((resolve, reject)=>{
            influx.getUsers().then(users => {
                if (users.length>0){
                    users.forEach(user => { console.log(`-- user_name:${user.user}, admin:${user.admin}`)})
                } else {
                    console.log(`-- user_name: none`)
                }
                resolve()
            })

        })
    },
    //** tag keysよりTag名リストを取得 */
    gettags:(influx)=>{
        return new Promise((resolve, reject)=>{
            let tagNames=['time','undefined']
            influx.getSeries().then(names => {
                //** field名以外の項目名（Tag名...）のリスト生成>>tagNames */
                names.map(function( name ) {
                    name.split(',').map(function( str ) {
                        if(str.lastIndexOf("=")>0 && str.lastIndexOf("iid")<-1){
                            let tabName=str.split('=')[0];
                            if (tagNames.findIndex(item => item === tabName)<0){
                                tagNames.push(tabName)
                            }              
                        }
                    })       
                })
                console.log('-- tagNames:'+tagNames)
                resolve(tagNames)      
            })
        })
    },
    //** tag keysよりiid一覧を取得 */
    getIidsFromTabs:(influx)=>{
        return new Promise((resolve, reject)=>{
            let iids=[]
            influx.getSeries().then(names => {
                names.map(function( name ) {
                    name.split(',').map(function( str ) {
                        if(str.lastIndexOf("=")>0 && str.lastIndexOf("iid")>-1){
                            iids.push(str.split('=')[1])           
                        }
                    })       
                })
                console.log(`-- Found ${iids.length} iids.`)
                resolve(iids)      
            })
        })
    },

    makecsv_ax:(influx,FromToDatetime,iidNames, date)=>{
        return new Promise((resolve, reject)=>{
            var start =Date.now()
            pointsInGroup=config.influxdb.pointsInGroup
            let pointNames = Array.from(iidNames)
            var fields=[]
            let groups = Math.floor(pointNames.length/pointsInGroup)
            let last = pointNames.length-groups*pointsInGroup
            for (let i=0; i<=groups; i++){
                index=i*pointsInGroup
                if(i<groups){fields.push(pointNames.slice(index,index+pointsInGroup))
                }else if(last>0){fields.push(pointNames.slice(index,index+last))}    
            }
            let params={
                meature:config.influxdb.meature,
                date:date,
                pointsInGroup:config.influxdb.pointsInGroup,//１グループ当たりのポイント数(=16)
                fields:fields,                              //各グループ読込ポイント配列
                starttime:`${FromToDatetime[0]}`,         //開始時刻
                endtime:`${FromToDatetime[1]}`,           //終了時刻
                readstarttime:`${FromToDatetime[2]}`,      //データ読込開始時刻（開始時刻-1h)
                req_grp:0,                         //読込要求グループNo     
                error_grp:{},                      //読込 エラGroupリスト
                error_count:0,                     //読込 エラグループ数
                normal_count:0,                    //読込 正常グループ数
                result:[],                         //データ
                CsvfilePathNames:[],               //csv file names success
            }
            async function readInflux(influx, params){  
                let NN=params.fields.length
                if(config.gMax>0)NN=Math.min(config.gMax, params.fields.length)
                let countdown_csvs=NN;
                let g=-1
                var arysz =''
                while(countdown_csvs>0){         
                    g++
                    countdown_csvs--
                    let start1 =Date.now()
                    let sts=''
                    arysz =''
                    params.req_grp=g                
                    await influxdb2.readFromInflux_ax2(influx, params)
                    .then(result=>{
                        // 読込正常完了（１グループ）
                        params=result
                        let X= params.result[0][0].length
                        let Y= params.result[0].length
                        let G= params.result[1]
                        let cNormal=params.result[2] //実数データ個数
                        arysz =`'csv':(${X}x${Y}) `
                        let allbad=0
                        let badidx=""
                        cNormal.forEach(N=>{
                            if(N>0){
                                badidx+='-'
                            }else{
                                badidx+='b'
                                allbad=1
                            }
                        })
                        if(allbad>0)arysz+=badidx
                        let csvAndFilename=influxdb2.convertToCsvFormat_ax(params)
                        influxdb2.saveCsvFile(csvAndFilename)
                        .then((CsvfileName)=>{
                            params.CsvfilePathNames.push(CsvfileName)
                            return
                        })
                    })
                    .catch(result=>{
                        arysz =params.error_grp[params.req_grp] // error
                        params.result={}
                        return
                    })
                    let t1=Date.now()-start1
                    let tt=Date.now()-start
                    let dt=params.date
                    console.log(`-- ${moment().format("HH:mm:ss")} ${dt} ${params.req_grp}/${NN-1}, `+
                                `total:${(tt/1000/60).toFixed(1)}m this:${(t1/1000).toFixed(1)}s, `+
                                `csv file nml:${params.normal_count} ERR: ${params.error_count} ${arysz}`)
                    if(arysz.indexOf('influx.queryRaw err')>-1){
                        console.log(`** Abort for catch any error of the influx.queryRaw at ${moment().format("YYYY/MM/DD HH:mm:ss")}`)
                        console.log(params.error_grp)
                        countdown_csvs=0
                    }else{
                        if(countdown_csvs<1) {
                            var duration = (Date.now()-start)/1000
                            console.log(
                                `-- ${moment().format("HH:mm:ss")} ${params.date}`+
                                ` ${params.CsvfilePathNames.length} csv files succeed.,`+
                                ` except not ${Object.keys(params.error_grp).length}`+
                                ` files for any errors, ${duration.toFixed(1)}s`
                                )
                        }
                    }                 
                }
                resolve(params.CsvfilePathNames)
            }
            // start read
            readInflux(influx, params)
        })
    },
    // make zip file from csv files
    existsZip_ax:(site, date)=>{
        let zipFileName = `${site}_${date}.zip`
        let zipFilder = path.join(process.env.PWD||process.cwd(),"work",path.sep,'zip')
        if (fs.existsSync(path.join(zipFilder,path.sep,zipFileName))){
            console.log(`-- exists already ${path.join(zipFilder,path.sep,zipFileName)}`)
            return true
        }
        return false 
    }, 
    // csvをzipへ返換
    zipFile_ax:(site, date, CsvfileNames)=>{
        let zipFileName = `${site}_${date}.zip`
        let zipFilder = path.join(process.env.PWD||process.cwd(),"work",path.sep,'zip')
        if (!fs.existsSync(zipFilder)) {fs.mkdirSync(zipFilder);}    
        let archive = archiver.create('zip',{})
        let zipFilePath = `${zipFilder+path.sep+zipFileName}`
        let csvFilder = path.join(process.env.PWD||process.cwd(),"work",path.sep,'csv')
        if (fs.existsSync(zipFilePath)) {fs.unlinkSync(zipFilePath);}
        let output = fs.createWriteStream(zipFilePath)
        archive.pipe(output)//    
        for(let i=0; i<CsvfileNames.length; i++){
            archive.glob(CsvfileNames[i])
        }
        archive.finalize()
        output.on("close", function(){
            var archive_size = archive.pointer()
            console.log(`== ${moment().format("HH:mm:ss")} ${zipFileName} strored on ${zipFilder} :${(archive_size/1024/1024).toFixed(1)} MB`)
        })
    },
}