module.exports = class extends think.Logic {
    indexAction () {

    }

    async __before () {
        this.allowMethods = "post";
        let params = this.post();
    }

    objStr (obj) {
        if (!obj) return "参数错误";
        let arr = [];
        for (let key in obj) {
            arr.push(obj[key])
        }
        return arr.join(",")
    }

    listAction () {

    }

    editAction () {
        let params = this.post();
        if (!params.token) {
            return this.fail("参数错误", {})
        }
        let rules = {
            type: { required: true },
            title: { required: true },
            content: { required: true },
        }
        let msgs = {
            required: '{name} 不能为空',
        }
        let flag = this.validate(rules, msgs);
        if (!flag) {
            return this.fail(this.objStr(this.validateErrors), {})
        }
    }
    getAction () {
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
    deleteAction () {
        let params = this.post();
        if (!params.token) {
            return this.fail("参数错误", {})
        }
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
    changeStatusAction () {
        let params = this.post();
        if (!params.token) {
            return this.fail("参数错误", {})
        }
        let rules = {
            id: { required: true },
            status: { required: true },
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
