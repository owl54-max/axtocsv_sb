require('date-utils')
const os = require('os')
const fs = require('fs')
const path = require('path')
const moment = require('moment')
//const archiver = require('archiver')
const iconv = require('iconv-lite')
const {hex2num}=require('hex-2-num')
//const { waitForDebugger } = require('inspector')
const config=require("../app_config")
module.exports = {
    // データ読込(１グループ)
    readFromInflux_ax2: async (influx, params)=>{
        return await new Promise((resolve, reject)=>{
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

            //select = `select vr from ${params.meature}`
            //query = `${select} ${where} ${tags}  group by iid`
            //console.log(query)
            //console.log(where)
            //1グループデータ読込
            influx.queryRaw(query)
            .then(datas => {
                if (datas.results[0].error){
                    params.error_count++
                    params.error_grp[g]=`'results err':${datas.results[0].error}`
                    reject(params)

                }else if(!("series" in datas.results[0])){
                    //console.log(datas.results[0])
                    params.error_count++
                    params.error_grp[g]=`'non series err':' '`
                    reject(params)

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
                    params.result[0]=values
                    params.result[1]=params.req_grp
                    params.result[2]=cNormal
                    params.normal_count++
                    resolve(params)
                }
            })
        })
    },
    // 1ファイルの配列データをCSVファイルテキストに変換
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
            if(params.result[0][0][i] in config.jsonio){
                dcsTagNo = config.jsonio[params.result[0][0][i]].dcsTagNo
                Description = config.jsonio[params.result[0][0][i]].Description
                Unit=config.jsonio[params.result[0][0][i]].Unit
                DP=config.jsonio[params.result[0][0][i]].DP
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
        return new Promise((resolve, reject)=>{
            var dist = path.join(process.env.PWD||process.cwd(),"work",path.sep,"csv",path.sep,csvAndFilename[1])
            try{
                let fd = fs.openSync(dist, "w");
                fs.writeFileSync(dist,"");
                let buf= iconv.encode(csvAndFilename[0], "Shift_JIS");
                fs.writeFileSync(dist,buf);
                fs.closeSync(fd);
            }
            catch(err){
                reject(err)
            }
            resolve("work"+path.sep+"csv"+path.sep+csvAndFilename[1])
        })
    },
}
