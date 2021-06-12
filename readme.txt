/*
  axtocsv - AX influxDBから履歴データをCSVファイルへ収集しZIPファイルで保存
  ・1秒周期・1日データを16点づつにCSVファイルへ収録
  ・30分周期で実行し前日の23:59:59までの1日分を生成する
*/

起動
　> node app2.js



変更履歴
2021.0611
1. フォルダーをaxtocsv_sbへ変更
２. git登録
　　ユーザー：owl54-max
   パス:Hiro@Fuku54
   push操作例
   echo "# first commit">>README.md"
   git init
   git add READDME.md

   git commit -m "any comment of changing"
   git branch -M main
   git remote add origin https://github.com/owl54-max/axtocsv_sb.git
   git push -u origin main
   username:owl54-max
   password:Hiro@Fuku54
