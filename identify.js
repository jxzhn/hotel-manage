function getUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
}

var users = {
    'bob': {
        passwd: 'heythisis*bob*',
        isAdmin: false,
    },
    'super': {
        passwd: 'yo^super%user%here',
        isAdmin: true
    }
}

var activity = {} // 记录当前活动的 UUID 对应的账号 name 及自己的清除定时器 timer
const ACT_TIMEOUT = 10 * 60 * 1000; // 10min 过期

// 处理用户登录，检查密码是否正确，若正确将返回一个 UUID，否则返回空串
function userLogIn(name, passwd) {
    u = users[name];
    if (!u || passwd != u.passwd) {
        return '';
    }
    uuid = getUUID();
    activity[uuid] = {
        name: name,
        timer: setTimeout(() => {
            delete activity[uuid];
        }, ACT_TIMEOUT) // 过期清除
    }
    return uuid;
}

// 检查 UUID 登录状态，admin 参数指定是否需要检查管理员权限，若检查通过返回用户名，否则返回空串
function getUserWithUUID(uuid, admin = false) {
    a = activity[uuid];
    if (!a) {
        return '';
    }
    // 每次使用 UUID 都刷新其定时器
    clearTimeout(a.timer);
    a.timer = setTimeout(() => {
        delete activity[uuid];
    }, ACT_TIMEOUT);
    if (admin) {
        return users[a.name].isAdmin ? a.name : '';
    }
    return a.name;
}

module.exports = {
    userLogIn: userLogIn,
    getUserWithUUID: getUserWithUUID
}