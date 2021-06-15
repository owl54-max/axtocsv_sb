require('date-utils')
const os = require('os')
const hostname = require('os').hostname()
const fs = require('fs')
const path = require('path')
const moment = require('moment')
const iconv = require('iconv-lite')
const {hex2num}=require('hex-2-num')
const config=require("../app_config")[hostname]
module.exports = {
    readInflux2:async(influx, params)=>{
        if(config.useSiteDbOption){
            // read from BIG
            const result = await readFromInflux_big(influx, params)
            return result

        }else{
            // read from AX
            const result = await readFromInflux_ax2(influx, params)
            return result

        }
        //-------------------------------------------------
        // BIG データ読込(１グループ)
        async function readFromInflux_big(influx, params){
            return new Promise((resolve)=>{
                let nKey = 'SUCSESS'
                let wKey = 'WARNING'
                let eKey = 'OTHERS'
                let g=params.req_grp
                let select = `select LAST("${params.fields[params.req_grp][0]}") as "${params.fields[params.req_grp].join("\",\"")}"`
                let from = `from ${params.meature}`
                let where = `where time>'${params.readstarttime}' and time<'${params.endtime}'`
                let group = `group by time(${config.cyclesec}s)`
                let query = `${select} ${from} ${where} ${group}`

                influx.queryRaw(query)
                .then(datas => {
                    if (datas.results[0].error){
                        // error in queryRaw
                        params.error_count++
                        params.error_grp[g]=`'results err':${datas.results[0].error}`
                        resolve() // error queryRaw

                    }else if(!("series" in datas.results[0])){
                        // error non series
                        params.error_count++
                        params.error_grp[g]=`'non series err':' '`
                        resolve()  // error series

                    }else{
                        // normal read
                        let pMax=datas.results[0].series.length
                        let nMax=datas.results[0].series[0].values.length
                        let values=[]
                        let cNormal= new Array(pMax).fill(0)//正常データ個数
                        // set columns
                        values.push(datas.results[0].series[0].columns)
                        // set values
                        for(let j=0;j<nMax;j++){
                            let time=datas.results[0].series[0].values[j][0] // yyyy-mm-ddThh:mm:ssZ
                            let valid=!(moment(time).isBefore(moment(params.starttime)))
                            if(valid){
                                // add a new time row
                                values.push(datas.results[0].series[0].values[j])
                                for(let i=0;i<pMax;i++){
                                    cNormal[i]=cNormal[i]+1
                                }
                            }
                        }
                        params.result[0]=values         // values
                        params.result[1]=params.req_grp // group no
                        params.result[2]=cNormal        // numbers of normal data
                        params.normal_count++
                        resolve(params)  // success
                    }
                })
            })
        }
        //-------------------------------------------------
        // AX データ読込(１グループ)
        async function readFromInflux_ax2(influx, params){
            return await new Promise((resolve)=>{
                let nKey = 'SUCSESS'
                let wKey = 'WARNING'
                let eKey = 'OTHERS'
                let g=params.req_grp
                let iids = `(iid='`+params.fields[params.req_grp].join("' or iid='")+`')`
                let select = `select LAST(vr) as vr from ${params.meature}`
                let where = `where time>'${params.readstarttime}' and time<'${params.endtime}'`
                let tags = `and ${iids}`
                let group = `group by time(${config.cyclesec}s), iid`
                let query = `${select} ${where} ${tags} ${group}`

                //1グループデータ読込
                influx.queryRaw(query)
                .then(datas => {
                    if (datas.results[0].error){
                        params.error_count++
                        params.error_grp[g]=`'results err':${datas.results[0].error}`
                        resolve() // error queryRaw

                    }else if(!("series" in datas.results[0])){
                        //console.log(datas.results[0])
                        params.error_count++
                        params.error_grp[g]=`'non series err':' '`
                        resolve()  // error queryRaw

                    }else{
                        // normal read
                        let pMax=datas.results[0].series.length
                        let nMax=datas.results[0].series[0].values.length
                        let values=[['time']] // set 'time' as header
                        let preVal=[]
                        let cNormal= new Array(pMax).fill(0)//正常データ個数
                        for(let i=0;i<pMax;i++){
                            //set iid as header
                            values[0].push(datas.results[0].series[i].tags.iid)
                            //set pre-value for replace null data
                            preVal.push(datas.results[0].series[i].values[0][1])
                        }
                        for(let j=0;j<nMax;j++){
                            let time=datas.results[0].series[0].values[j][0]
                            let valid=!(moment(time).isBefore(moment(params.starttime)))
                            if(valid){
                                // add a new time row
                                values.push([time])
                            }
                            for(let i=0;i<pMax;i++){
                                let value=[]
                                let val_real=config.badDatacode
                                let vr=datas.results[0].series[i].values[j][1]
                                if(vr==null){
                                    vr=preVal[i]
                                    if(vr==null){vr='0,8'}//set BAD
                                }else{
                                    preVal[i]=vr
                                }
                                if(valid){
                                    if(vr.length==19){
                                        // set normal numeric data
                                        val_real=hex2num(vr.split(',')[0])
                                        cNormal[i]=cNormal[i]+1
                                    }
                                    values[values.length-1].push(val_real)
                                }
                            }
                        }
                        params.result[0]=values         // InfluxDB data
                        params.result[1]=params.req_grp // group no
                        params.result[2]=cNormal        // numbers of normal data
                        params.normal_count++
                        resolve(params)  // success
                    }
                })
            })
        }
    },


    // 1ファイルの配列データにヘッダ分を追加し、CSVファイルテキストに変換
    convertToCsvFormat_ax:(params)=>{
        let csv
        let now = new Date()
        let nowDateTime = now.toFormat("YYYY/MM/DD,HH24:MI:SS")
        let csvFileName = params.result[0][1][0].split('T')[0].replace(/-/g,'')+params.result[1]+'.csv';
        csv='Trend,'+csvFileName+','+nowDateTime;
        csv=csv+os.EOL+',TagNo,Description,Unit,Dp';
        let datalabel = 'Date,Time'
        // ポイント情報（1－20行）データヘッダを生成
        pp = params.pointsInGroup; // points/group
        for(let i=1;i<=pp ;i++){
            let dcsTagNo =''
            let Description = ''
            let Unit=''
            let DP=''
            if(!config.useSiteDbOption){
                if(params.result[0][0][i] in params.pointInfo){
                    dcsTagNo = params.pointInfo[params.result[0][0][i]].dcsTagNo
                    Description = params.pointInfo[params.result[0][0][i]].Description
                    Unit=params.pointInfo[params.result[0][0][i]].Unit
                    DP=params.pointInfo[params.result[0][0][i]].DP
                }
                //if(params.result[0][0][i] in config.jsonio){
                //    dcsTagNo = config.jsonio[params.result[0][0][i]].dcsTagNo
                //    Description = config.jsonio[params.result[0][0][i]].Description
                //    Unit=config.jsonio[params.result[0][0][i]].Unit
                //    DP=config.jsonio[params.result[0][0][i]].DP
                //}
            }else{
                if(params.result[0][0][i] in params.pointInfo){
                    dcsTagNo = params.result[0][0][i]
                    Description=params.pointInfo[dcsTagNo].Description
                    Unit=params.pointInfo[dcsTagNo].Units
                    DP = ''
                }
            }
            let nn=params.result[1]*pp +i;
            if(i<params.result[0][0].length){
                csv=csv+os.EOL+nn+','+dcsTagNo+','+Description+','+Unit+','+DP;
            }else{
                csv=csv+os.EOL+nn+',,,,';
            }
            // データの項目ラベル
            datalabel=datalabel+','+nn;
            }
        csv=csv+os.EOL+os.EOL+datalabel;
        for(let i=1; i<params.result[0].length; i++){
            let date = params.result[0][i][0].split('T')[0].replace(/-/g,'/');
            let time = params.result[0][i][0].split('T')[1].replace(/[zZ]/g,'')
            let vals = params.result[0][i].slice(1)
            csv=csv+os.EOL+date+','+time+','+vals.join(',');
        }
        csv=csv+os.EOL
        return([csv,csvFileName])
    },
    // CSVファイルテキストをファイルへ書出し
    saveCsvFile:(csvAndFilename)=>{
        return new Promise((resolve)=>{
            var dist = path.join(process.env.PWD||process.cwd(),"work",path.sep,"csv",path.sep,csvAndFilename[1])
            if (!fs.existsSync(path.dirname(dist))) {fs.mkdirSync(path.dirname(dist));}
            try{
                let fd = fs.openSync(dist, "w");
                fs.writeFileSync(dist,"");
                let buf= iconv.encode(csvAndFilename[0], "Shift_JIS");
                fs.writeFileSync(dist,buf);
                fs.closeSync(fd);
            }
            catch(err){
                resolve()
            }
            resolve(dist)
        })
    },
}
