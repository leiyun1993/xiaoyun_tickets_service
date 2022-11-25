'use strict';
const md5 = require('js-md5');
const request = require('request');

module.exports = class extends think.Controller {
    async __before () {
        let params = this.post();
    }

    md5 (data) {
        return md5(data);
    }


    async jscode2session (code) {
        const { AppId, AppSecret } = this.config();
        return new Promise(function (resolve, reject) {
            let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${AppId}&secret=${AppSecret}&js_code=${code}&grant_type=authorization_code`
            request.get(url, function (err, response, body) {
                resolve(err ? null : JSON.parse(body));
            });
        });
    }

    handlePage (res) {
        // console.log('res',res);
        
        return {
            list: res.data,
            pager: {
                total: res.count,
                page_no: res.currentPage,
                page_size: res.pageSize,
                total_pages: res.totalPages,
            }
        }
    }

};
