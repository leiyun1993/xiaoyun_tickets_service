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

    getGoodsListAction () {

    }

    getFreeListAction () {

    }

    addFreeAction () {
        let rules = {
            goods_ids: { required: true },
        }
        let msgs = {
            required: '{name} 不能为空',
        }
        let flag = this.validate(rules, msgs);
        if (!flag) {
            return this.fail(this.objStr(this.validateErrors), {})
        }
    }

    addFreeAllAction () {
        let rules = {
            is_all: { required: true },
        }
        let msgs = {
            required: '{name} 不能为空',
        }
        let flag = this.validate(rules, msgs);
        if (!flag) {
            return this.fail(this.objStr(this.validateErrors), {})
        }
    }

    delFreeAction () {
        let rules = {
            goods_id: { required: true },
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
