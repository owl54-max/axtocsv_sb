
const express = require('express')
const http = require('http')
const os = require('os')
const app = express()
const web_port=3000

const axCont=require("./controllers/axController")
// start Web Server
http.createServer(app).listen(web_port, function () {
    console.log(`Listening on port ${web_port}`)
})

app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
        // res 時間計測
        const duration = Date.now() - start
        console.log(`Request to ${req.path} took ${duration}ms`);
    })
    return next()
})

app.get('/', axCont.hello)
app.get('/check', axCont.check, axCont.connentdb, axCont.readinfo)
app.get('/showdb', axCont.showdb)
app.get('/showdb2', axCont.check, axCont.connentdb, axCont.showdb2)
app.get('/showdb4', axCont.check, axCont.connentdb, axCont.showdb4)
app.get('/makecsv', axCont.makecsv)
app.get('/makecsv_ax',axCont.check, axCont.connentdb, axCont.makecsv_ax)
app.get('/makezip_ax', axCont.makezip_ax)
app.get('/times', function (req, res) { })
app.get('/slow/', (req, res) => {setTimeout(() => res.sendStatus(200), 10 * 1000)})