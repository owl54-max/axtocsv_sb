'use strict';
// define mongoose
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
// const moment = require("moment");

//---------------------------------
// connect to mongoose
/*
const hostname = require('os').hostname()
const config=require("../app_config")[hostname]
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
    })
    .catch((err) => {
        console.log('** Error connect to',site_db_url)
    //    console.error(moment().format('hh:mm:ss'),'error: ',err);
    })
*/
// define Schema
var Schema = mongoose.Schema;
//* ObjectId = Schema.ObjectId;
//----------------------------------
// schima Point_Index_Tbl_Schema
var Point_Index_Tbl_Schema = new Schema({
    points:Schema.Types.Mixed  ,
    points_numb:Schema.Types.Mixed  ,
    points_fromDate: Date,
    points_toDate: Date,
    points_hash:Schema.Types.Mixed
    }, {
    timestamps: true ,   // createAt, updateAt
})
//----------------------------------
// schima Point_Index_Hash_Tbl_Schema
var Point_Index_Hash_Tbl_Schema = new Schema({
    points_datetime: Date,
    points_hash:Schema.Types.Mixed
    }, {
    timestamps: true ,   // createAt, updateAt
})
//-----------------------------------
// Models
var PointIndexModel = mongoose.model('Point_Index_Tbl',Point_Index_Tbl_Schema)
var PointIndexHashModel = mongoose.model('Point_Index_Hash_Tbl',Point_Index_Hash_Tbl_Schema)
module.exports = {PointIndexModel,PointIndexHashModel}
