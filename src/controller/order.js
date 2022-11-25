const Base = require('./base.js');
const dayjs = require("dayjs");

module.exports = class extends Base {
	indexAction () {
		return this.display();
	}

	async rollInfoAction () {
		let params = this.post();
		let model = this.model("order_list");
		let goods_id = Number(params.goods_id || "");
		if (goods_id > 0) {
			let SQL = `SELECT o.uid,o.sale_price,o.id from order_list AS o ,order_goods_list as g WHERE o.id=g.order_id AND g.goods_id = ${goods_id} ORDER BY o.id DESC LIMIT 20`;

			// let list = await model.query(SQL);
			let list = await model.alias("o")
				.join({
					table: 'order_goods_list',
					join: 'left',
					as: 'g',
					on: ['id', 'order_id']
				}).join({
					table: 'user_info',
					join: 'left',
					as: 'u',
					on: ['uid', 'uid']
				}).where({ 'g.goods_id': goods_id })
				.order("id DESC")
				.limit(20)
				.select({
					field: "o.uid,o.sale_price,o.id,u.head_pic,u.user_name,g.goods_id,o.create_time"
				})
			return this.success({ list: list, total: list.length })
		} else {
			let list = await model.alias("o").join({
				table: 'user_info',
				join: 'left',
				as: 'u',
				on: ['uid', 'uid']
			}).order("id DESC")
				.limit(20)
				.select({
					field: "o.sale_price,o.id,o.uid,u.head_pic,u.user_name,o.create_time"
				});
			return this.success({ list: list, total: list.length })
		}
	}
};
