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
    connect:()=>{
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
            console.log('success get hash:',doc.points_hash)
            key={points_hash:doc.points_hash}
            doc = await findOneSync(PointIndexModel,key,'PointIndex hash')
            if(doc !==null){
                const points_json = JSON.parse(doc.points);
            //    console.log(points_json.)
                console.log('point numbers=',Object.keys(points_json.fileds).length)
                return points_json
            }else{
                console.log('findOneSync error2')
                return null
            }
        }else{
            console.log('findOneSync error1')
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

/*
    importPointIndex:async (req) =>  {
        //------------------------
        // update HashIndex
        let pointhash=new PointIndexHashModel()
        pointhash.points_datetime=req.startdatetime
        pointhash.points_hash=req.hash

        let key={points_datetime:req.startdatetime}
        let del_hash=null
        let doc = await findOneSync(PointIndexHashModel,key,'PointIndex hash')
        if(doc !==null){
            if(req.hash==doc.points_hash){
                // update as same hash
                if(show) console.log(moment().format('hh:mm:ss'),"findOne same,update as same hash")
                let doc = await findOneAndUpdate(
                    PointIndexHashModel,
                    key,
                    {$set:{points_hash:req.hash}},
                    {runValidator: true, new: true},
                    'PointIndex hash')

            }else{
                // replace to req.hash
                if(show) console.log(moment().format('hh:mm:ss'),"findOne different,replace to req.hash")
                let key1 = key
                let doc1 = await findOneAndUpdate(
                    PointIndexHashModel,
                    key1,
                    {$set:{points_hash:req.hash}},
                    {runValidator: true, new: true},
                    'PointIndex hash')
                // check
                key = {points_hash:doc.points_hash}
                let doc2 = await findOneSync(PointIndexHashModel,key,'PointIndex hash')
                if(doc2 == null){del_hash=doc.points_hash}
            }
        }else{
            // save as a new one
            if(show) console.log("findOne none,save as a new one",req.startdatetime)
            let doc = await saveSync(PointIndexHashModel,pointhash,'PointIndex hash')
        }
        //------------------------
        // update PointIndex
        let pointindex=new PointIndexModel()
        if(show) console.log(moment().format('hh:mm:ss'),'-- delete hash:',del_hash)
        if(del_hash !== null){
            let key={points_hash:del_hash}
            if(show) console.log(moment().format('hh:mm:ss'),'-- delete PointIndex because of deleted hash index:',key)
            let doc = await removeMany(PointIndexModel,key,'PointIndex')
            if(show) console.log(moment().format('hh:mm:ss'),doc)
        }
        pointindex.points=JSON.stringify(req.taginfos)
        if(show) console.log(moment().format('hh:mm:ss'),req.startdatetime)
        pointindex.points_numb={"fields":Object.keys(req.taginfos.fileds).length,
                                tags:Object.keys(req.taginfos.tags).length,
                                null:Object.keys(req.taginfos.null).length}
        pointindex.points_fromDate=req.startdatetime
        pointindex.points_toDate=req.enddatetime
        pointindex.points_hash=req.hash
        key={points_hash:req.hash}
        doc = await findOneSync(PointIndexModel,key,'PointIndex')
        if(doc ==null){
            if(show) console.log(moment().format('hh:mm:ss'),'-- save PointIndexModel as a new one',key)
            await saveSync(PointIndexModel,pointindex,'PointIndex')

        }else{
            if(show) console.log(moment().format('hh:mm:ss'),'-- update PointIndexModel',key)
            let doc1 = await findOneAndUpdate(
                PointIndexModel,
                key,
                {$set:{points_hash:req.hash}},
                {runValidator: true, new: true},
                'PointIndex')
        }
        return

        //=========================================================
        // functions
        //-------------------------------
        // mongoose  findOne
        async function findOneSync(model,keys,message){
            try {
                let res = await model.findOne(keys);
                if(show) console.log(moment().format('hh:mm:ss'),'==success findOne (',message,')',res)
                return res
            } catch (err){
                console.log(moment().format('hh:mm:ss'),'**** error findOne:',err)
                return null
            }
        }

        //=========================================================
        // functions
        //-------------------------------
        // mongoose  findOneAndUpdate
        async function findOneAndUpdate(model,keys,updates,options,message){
            try {
                let res = await model.findOneAndUpdate(keys,updates,options);
                if(show) console.log(moment().format('hh:mm:ss'),'==success findOneAndUpdate (',message,')',res)
                return res
            } catch (err){
                console.log(moment().format('hh:mm:ss'),'**** error findOneAndUpdate:',err)
                return null
            }
        }
        //-------------------------------
        // mongoose Save
        async function saveSync(model,doc,message){
            try {
                let res = await doc.save();
                if(show) console.log(moment().format('hh:mm:ss'),'==success Save (',message,')',res)
                return res
            } catch (err){
                console.log(moment().format('hh:mm:ss'),'**** error saveSync:',err)
                return null
            }
        }
        //-------------------------------
        // mongoose removeMany
        async function removeMany(model,keys,message){
            let res = await findOneSync(model,keys,message)
            if(show) console.log(moment().format('hh:mm:ss'),'-- removeMany findOneSync res:',res.points_hash)
            while(res !== null){
                res = await findOneAndRemove(model,key,message)
                if(show) console.log(moment().format('hh:mm:ss'),'-- removeMany findOneAndRemove (',message,')',(res==null)? null:res.points_hash)
            }
            return res
        }
        //-------------------------------
        // mongoose findOneAndRemove
        async function findOneAndRemove(model,keys,message){
            try {
                let res = await model.findOneAndRemove(keys);
                if(show) console.log(moment().format('hh:mm:ss'),'==success findOneAndRemove (',message,')',(res==null)? null:res.points_hash)
                return res
            } catch (err){
                console.log(moment().format('hh:mm:ss'),'**** error findOneAndUpdate:',err)
                return null
            }
        }
    },
}
*/
