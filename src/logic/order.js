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

    rollInfoAction () {

    }

    
};
