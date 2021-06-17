require('date-utils')
//const os = require('os')
const hostname = require('os').hostname()
const fs = require('fs')
const path = require('path')
const moment = require('moment')
const archiver = require('archiver')
//const iconv = require('iconv-lite')
const config=require("../app_config")[hostname]
const influxdb2=require("./influxdb2")
const pointindex=require('../routes/pointindex.js');


module.exports = {
    //** DB hostへping*/
    check:(influx)=>{
        return new Promise((resolve, reject)=>{
            influx.ping(5000).then(influx_hosts => {
                influx_hosts.forEach(host => {
                    if (host.online) {
                        console.log(`-- success: Ping to the ${host.url.host} responded in ${host.rtt}ms running ${host.version})`)
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
                        reject (`1:Not found database ${db_name}`)
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
                reject (`2:Not found the database ${db_name}`)
            })
        })
    },
    //** DBチェック名*/
    existDatabase:(influx, dbname)=>{
        return new Promise((resolve)=>{
            influx.getDatabaseNames().then(names =>{
                if(names.indexOf(dbname)>-1){
                    console.log(`-- success: Find the database [${dbname}]`)
                    resolve()
                }else{
                    console.log(`** error : cannot find such a database [${dbname}]`)
                    resolve(`not exist such db [${dbname}]`)
                }
            })
        })
    },
    //** measurementチェック*/
    existMeasurement:(influx, measurement)=>{
        return new Promise((resolve, reject)=>{
            influx.getMeasurements().then(names =>{
                if(names.indexOf(measurement)>-1){
                    console.log(`-- success: Find the measurement [${measurement}]`)
                    resolve()
                }else{
                    console.log(`** error : cannot find such a measurement [${measurement}]`)
                    resolve(`not exist such measurement [${measurement}]`)
                }
            })
        })
    },
    //** ユーザー一覧*/
    getUsers:(influx)=>{
        return new Promise((resolve, reject)=>{
            influx.getUsers().then(users => {
                if (users.length>0){
                    users.forEach(user => { console.log(`-- success: Find the user_name:${user.user}, admin:${user.admin}`)})
                    resolve([`${user.user}`,`${user.admin}`])
                } else {
                    console.log(`-- success: Find the user_name [none]`)
                    resolve(['none','none'])
                }
            })

        })
    },
    //** tag keysよりTag名リストを取得 */
    gettags:(influx)=>{
        return new Promise((resolve)=>{
            let tagNames=['time','undefined']
            influx.getSeries().then(names => {
                //** field名以外の項目名（Tag名...）のリスト生成>>tagNames */
                names.map(function( name ) {
                    name.split(',').map(function( str ) {
                        if(str.lastIndexOf("=")>0 && str.lastIndexOf("iid")<0){
                            let tabName=str.split('=')[0];
                            if (tagNames.findIndex(item => item === tabName)<0){
                                tagNames.push(tabName)
                            }
                        }
                    })
                })
                console.log(`-- success: Find the tagNames [${tagNames}]`)
                resolve(tagNames)
            })
        })
    },
    //** tag keysよりiid一覧を取得 */
    getIidsFromTags:(influx)=>{
        return new Promise((resolve)=>{
            let iids=[]
            influx.getSeries().then(names => {
                names.map(function( name ) {
                    name.split(',').map(function( str ) {
                        if(str.lastIndexOf("=")>0 && str.lastIndexOf("iid")>-1){
                            iids.push(str.split('=')[1])
                        }
                    })
                })
                if(iids.length>0){
                    console.log(`-- success: Found following ${iids.length} iids:`)
                    console.log(iids)
                }else{
                    console.log(`** warming: Not found any iid in the Tags`)
                }
                resolve(iids)
            })
        })
    },
    //** Fiels一覧を取得 */
    getFields: async (reqstarttime)=>{
    //    let fields=[]

        let pointInfo={}
        try{
            if(config.useSiteDbOption){
                // mongoDBのポイント一覧から入力
                let points = await pointindex.getPoints(reqstarttime)
                pointInfo=points.fileds
            //    console.log(pointInfo)
            //    fields=Object.keys(pointInfo);
            }else{
                // AXサーバのポイント一覧から入力
                pointInfo=config.jsonio
            //    console.log(pointInfo)
            //    fields=Object.keys(pointInfo);
            }
        }catch{
            console.log('** error:no point information database')
            return pointInfo
        }
        return pointInfo
    },
    //**1日のAXデータからCSVファイルを生成する*/
    makecsv_ax2:async (influx,FromToDatetime,iidNames, date, pointInfo)=>{
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
            starttime:`${FromToDatetime[0]}`,           //開始時刻
            endtime:`${FromToDatetime[1]}`,             //終了時刻
            readstarttime:`${FromToDatetime[2]}`,       //データ読込開始時刻（開始時刻-1h)
            req_grp:0,                                  //読込要求グループNo
            error_grp:{},                               //読込 エラGroupリスト
            error_count:0,                              //読込 エラグループ数
            normal_count:0,                             //読込 正常グループ数
            result:[],                                  //データ
            CsvfilePathNames:[],                        //csv file names success
            pointInfo:pointInfo,                        //Points information
        }
        let CsvfilePathNames = await readInflux(influx, params)
        return CsvfilePathNames

        //--------------------
        // 指定１日の履歴データをCSVとして読み込む
        // 読込は、AXサーバまたはBigDataのInfluxDB
        async function readInflux(influx, params){
        //    console.log(params.pointInfo)
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
                // 指定日1日の1グループ分のデータ読み込み
                let result = await influxdb2.readInflux2(influx, params)
                if(!result){
                    // 読込異常完了（１グループ)
                    arysz =params.error_grp[params.req_grp] // error
                    params.result={}
                    //continue
                }else{
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

                    // 1グループ分のヘッダを付加しCSVテキストへ変換
                    let csvAndFilename=influxdb2.convertToCsvFormat_ax(params)
                    // 変換したCSVテキストをCSVファイルとして保存
                    let CsvfilePathName = await influxdb2.saveCsvFile(csvAndFilename)
                    if(CsvfilePathName.length>0){
                        params.CsvfilePathNames.push(CsvfilePathName)
                    }
                }
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
            return params.CsvfilePathNames
        }
    },
    //------------------------------------------
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
        return new Promise((resolve)=>{
            console.log('start make zip influxdb')
            let zipFileName = `${site}_${date}.zip`
            let zipFildir = path.join(process.env.PWD||process.cwd(),"work",path.sep,'zip')
            let zipFilePath = `${zipFildir+path.sep+zipFileName}`
            if (!fs.existsSync(zipFildir)) {fs.mkdirSync(zipFildir);}       // mk zip dir if not exist
            if (fs.existsSync(zipFilePath)) {fs.unlinkSync(zipFilePath);}   // remove zip file if exist
            let csvFiledir = path.dirname(CsvfileNames[0])

            let archive = archiver.create('zip',{})
            let output = fs.createWriteStream(zipFilePath)
            archive.pipe(output)
            archive.glob(`${date}*.csv`,{cwd:csvFiledir})
            archive.finalize()
            output.on("close", function(){
                var archive_size = archive.pointer()
                console.log(`== ${moment().format("HH:mm:ss")} ${zipFileName} strored on ${zipFildir} :${(archive_size/1024/1024).toFixed(1)} MB`)
                resolve()
            })
        })
    },
}
