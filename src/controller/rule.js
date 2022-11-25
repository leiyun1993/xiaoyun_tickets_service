const Base = require('./base.js');
const dayjs = require("dayjs");
var q = require('qiao-weixin');
let OSS = require('ali-oss');
var path = require("path");
const fs = require('fs'); // 引入文件系统模块

module.exports = class extends Base {
    indexAction () {
        return this.display();
    }

    async getDetailAction () {
        let params = this.post();
        let id = params.id;
        let model = this.model("config_list");
        let rule = await model.where({ id: id }).find();
        this.success(rule, "success");
    }

    async getQrCodeAction () {
        let params = this.post();
        let page = params.page || "pages/index/index";
        let scene = params.scene || "";
        let uid = params.uid || "";
        let env_version = params.env_version || "release";
        let client = new OSS({
            region: this.config().AliOSSRegion,
            accessKeyId: this.config().AliOSSAccessId,
            accessKeySecret: this.config().AliOSSAccessKey,
            bucket: this.config().AliOSSBucket,
        });
        let fileName = `${uid}_${this.md5(page + scene)}.png`;
        let ossFileName = `app/qrcode/${fileName}`;
        try {
            await client.head(ossFileName, {});
            console.log('文件存在')
            return this.success({
                url: this.config().AliOSSDomain + ossFileName
            }, "success");
        } catch (error) {
            if (error.code === 'NoSuchKey') {
                console.log('文件不存在')
            }
        }

        let residKey = "wx_access_token:";
        let wx_access_token = await think.cache(residKey, undefined, 'redis');
        console.log(wx_access_token);
        if (!wx_access_token) {
            let appId = this.config().AppId;
            let appSecret = this.config().AppSecret;
            console.log(appId);
            let tokenInfo = await q.accessToken(appId, appSecret);
            console.log(tokenInfo.access_token);
            await this.cache(residKey, tokenInfo.access_token, {
                type: 'redis',
                redis: {
                    timeout: (tokenInfo.expires_in - 100) * 1000
                }
            });
            wx_access_token = tokenInfo.access_token;
        }

        let filePath = think.ROOT_PATH + '/qrcode/' + fileName;

        console.log("filePath", filePath);
        let qrParams = {
            page: page,
            scene: scene
        };
        if(env_version == "trial"){
            qrParams.env_version = env_version;
            qrParams.check_path = false;
        }
        console.log("qrParams",qrParams);
        try {
            await q.mpCodeFile(2, wx_access_token, qrParams, filePath);
        } catch (e) {
            console.log("生成失败，重试一次");
        }
        if (!fs.existsSync(filePath)) {     //生成失败，重试一次
            let appId = this.config().AppId;
            let appSecret = this.config().AppSecret;
            console.log(appId);
            let tokenInfo = await q.accessToken(appId, appSecret);
            console.log(tokenInfo.access_token);
            await this.cache(residKey, tokenInfo.access_token, {
                type: 'redis',
                redis: {
                    timeout: (tokenInfo.expires_in - 100) * 1000
                }
            });
            wx_access_token = tokenInfo.access_token;
            try {
                await q.mpCodeFile(2, wx_access_token, qrParams, filePath);
            } catch (e) {
                console.log("再次失败");
            }
        }

        if (!fs.existsSync(filePath)) {
            return this.fail(1001, "二维码获取失败", {})
        }

        // let file = dataURLtoFile(base64, 'qrCode.png');

        ///app/qrcode/leiyun-2022-09-10.png

        const result = await client.put(ossFileName, path.normalize(filePath));
        fs.unlink(filePath, (err) => {
            if (err) {
                console.log('删除失败');
            } else {
                console.log('删除成功');
            }
        });
        console.log("result", result);
        this.success({
            url: this.config().AliOSSDomain + result.name
        }, "success");
    }
};
