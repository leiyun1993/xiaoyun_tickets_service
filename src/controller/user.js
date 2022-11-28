const Base = require('./base.js');
const dayjs = require("dayjs");
const jwt = require("jsonwebtoken");
let OSS = require('ali-oss');
var path = require("path");
const fs = require('fs'); // 引入文件系统模块

function getNickName () {
    let t = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz1234567890";
    let a = t.length;
    let n = "";
    for (let i = 0; i < 5; i++) {
        n += t.charAt(Math.floor(Math.random() * a))
    };
    return `小云用户_${n}`
}
const DEF_AVATAR = "https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132";
module.exports = class extends Base {

    async __before () {
    }
    indexAction () {
        return this.display();
    }


    async loginAction () {

        let params = this.post();
        let code = params.code;
        let auth = {};
        let user = {};
        let model = this.model("user");
        try {
            let res = await this.jscode2session(code);
            console.log("res", res);
            if (res.openid) {
                let openid = res.openid;
                let unionid = res.unionid;
                user = await model.where({ openid: openid }).find();
                if (!think.isEmpty(user)) { //登录
                    auth.id = user.id;
                    auth.nick_name = user.nick_name;
                } else {      //注册
                    user = {
                        nick_name: getNickName(),
                        avatar: DEF_AVATAR,
                        openid: openid,
                        unionid: unionid || "",
                        add_time: dayjs().unix()
                    }
                    let insertId = await model.add(user);
                    user = await model.where({ id: insertId }).find();
                    auth.id = user.id;
                    auth.nick_name = user.nick_name;
                }
            } else {
                return this.fail(1001, "微信鉴权失败！", {});
            }
        } catch (e) {
            console.log(e);
            return this.fail(1001, "微信鉴权失败！", {});
        }
        let token = jwt.sign(auth, this.config().JWT_SECRET, { expiresIn: "24h" });
        if (token) {
            user.token = token;
            await model.where({ id: user.id }).update({ token: token });
        }
        // let verifyUser = jwt.verify(token, JWT_SECRET);
        // console.log("verifyUser", verifyUser);
        this.success(user, "success")
    }

    /**
     * 获取用户信息
     */
    async getInfoAction () {
        let params = this.post();
        let model = this.model("user");
        let user = await model.where({ id: params.l_user_id }).find();
        if (think.isEmpty(user)) {
            return this.fail(1004, "用户不存在！", {});
        }
        let tModel = this.model("t_tickets");
        user.active_count = await tModel.where({ user_id: user.id, is_del: 0 }).count();
        let logModel = this.model("t_tickets_log");
        user.log_count = await logModel.where({ user_id: user.id, is_del: 0 }).count();
        delete user.token;
        this.success(user, "success")
    }

    /**
     * 编辑用户信息
     */
    async editInfoAction () {
        let params = this.post();
        let nick_name = params.nick_name;
        let avatar = params.avatar;
        let model = this.model("user");
        await model.where({ id: params.l_user_id }).update({ nick_name: nick_name, avatar: avatar });
        this.success({}, "success")
    }

    /**
     * 上传图片
     * @returns 
     */
    async uploadAction () {
        let params = this.post();
        let file = this.file('file');
        if (!file || !file.size) {
            return this.fail(1001, "请选择文件", {})
        }
        let user_id = params.l_user_id;
        let format = file.name.split(".")[file.name.split(".").length - 1];
        if (!["jpg", "jpeg", "png", "gif"].includes(format.toLowerCase())) {
            return this.fail(1001, "只能上传图片", {})
        }
        let client = new OSS({
            region: this.config().AliOSSRegion,
            accessKeyId: this.config().AliOSSAccessId,
            accessKeySecret: this.config().AliOSSAccessKey,
            bucket: this.config().AliOSSBucket,
        });
        let month = dayjs().format("YYYYMM")
        let ossFileName = `/image/${month}/${user_id}_${Date.now()}.${format}`;
        const result = await client.put(ossFileName, path.normalize(file.path));
        // console.log("result", result);
        this.success({
            url: result.url ? result.url : this.config().AliOSSDomain + result.name
        }, "success");
    }


    /**
     * 创建核销邀请
     */
    async addHelpInviteAction () {
        let params = this.post();
        let model = this.model("t_help_invite");
        let curr = dayjs().unix();
        let insertId = await model.add({
            end_time: curr + (10 * 60),
            user_id: params.l_user_id,
            add_time: curr
        })
        this.success({ id: insertId })
    }

    /**
     * 获取邀请信息
     */
    async getHelpInviteAction () {
        let params = this.post();
        let id = params.id;
        let model = this.model("t_help_invite");
        let where = {
            "a.id": id,
            "a.is_del": 0
        }
        let log = await model.alias("a")
            .join({
                table: "user",
                as: "b",
                join: "inner",
                on: ["user_id", "id"]
            })
            .where(where)
            .field("a.*,b.nick_name,b.avatar")
            .find();
        if (think.isEmpty(log)) {
            return this.fail(1000, "邀请不存在！", {})
        }
        let curr = dayjs().unix();
        if (curr > log.end_time) {
            log.expire_time = 0;
        } else {
            log.expire_time = curr - log.end_time;
        }
        this.success(log);
    }

    /**
     * 添加banner信息
     */
    async addBannerAction () {
        let params = this.post();
        let type = params.type || 0;
        let path = params.path;
        let content = params.content;
        if (type == 1 && !path) {
            return this.fail(1000, "请输入跳转路径！");
        }
        if (type == 2 && !content) {
            return this.fail(1000, "请输入说明！");
        }
        let model = this.model("t_banner");
        let banner = {
            type: type,
            content: content,
            img: params.img,
            path: path,
        }
        if (params.id) {
            let bannerObj = await model.where({ id: params.id, is_del: 0 }).find();
            if (think.isEmpty(bannerObj)) {
                return this.fail(1000, "编辑的数据不存在！");
            }
            await model.where({ id: params.id }).update(banner);
        } else {
            banner.add_time = dayjs().unix();
            let insertId = await model.add(banner);
            return this.success({ id: insertId }, "success");
        }
        return this.success({}, "success");
    }

};
