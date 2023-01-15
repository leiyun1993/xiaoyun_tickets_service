const Base = require('./base.js');
const jwt = require("jsonwebtoken");

module.exports = class extends Base {
    indexAction () {

    }

    async __before () {
        this.allowMethods = "post";
        if (this.ctx.action != "login") {
            let header = this.ctx.headers;
            let token = header.authorization ? header.authorization.replace("Bearer ", "") : "";
            if (!token) {
                return this.fail(1009, "请登录！", {});
            } else {
                try {
                    console.log("token", token);
                    let verifyUser = jwt.verify(token, this.config().JWT_SECRET);
                    if (verifyUser && verifyUser.id) {
                        this.post("l_user_id", verifyUser.id);
                    } else {
                        return this.fail(1009, "请登录！", {});
                    }
                } catch (e) {
                    console.log(e);
                    return this.fail(1009, "请登录！", {});
                }

            }
        }
    }

    objStr (obj) {
        if (!obj) return "参数错误";
        let arr = [];
        for (let key in obj) {
            arr.push(obj[key])
        }
        return arr.join(",")
    }

    addCartGoodsAction () {
        let rules = {
            goods_isbn: { required: true },
        }
        let msgs = {
            required: '{name} 不能为空',
        }
        let flag = this.validate(rules, msgs);
        if (!flag) {
            return this.fail(this.objStr(this.validateErrors), {})
        }
    }
    delCartGoodsAction () {
        let rules = {
            id: { required: true },
        }
        let msgs = {
            required: '{name} 不能为空',
        }
        let flag = this.validate(rules, msgs);
        if (!flag) {
            return this.fail(this.objStr(this.validateErrors), {})
        }
    }

    setPaidAction () {
        let rules = {
            id: { required: true },
        }
        let msgs = {
            required: '{name} 不能为空',
        }
        let flag = this.validate(rules, msgs);
        if (!flag) {
            return this.fail(this.objStr(this.validateErrors), {})
        }
    }

    delAction () {
        let rules = {
            id: { required: true },
        }
        let msgs = {
            required: '{name} 不能为空',
        }
        let flag = this.validate(rules, msgs);
        if (!flag) {
            return this.fail(this.objStr(this.validateErrors), {})
        }
    }
    detailAction () {
        let rules = {
            id: { required: true },
        }
        let msgs = {
            required: '{name} 不能为空',
        }
        let flag = this.validate(rules, msgs);
        if (!flag) {
            return this.fail(this.objStr(this.validateErrors), {})
        }
    }

};
