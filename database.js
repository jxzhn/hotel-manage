const mysql = require('mysql');

var connection = mysql.createConnection({     
    host: 'localhost',       
    user: 'hotel',              
    password: '$money$is!not!everything',       
    port: '3306',                   
    database: 'hotel' 
});

// 返回客人信息对象
// 返回值：返回字典{guestId, guestName, guestSex, guestAge}，如果查询失败，返回空字典
async function getGuestInfo(guestId) {
    return new Promise((resolve, reject) => { 
        connection.query('select * \
                          from guest \
                          where guestId = ?;', [guestId], (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.length != 0 ? result[0] : {});
            };
        });
    }).catch((mess) => {return mess;});
};

// 返回团队信息对象，格式：{teamId, teamName, teamSize, guestList: [{guestId, guestName, guestSex, guestAge}, ...]}
async function getTeamInfo(teamId) {
    return new Promise((resolve, reject) => { 
        connection.query('select * \
                          from team natural join guest \
                          where teamId = ?;', [teamId], (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                if (!result.length) {
                    resolve({});
                    return;
                }
                tid = result[0]['teamId'];
                tname = result[0]['teamName'];
                tsize = result[0]['teamSize'];
                var glist = [];
                for(var i = 0; i < result.length; i++) {
                    delete result[i]['teamId']; delete result[i]['teamName']; delete result[i]['teamSize'];
                    glist.push(result[i]);
                };
                resolve({teamId: tid,
                         teamName: tname,
                         teamSize: tsize,
                         guestList: glist});
            };
        });
    }).catch((mess) => {return mess;});
}

// 通过用户名字查询信息
// 返回值：返回[{isTeam: bool, detail: {guestId, guestName, guestSex, guestAge}}]，如果查询结果为空，返回空列表
async function getInfoByName(name) {
    return new Promise(async (resolve, reject) => { 
        result = [];
        info = await getGuestInfoByName(name);
        for(var i = 0; i < info.length; i++)
            result.push(info[i]);
        info = await getTeamInfoByName(name);
        for(var i = 0; i < info.length; i++)
            result.push(info[i]);
        resolve(result);
    }).catch((mess) => {return mess;});
};
// 辅助函数，根据名字查询客人信息
async function getGuestInfoByName(name) {
    return new Promise((resolve, reject) => { 
        Name = '%' + name + '%';
        connection.query("select * \
                          from guest \
                          where guestName like ? ;", [Name], (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                r = [];
                for(var i = 0; i<result.length; i++) {
                    delete result[i]['teamId']; delete result[i]['teamName']; delete result[i]['teamSize'];
                    r.push({isTeam: false, detail: result[i]});
                }
                resolve(r);
            };
        });
    }).catch((mess) => {return mess;});
}
// 辅助函数，根据名字查询队伍信息
async function getTeamInfoByName(name) {
    return new Promise((resolve, reject) => { 
        Name = '%' + name + '%';
        connection.query("select * \
                          from team \
                          where teamName like ? ;", [Name], async (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                r = [];
                teamAlreadyExists = [];
                for(var i = 0; i<result.length; i++) {
                    if(teamAlreadyExists.indexOf(result[i]['teamName'].toString()) == -1) {
                        teamAlreadyExists.push(result[i]['teamName'].toString());
                        delete result[i]['guestId']; delete result[i]['guestName']; 
                        delete result[i]['guestSex']; delete result[i]['guestAge'];
                        teamInfo = await getTeamInfo(result[i]['teamId']);
                        result[i]['guestList'] = teamInfo['guestList'];
                        r.push({isTeam: true, detail: result[i]});
                    }
                }
                resolve(r);
            };
        });
    }).catch((mess) => {return mess;});
}

// 通过guestId查询订单
// 返回订单字典的列表
async function getOrderInfoByGuestId(guestId) {
    return new Promise((resolve, reject) => { 
        connection.query('select * \
                          from hotel.order \
                          where guestId = ?;', [guestId], (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            };
        });
    }).catch((mess) => {return mess;});
}

