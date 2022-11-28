const Base = require('./base.js');
const dayjs = require("dayjs");



module.exports = class extends Base {

    async __before () {
    }
    indexAction () {
        return this.display();
    }

    /**
     * 获取banner信息
     */
    async bannerListAction () {
        let model = this.model("t_banner");
        let list = await model.where({ is_del: 0, status: 1 }).select();
        return this.success({ list: list }, "success");
    }

    /**
     * 获取banner详情
     */
    async bannerDetailAction () {
        let params = this.post();
        let model = this.model("t_banner");
        let banner = await model.where({ is_del: 0, id: params.id }).find();
        return this.success(banner, "success");
    }

};
