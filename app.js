const express = require('express');
const bodyParser = require('body-parser');
const identify = require('./identify'); // 处理用户登录
const database = require('./database'); // 与 MySQL 交互

const port = 32333;

var app = express();
app.use(bodyParser.json({limit: '5mb'}));

app.use(express.static('web', {index: '/index.html'})); // 网页根目录

function getReqData(req) {
    if (req.body && Object.keys(req.body).length) {
        return req.body;
    }
    if (req.query && Object.keys(req.query).length) {
        return req.query;
    }
    if (req.params && Object.keys(req.params).length) {
        return req.params;
    }
    return {};
}

app.all('/userLogin', (req, res) => {
    let reqData = getReqData(req);
    console.log(`login request from ip ${req.ip}, params: ${JSON.stringify(reqData)}.`);

    let uuid = identify.userLogIn(reqData.name, reqData.passwd);
    if (!uuid) { // 登录验证失败
        console.log('login failed.');
        res.json({ok: true, uuid: ''});
    } else { // 登录验证成功
        console.log('login success.');
        res.json({ok: true, uuid: uuid});
    } 
});

app.all('/getUserWithUUID', (req, res) => {
    let reqData = getReqData(req);
    console.log(`get user from ip ${req.ip}, params: ${JSON.stringify(reqData)}.`);

    let name = identify.getUserWithUUID(reqData.uuid);
    if (!name) { // 没有找到该 UUID 对应的活动，用户身份已过期
        console.log('get user failed.');
        res.json({ok: true, name: ''});
    } else { // 找到用户
        console.log(`get user success. user: ${name}`);
        res.json({ok: true, name: name});
    }
});

app.all('/checkAdmin', (req, res) => {
    let reqData = getReqData(req);
    console.log(`check admin from ip ${req.ip}, params: ${JSON.stringify(reqData)}.`);

    let name = identify.getUserWithUUID(reqData.uuid, true);
    if (!name) {
        console.log('check admin failed.');
        res.json({ok: true, admin: false});
    } else {
        console.log(`check admin success. user: ${name}`);
        res.json({ok: true, admin: true});
    }
});

app.all('/callFunction', async (req, res) => {
    let reqData = getReqData(req);
    console.log(`call function from ip ${req.ip}, params: ${JSON.stringify(reqData)}.`);

    if (!reqData.uuid || !reqData.method || !reqData.parameters || !Array.isArray(reqData.parameters)) {
        console.log('wrong request format.');
        res.json({ok: false, errmsg: 'Wrong request format.'});
        return;
    }

    let admin = (reqData.method == 'createRoom' || reqData.method == 'deleteRoom' || reqData.method == 'getRoomInfoById');
    if (!identify.getUserWithUUID(reqData.uuid, admin)) {
        console.log('permission denied.');
        res.json({ok: false, errmsg: 'Permission denied.'});
        return;
    }

    try {
        let result = await database[reqData.method](...reqData.parameters);
        console.log('result: ', JSON.stringify(result));
        res.json({ok: true, data: result});
    } catch (err) {
        let errmsg = err.toString();
        console.log(errmsg);
        res.json({ok: false, errmsg: errmsg});
    }
});

var server = app.listen(port);
console.log(`server started at port ${port}.`);