// 通过teamId查询订单
// 返回订单字典的列表
async function getOrderInfoByTeamId(teamId) {
    return new Promise((resolve, reject) => { 
        connection.query('select * \
                          from hotel.order \
                          where teamId = ?;', [teamId], (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            };
        });
    }).catch((mess) => {return mess;});
}

// 创建房间，返回是否成功
async function createRoom(roomId, price, type) {
    return new Promise((resolve, reject) => { 
        connection.query("insert into room \
                          values \
                          (?, ?, ?)", [roomId, price, type], (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                r = result['affectedRows'] == 1;
                resolve(r);
            };
        });
    }).catch(() => {return false;});
};

// 删除房间，返回是否成功
async function deleteRoom(roomId) {
    return new Promise((resolve, reject) => { 
        connection.query("delete from room \
                          where roomId = ?", [roomId], (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                r = result['affectedRows'] == 1;
                resolve(r);
            };
        });
    }).catch(() => {return false;});
}

// 返回 {today: 今日有订单总额，pastWeek: 过去7天订单总额，futureWeek：未来7天订单的总额}
async function countOrders() {
    return new Promise(async (resolve, reject) => { 
        resolve({
            today: await countOrdersToday(),
            pastWeek: await countOrdersBefore(),
            futureWeek: await countOrdersFuture()
        });
    }).catch((mess) => {return mess;});
}
// 辅助函数，获取过去7日的订单列表总数，返回订单数
async function countOrdersBefore() {
    return new Promise((resolve, reject) => { 
        connection.query("select * from hotel.order \
                          where startDate >= (current_date() - 7) and startDate < current_date();", (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.length);
            };
        });
    }).catch(() => {return false;});
}
// 辅助函数，获取过去今日的订单列表总数，返回订单数
async function countOrdersToday() {
    return new Promise((resolve, reject) => { 
        connection.query("select * from hotel.order \
                          where startDate = current_date;", (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.length);
            };
        });
    }).catch(() => {return false;});
}
// 辅助函数，获取未来7日的订单列表总数，返回订单数
async function countOrdersFuture() {
    return new Promise((resolve, reject) => { 
        connection.query("select * from hotel.order \
                          where startDate > current_date and startDate <= (current_date + 7);", (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.length);
            };
        });
    }).catch(() => {return false;});
}

// ----------------------------------------------------------------

async function createGuest(name, sex, age)
{
    sql = 'insert into hotel.guest values(0,?,?,?) ;';
    post = [name,sex,age];
    //sql = 'insert into hotel.guest set';
    //post = {guestName:name,guestSex:sex,guestAge:age};
    return new Promise((resolve,reject) => {
        connection.query(sql,post,(error,results,fields) => {
            if(error){
                reject(error);
            } else{
                var result = (results["affectedRows"] != 0)?true:false;
                resolve(result);
            }
        });
    }).catch((err_message)=>{console.log(err_message);return false});
}

async function deleteGuest(guestId)
{
    sql1 = ' delete from hotel.order where guestId = ? ;';
    sql2 = ' delete from hotel.team where guestId = ? ;';
    sql3 = ' delete from hotel.guest where guestId = ? ;';
    post = [guestId];
    var result1 = await new Promise(
        (resolve,reject) => {
            connection.query(sql1,post,(error,results,fields) => {
                if(error){
                    reject(error);
                }
                else{
                    resolve(true);
                }
            })
        }
    ).catch((message)=>{console.log("err1:",message);return false;});
    var result2 = await new Promise(
        (resolve,reject) => {
            connection.query(sql2,post,(error,results,fields) => {
                if(error){
                    reject(error);
                }
                else{
                    resolve(true);
                }
            })
        }
    ).catch((message)=>{console.log("err2:",message);return false;});
    return new Promise((resolve,reject) => {
        connection.query(sql3,post,(error,results,fields) => {
            if(error){
                reject(error);
            } else{
                resolve(true && result1 && result2);
            }
        });
    }).catch((message)=>{console.log("err3:",message);return false;});
}

