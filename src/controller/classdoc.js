const Base = require('./base.js');
const dayjs = require("dayjs");

module.exports = class extends Base {
    indexAction () {
        return this.display();
    }

    async listAction () {
        let params = this.post();
        let wikiModel = this.model("classdoc_list");
        let pageNo = params.page_no || 1;
        let pageSize = params.page_size || 10;
        let type = params.type || "";
        let status = params.status || "";
        let title = params.title || "";
        let where = {
            is_del: 0,
        }
        if (type) {
            where.type = type;
        }
        if (status) {
            where.status = status;
        }
        if (title) {
            where.title = ["like",`%${title}%`];
        }
        let list = await wikiModel.where(where).order('add_time DESC').page(pageNo, pageSize).countSelect();
        for(let item of list.data){
            delete item.content;
        }
        return this.success({ list: list.data, total: list.count })
    }

    async editAction () {
        let params = this.post();

        let model = this.model("classdoc_list");
        if (!params.id) {
            params.add_time = dayjs().unix();
            let id = await model.add(params);
            return this.success({ id: id });
        } else {
            let wiki = await model.where({ id: params.id, is_del: 0 }).find();
            if (think.isEmpty(wiki.id)) {
                return this.fail(1004, `编辑的内容不存在！`, {});
            }
            let row = await model.where({ id: params.id, is_del: 0 }).update(params);
        }
        return this.success({});
    }

    async getAction () {
        let params = this.post();
        let model = this.model("classdoc_list");
        let wiki = await model.where({ id: params.id, is_del: 0 }).find();
        if (think.isEmpty(wiki)) {
            return this.fail(1004, `内容不存在！`, {});
        }
        if(params.clientId == 'songshuke_agent'){
            model.where({ id: params.id, is_del: 0 }).increment('read_times', 1);
        }
        return this.success(wiki);
    }

    async deleteAction () {
        let params = this.post();

        let model = this.model("classdoc_list");
        let wiki = await model.where({ id: params.id, is_del: 0 }).find();
        if (think.isEmpty(wiki.id)) {
            return this.fail(1004, `删除的内容不存在！`, {});
        }
        let row = await model.where({ id: params.id, is_del: 0 }).update({ is_del: 1 });
        return this.success({});
    }

    async changeStatusAction () {
        let params = this.post();
        
        let model = this.model("classdoc_list");
        let wiki = await model.where({ id: params.id, is_del: 0 }).find();
        if (think.isEmpty(wiki.id)) {
            return this.fail(1004, `操作的内容不存在！`, {});
        }
        let row = await model.where({ id: params.id, is_del: 0 }).update({ status: params.status });
        return this.success({});
    }

};
