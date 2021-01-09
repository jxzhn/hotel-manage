Date.prototype.format = function(fmt) { 
    var o = { 
        "M+" : this.getMonth()+1,                 //月份 
        "d+" : this.getDate(),                    //日 
        "h+" : this.getHours(),                   //小时 
        "m+" : this.getMinutes(),                 //分 
        "s+" : this.getSeconds(),                 //秒 
        "q+" : Math.floor((this.getMonth()+3)/3), //季度 
        "S"  : this.getMilliseconds()             //毫秒 
    }; 
    if(/(y+)/.test(fmt)) {
            fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length)); 
    }
    for(var k in o) {
        if(new RegExp("("+ k +")").test(fmt)){
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
        }
    }
    return fmt; 
}

async function userLogin(name, passwd) {
    let res = await axios.post('/userLogin', {
        name: name,
        passwd: passwd
    });
    if (res.data && res.data.ok) {
        if (res.data.uuid) {
            localStorage.setItem('loginStatus', JSON.stringify({name: name, uuid: res.data.uuid}));
            return true;
        } else {
            return false;
        }
    } else { // 未知错误
        console.log(res);
        return false;
    }
}

// 若用户登录有效返回用户名，若未登录或已过期返回空串
async function getUserName() {
    if (!localStorage.loginStatus) {
        console.log('not logined.');
        return '';
    }
    loginStatus = JSON.parse(localStorage.loginStatus);
    let res = await axios.post('/getUserWithUUID', {
        uuid: loginStatus.uuid
    });
    if (res.data && res.data.ok) {
        if (!res.data.name) {
            console.log('uuid may be overdue.');
            console.log(loginStatus);
            localStorage.removeItem('loginStatus');
            return '';
        } else if (res.data.name != loginStatus.name) {
            console.log('uuid is valid, but user is wrong!');
            console.log(loginStatus);
            localStorage.removeItem('loginStatus');
            return '';
        } else {
            return loginStatus.name;
        }
    } else { // 未知错误
        console.log(res);
        return '';
    }
}

// 检查是否具有管理员权限
async function checkAdmin() {
    if (!localStorage.loginStatus) {
        console.log('check amdin failed. not logined.');
        return false;
    }
    loginStatus = JSON.parse(localStorage.loginStatus);
    let res = await axios.post('/checkAdmin', {
        uuid: loginStatus.uuid
    });
    if (res.data && res.data.ok) {
        return res.data.admin;
    } else { // 未知错误
        console.log(res);
        return false;
    }
}

function userLogOut() {
    localStorage.removeItem('loginStatus');
}

async function callFunction(method, parameters) {
    let res = await axios.post('/callFunction', {
        uuid: loginStatus.uuid,
        method: method,
        parameters: parameters
    });
    if (res.data && res.data.ok) {
        return res.data.data;
    } else {
        console.log(res);
    }
}