async function createTeam(name, guestIdList)
{
    var teamId = await new Promise(
        (resolve,reject) => {
            connection.query("select max(teamId) from hotel.team;",(error,results,fields) => {
                if(error){
                    reject(error);
                } else{
                    resolve(results[0]['max(teamId)'] + 1);
                }
            });
        }).catch((message)=>{console.log(message);return false});
    sql = 'insert into hotel.team values';
    post = [];
    for(var i = 0;i < guestIdList.length;i++)
    {
        sql += "(?,?,?,?)";
        sql += (i < guestIdList.length - 1)?",":";";
        post.push(teamId,guestIdList[i],name,guestIdList.length);
    }
    return new Promise((resolve,reject) => {
        connection.query(sql,post,(error,results,fields) => {
            if(error){
                reject(error);
            } else{
                resolve(true);
            }
        });
    }).catch((message)=>{console.log(message);return false});
}

async function deleteTeam(teamId)
{
    sql1 = ' delete from hotel.order where teamId = ? ;';
    sql2 = ' delete from hotel.team where teamId = ? ;';
    post = [teamId]
    var result1 = await new Promise(
        (resolve,reject) => {
            connection.query(sql1,post,(error,results,fields) => {
                if(error){
                    reject(error);
                }
                else{
                    resolve(true);
                }
            })
        }
    ).catch((message)=>{console.log("err1:",message);return false;});
    return new Promise((resolve,reject) => {
        connection.query(sql2,post,(error,results,fields) => {
            if(error){
                reject(error);
            } else{
                resolve(true && result1);
            }
        });
    }).catch((message)=>{console.log("err2:",message);return false;});
}

async function createGuestOrder(guestId, roomId, startDate, endDate)
{
    sql = ' insert into hotel.order values(0,?,NULL,?,?,?,0) ;';
    post = [guestId,roomId,startDate,endDate]
    return new Promise((resolve,reject) => {
        connection.query(sql,post,(error,results,fields) => {
            if(error){
                reject(error);
            } else{
                resolve(true);
            }
        });
    }).catch((message)=>{console.log(message);return false});
}

// ---------------------------------------------------------------

async function getTodayRoomDetail()
{
    var dict = {};
    var today = new Date();
    sql = ' select * from hotel.room \
            where roomId not in \
            (select roomId from hotel.order \
            where startDate <= ? and endDate > ?);';
    post = [today,today];
    dict["empty"] = await new Promise((resolve,reject) => {
        connection.query(sql,post,(error,results,fields) => {
            if(error){
                reject(error);
            } else{
                resolve(results);
            }
        });
    }).catch((message)=>{console.log(message);return []});
    sql = ' select * from hotel.room \
            where roomId in \
            (select roomId from hotel.order \
            where startDate <= ? and endDate > ?);';
    return new Promise((resolve,reject) => {
        connection.query(sql,post,(error,results,fields) => {
            if(error){
                reject(error);
            } else{
                dict["filled"] = results;
                resolve(dict);
            }
        });
    }).catch((message)=>{console.log(message);return dict});
}

async function getAvailableRoomAt(dateStart, dateEnd)
{
    sql = ' select * from hotel.room \
            where roomId not in \
            (select roomId from hotel.order \
            where (startDate >= ? and startDate < ?) or (endDate > ? and endDate <= ?));';
    post = [dateStart,dateEnd,dateStart,dateEnd]
    return new Promise((resolve,reject) => {
        connection.query(sql,post,(error,results,fields) => {
            if(error){
                reject(error);
            } else{
                resolve(results);
            }
        });
    }).catch((message)=>{console.log(message);return []});
}

