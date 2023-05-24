function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}

function checkCookie(cname, cvvalue) {
    var cvalue = getCookie(cname);
    if (cvalue != "" && cvalue === cvvalue) {
        return true;
    } else {
        return false;
    }
}

function setCookie(cname, cvalue, exhours) {
    var d = new Date();
    var h = 60 * 60 * 1000
    d.setTime(d.getTime() + (exhours * h));
    var expires = "expires=" + d.toGMTString();
    document.cookie = cname + "=" + cvalue + "; " + expires + "; path=/";
}

function errorPwd() {
    alert('密码错误！');
    if (history.length === 1) {
        window.opener = null;
        window.open('', '_self');
        window.close();
    } else {
        history.back();
    }
    return false;
}
