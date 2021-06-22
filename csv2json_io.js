/****
  IOポイント（CSV)を読込み有効なポイントについて
  json形式に変換し保存する
*/
const ioname='./data/SB2_ax_tagtbl_rev1_0622'
let csvFile = ioname+'.csv';
let jsonFile= ioname+'.json';

let fs   = require('fs');
let csv  = require('csvtojson');
let beautify = require('js-beautify').js;

csv().fromFile(csvFile).then((jsonData)=>{
  //console.log(jsonData)
  let iopointlist ={};
  jsonData.forEach(function(value,index){
    //console.log(value)
    if(value.c_category1<0){
        let point={}
        point.dcsTagNo=value.c_tag_no.replace('SB_','')
        point.Description=value.c_tag_desc
        point.Type=(value.i_signal_type>0)? 'DIGITAL':'ANALOG';
        point.Unit=value.c_unit
        point.DP=value.i_decimal_place
        point.disp_upper=value.d_disp_range_upper
        point.disp_lower=value.d_disp_range_lower
        point.valid=value.c_category1
        iopointlist[value.c_point_id]=point
        //console.log(point)
    }
});
fs.writeFile(jsonFile, beautify(JSON.stringify(iopointlist),{}), function(err) {
    if (err) console.log('error', err);
    });
});
