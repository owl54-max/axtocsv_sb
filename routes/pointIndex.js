'use strict';
const moment = require("moment");
const Influx = require('influx');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

//const DEF=require('../USERE_DEFINE.js')
const hostname = require('os').hostname()
const config=require("../app_config")[hostname]

//const show = DEF.db.showLogOfMongoDB
const {PointIndexModel,PointIndexHashModel}=require('../models/point_index_tbl.js')
module.exports = {
    connectWithMongoDB:()=>{
        if(!config.useSiteDbOption) return
        return new Promise((resolve)=>{
            const site_db_url=config.site_db.cel2
            const con = mongoose.connect(
                site_db_url,
                {
                    useNewUrlParser: true,
                    useCreateIndex: true,
                    useUnifiedTopology: true,
                    useFindAndModify:false,
                })
                .then(() => {
                    console.log('-- success: Connect to',site_db_url)
                    resolve()
                })
                .catch((err) => {
                    console.log('** Error connect to',site_db_url)
                    resolve('cannot connect to mongodb,',err)
                })
        })
    },
    //-------------------------------
    // mongoDB からポイント情報読込
    getPoints:async(startdate)=>{
        if(!config.useSiteDbOption) return null
        let startdatetime=nanoToTimestr(startdate)
        let key={points_datetime:startdatetime}
        let doc = await findOneSync(PointIndexHashModel,key,'PointIndex hash')
        if(doc !==null){
            //console.log('success get hash:',doc.points_hash)
            key={points_hash:doc.points_hash}
            doc = await findOneSync(PointIndexModel,key,'PointIndex hash')
            if(doc !==null){
                const points_json = JSON.parse(doc.points);
            //    console.log(points_json.)
            //    console.log('point numbers=',Object.keys(points_json.fileds).length)
                return points_json
            }else{
                console.log('findOneSync error2')
                return null
            }
        }else{
            console.log('** not found PointIndex hash of',key)
            return null
        }

        //=========================================================
        // functions
        //-------------------------------
        // mongoose  findOne
        async function findOneSync(model,keys,message){
            try {
                let res = await model.findOne(keys);
                //console.log(moment().format('hh:mm:ss'),'==success findOne (',message,')',res)
                return res
            } catch (err){
                console.log(moment().format('hh:mm:ss'),'**** error findOne:',err)
                return null
            }
        }
        //-------------------------
        // yyyy-mm-ddThh:mm:ss.xxxZYYYY-MM-DDThh:mm:ssZに変換
        function nanoToTimestr(nanoTime) {
            let nano = new Date(nanoTime)*1000000 // to nano seconds
            return Influx.toNanoDate(String(nano)).toNanoISOString().replace(/\.0{9}Z/, 'Z');
        }
    }
}
