'use strict';
const Base = require('./base.js');
const dayjs = require("dayjs");

function getRandomKey () {
    let t = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz1234567890";
    let a = t.length;
    let n = "";
    for (let i = 0; i < 7; i++) {
        n += t.charAt(Math.floor(Math.random() * a))
    };
    return `${n}`
}
module.exports = class extends Base {
    indexAction () {
        return this.display();
    }

    async __before () {
    }

    /**
     * 新增
     * @returns 
     */
    async addAction () {
        let params = this.post();
        let curr = dayjs().unix();
        let obj = {
            name: params.name,
            address: params.address,
            address_desc: params.address_desc,
            total: params.total,
            active_time: params.active_time,
            contact: params.contact,
            end_time: params.end_time,
            add_time: curr,
            user_id: params.l_user_id
        }
        if (curr >= obj.end_time) {
            return this.fail(1000, "结束时间不能小于当前时间", {});
        }
        if (params.lat && params.lng) {
            obj.lat = params.lat;
            obj.lng = params.lng;
        }
        let model = this.model("t_tickets");
        let insertId = await model.add(obj);
        this.success({
            id: insertId
        })
    }

    /**
     * 列表
     */
    async listAction () {
        let params = this.post();
        let pageNo = params.page_no || 1;
        let pageSize = params.page_size || 12;
        let model = this.model("t_tickets");
        let where = {
            user_id: params.l_user_id,
            is_del: 0,
        }
        if (params.status) {
            where.status = params.status;
        }
        let res = await model.where(where).page(pageNo, pageSize).countSelect();
        this.success(this.handlePage(res))
    }

    /**
     * 详情
     * @returns 
     */
    async detailAction () {
        let params = this.post();
        let id = params.id;
        let l_user_id = params.l_user_id;
        let model = this.model("t_tickets");
        let logModel = this.model("t_tickets_log");

        let detail = await model.where({ id: id, is_del: 0 }).find();

        if (think.isEmpty(detail)) {
            return this.fail(1000, "活动不存在！", {});
        }
        let log = await logModel.where({ t_id: id, user_id: l_user_id, is_del: 0 }).order("add_time DESC").find();
        if (think.isEmpty(log)) {
            detail.log_id = 0;
            detail.log_status = 0;
        } else {
            detail.log_id = log.id;
            detail.log_status = log.status;
        }
        if (!detail.desc) {
            detail.desc = "";
        }
        this.success(detail)
    }

    /**
     * 领取
     */
    async receiveAction () {
        let params = this.post();
        let id = params.id;
        let model = this.model("t_tickets");
        let detail = await model.where({ id: id, is_del: 0 }).find();
        if (think.isEmpty(detail)) {
            return this.fail(1000, "活动不存在！", {});
        }
        if (detail.total <= detail.received) {
            return this.fail(1000, "已领完！", {});
        }
        let logModel = this.model("t_tickets_log");
        let received = await logModel.where({ user_id: params.l_user_id, t_id: id, is_del: 0 }).find();
        if (!think.isEmpty(received)) {
            return this.fail(1000, "已领取过了！", {});
        }
        let insertId;
        while (true) {
            let key = getRandomKey();
            let hasObj = await logModel.where({ t_id: id, key: key }).find();
            if (think.isEmpty(hasObj)) {
                let log = {
                    t_id: id,
                    key: key,
                    user_id: params.l_user_id,
                    add_time: dayjs().unix()
                }
                insertId = await logModel.add(log);
                await model.where({ id: id }).increment("received", 1)
                break;
            }
        }
        this.success({ id: insertId, t_id: id }, "领取成功！")
    }

    /**
     * 使用
     */

    async useAction () {
        let params = this.post();
        let key = params.key;
        let l_user_id = params.l_user_id;
        let logModel = this.model("t_tickets_log");
        let where = {
            "a.is_del": 0,
            "a.key": key,
            // "a.user_id": l_user_id
        }
        let log = await logModel.alias("a")
            .join({
                table: "SELECT * FROM t_tickets WHERE is_del=0",
                join: "left",
                as: "b",
                on: ["t_id", "id"]
            }).where(where)
            .field("a.*,b.status as t_status,b.name as t_name")
            .find()


        if (think.isEmpty(log)) {
            return this.fail(1000, "找不到此券！", {})
        }
        if (log.status == 2) {
            return this.fail(1000, "此券已使用！", {})
        }
        if (log.status == 3) {
            return this.fail(1000, "此券已过期！", {})
        }
        if (log.t_status == 2) {
            return this.fail(1000, `${log.t_name}已过期！`, {})
        }
        let model = this.model("t_tickets");
        await logModel.where({ id: log.id }).update({ status: 2, use_time: dayjs().unix() });
        await model.where({ id: log.t_id }).increment("used", 1);
        this.success({})
    }

    /**
     * 领取记录
     */
    async receivedListAction () {
        let params = this.post();
        let l_user_id = params.l_user_id;
        let status = params.status;
        let pageNo = params.page_no || 1;
        let pageSize = params.page_size || 12;

        let logModel = this.model("t_tickets_log");
        let where = {
            "a.is_del": 0,
            "a.user_id": l_user_id
        }
        if (status) {
            where['a.status'] = status;
        }
        let logList = await logModel.alias("a")
            .join({
                table: "SELECT * FROM t_tickets WHERE is_del=0",
                join: "left",
                as: "b",
                on: ["t_id", "id"]
            }).where(where)
            .field("a.*,b.status as t_status,b.name as t_name,b.active_time")
            .page(pageNo, pageSize)
            .countSelect()

        this.success(this.handlePage(logList))
    }

    
};