async function createTeamOrder(teamId, roomId, startDate, endDate)
{
    var orderId = await new Promise(
        (resolve,reject) => {
            connection.query("select max(orderId) from hotel.order;",(error,results,fields) => {
                if(error){
                    reject(error);
                } else{
                    resolve(results[0]['max(orderId)'] + 1);
                }
            });
        }).catch((message)=>{console.log(message);return false});
    sql = "insert into hotel.order values (?,NULL,?,?,?,?,0);";
    post = [orderId,teamId,roomId,startDate,endDate];
    return new Promise((resolve,reject) => {
        connection.query(sql,post,(error,results,fields) => {
            if(error){
                reject(error);
            } else{
                resolve(true);
            }
        });
    }).catch((message)=>{console.log(message);return false});
}

async function cancelOrder(orderId)
{
    sql = 'update hotel.order set orderStatus = 1 where orderId = ? ;';
    post = [orderId]
    return new Promise((resolve,reject) => {
        connection.query(sql,post,(error,results,fields) => {
            if(error){
                reject(error);
            } else{
                resolve(true);
            }
        });
    }).catch((message)=>{console.log(message);return false});
}

async function payOrder(orderId)
{
    sql = ' update hotel.order set orderStatus = 2 where orderId = ? ;';
    post = [orderId]
    return new Promise((resolve,reject) => {
        connection.query(sql,post,(error,results,fields) => {
            if(error){
                reject(error);
            } else{
                resolve(true);
            }
        });
    }).catch((message)=>{console.log(message);return false});
}

async function getOrders() {
    return new Promise((resolve, reject) => {
        connection.query('select * from hotel.order', (error, results, fields) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        })
    });
}

// 返回今天住在这个房间的客人或团队，返回列表[{isTeam: bool, detail: object}]
async function getGuestByRoom(roomId) {
    return new Promise((resolve, reject) => { 
        connection.query('select * \
                          from hotel.order, guest, team \
                          where hotel.order.roomId = ? \
                            and (order.guestId = guest.guestId or order.teamId = team.teamId) \
                            and current_date() >= startDate \
                            and current_date() < endDate;', [roomId], async (error, result, fields) => {
            if (error) {
                reject(error);
            } else {
                if (!result.length) {
                    resolve([]);
                    return;
                }
                var checkTeam = Boolean(result[0]['teamId']);
                delete result[0].startDate; delete result[0].endDate; delete result[0].orderStatus;
                if (checkTeam && !Boolean(result[0]['teamId'])){
                    delete result[0]['guestId']; delete result[0]['guestName']; 
                    delete result[0]['guestSex']; delete result[0]['guestAge'];
                    teamInfo = await getTeamInfo(result[0]['teamId']);
                    result[0]['guestList'] = teamInfo['guestList'];
                } else {
                    delete result[0]['teamId']; delete result[0]['teamName']; delete result[0]['teamSize'];
                }
                resolve([{isTeam: checkTeam, detail: result[0]}]);
            };
        });
    }).catch((mess) => {return mess;});
};

async function getRoomInfoById(roomId) {
    return new Promise((resolve, reject) => {
        connection.query('select * from hotel.room where roomId = ?', [roomId], (error, results, fields) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        })
    });
}

// ------------------------------------------------------------------

module.exports = {
    createGuest: createGuest,
    deleteGuest: deleteGuest,
    createTeam: createTeam,
    deleteTeam: deleteTeam,
    getGuestInfo: getGuestInfo,
    getTeamInfo: getTeamInfo,
    getAvailableRoomAt: getAvailableRoomAt,
    createGuestOrder: createGuestOrder,
    createTeamOrder: createTeamOrder,
    cancelOrder: cancelOrder,
    payOrder: payOrder,
    getGuestByRoom: getGuestByRoom,
    getInfoByName: getInfoByName,
    createRoom: createRoom,
    deleteRoom: deleteRoom,
    getRoomInfoById: getRoomInfoById,
    countOrders: countOrders,
    getTodayRoomDetail: getTodayRoomDetail,
    getOrders: getOrders,
    getOrderInfoByGuestId: getOrderInfoByGuestId,
    getOrderInfoByTeamId: getOrderInfoByTeamId
}
