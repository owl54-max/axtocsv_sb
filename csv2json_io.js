/****
  IOポイント（CSV)を読込み有効なポイントについて
  json形式に変換し保存する
*/
const ioname='./data/SB2_AX-Server_IO_List_rev1b_mod'
let csvFile = ioname+'.csv';
let jsonFile= ioname+'.json';

let fs   = require('fs');
let csv  = require('csvtojson');
let beautify = require('js-beautify').js;

csv().fromFile(csvFile).then((jsonData)=>{
//console.log(jsonData)
let iopointlist ={};
jsonData.forEach(function(value,index){
  if(value.valid>0){
      let point={}
      point.ItemID=value.ItemID
      point.Description=value.Description
      point.Type=value.Type
      point.Unit=value.Unit
      point.DP=value.DP
      point.disp_lower=value.disp_lower
      point.disp_upper=value.disp_upper
      point.dcsTagNo=value.dcsTagNo
      point.valid=value.valid
      iopointlist[value.PID]=point
      //console.log(point)
  }
});
fs.writeFile(jsonFile, beautify(JSON.stringify(iopointlist),{}), function(err) {
    if (err) console.log('error', err);
    });
});