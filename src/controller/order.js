const Base = require('./base.js');
const dayjs = require("dayjs");

module.exports = class extends Base {
	indexAction () {
		return this.display();
	}

	async addCartGoodsAction () {
		let params = this.post();
		let l_user_id = params.l_user_id;
		let goods_isbn = params.goods_isbn;
		let model = this.model("t_goods_info");
		let detail = await model.where({ goods_isbn: goods_isbn }).find();
		if (think.isEmpty(detail)) {
			return this.fail(1000, "未找到商品数据！", {});
		}
		let cartModel = this.model("t_cart");
		let count = await cartModel.where({ user_id: l_user_id, status: 0 }).count();
		if (count >= 7) {
			return this.fail(1000, "购物车已满7本！", {});
		}
		let insterId = await cartModel.add({
			user_id: l_user_id,
			goods_id: detail.id,
			add_time: dayjs().unix()
		})
		this.success({ id: insterId }, "添加成功！");
	}

	async delCartGoodsAction () {
		let params = this.post();
		let id = params.id;
		let cartModel = this.model("t_cart");
		await cartModel.where({ id: id }).update({ status: 2 })
		this.success({}, "success");
	}

	async getCartAction () {
		let params = this.post();
		let l_user_id = params.l_user_id;
		let info = await this.getCartGoodsInfo(l_user_id);
		this.success(info, "success");
	}

	async getCartGoodsInfo (l_user_id) {
		let cartModel = this.model("t_cart");
		let where = { status: 0, user_id: l_user_id };
		let list = await cartModel.alias("a")
			.join({
				table: "t_goods_info",
				join: "left",
				as: "b",
				on: ["goods_id", "id"]
			}).where(where)
			.field("a.*,b.goods_name,b.price,b.face_imgs,b.goods_isbn")
			.order("b.price DESC")
			.select()
		let original_price = 0;
		let price = 0;
		if (list.length == 1) {	//单买5折
			for (let item of list) {
				item.show_price = parseFloat((item.price * 0.5).toFixed(2));
			}
		} else if (list.length <= 3) {
			list.forEach((item, index) => {
				if (index == 0) {
					item.show_price = item.price;
				} else {
					item.show_price = 0;
				}
			});
		} else if (list.length <= 7) {
			list.forEach((item, index) => {
				if (index < 2) {
					item.show_price = item.price;
				} else {
					item.show_price = 0;
				}
			});
		}
		for (let item of list) {
			original_price += item.price;
			price += item.show_price;
		}
		let discount_price = (original_price - price).toFixed(2);
		original_price = original_price.toFixed(2);
		price = price.toFixed(2);

		return { original_price, price, discount_price, goods_list: list };
	}

	getOrderNo () {
		let random = "";
		for (let i = 0; i < 4; i++) {
			random = `${random}${Math.floor(Math.random() * 10)}`
		}
		return `${dayjs().format("YYMMDDHHmmss")}${random}`;
	}

	async createAction () {
		let params = this.post();
		let l_user_id = params.l_user_id;
		let is_paid = params.is_paid;
		let info = await this.getCartGoodsInfo(l_user_id);
		if (info.goods_list.length == 0) {
			return this.fail(1000, "购物车暂无书籍！", {});
		}
		let goods_ids = info.goods_list.map(it => it.goods_id).join(",");

		let order = {
			original_price: info.original_price,
			price: info.price,
			discount_price: info.discount_price,
			goods_ids: goods_ids,
			status: is_paid == 1 ? 1 : 0,
			pay_type: is_paid == 1 ? 1 : 0,
			add_time: dayjs().unix(),
			user_id: l_user_id,
			order_no: this.getOrderNo(),
		};
		let orderModel = this.model("t_order");
		let insterId = await orderModel.add(order);
		let cartModel = this.model("t_cart");
		let cartUpdateInfo = info.goods_list.map(it => {
			return {
				id: it.id,
				status: 1
			}
		})
		await cartModel.updateMany(cartUpdateInfo);
		this.success({ id: insterId }, "success");
	}

	async listAction () {
		let params = this.post();
		let l_user_id = params.l_user_id;
		let status = params.status;
		let pageNo = params.page_no || 1;
		let pageSize = params.page_size || 12;

		let orderModel = this.model("t_order");

		let where = {
			user_id: l_user_id
		};
		if (!status || status == 1) {
			where.status = ["IN", [0, 1]]
		} else if (status == 2) {
			where.status = 0;
		} else if (status == 3) {
			where.status = 1;
		} else {
			return this.fail(1000, "status 参数非法！")
		}

		let list = await orderModel.where(where)
			.page(pageNo, pageSize)
			.countSelect();

		this.success(this.handlePage(list))
	}

	async setPaidAction () {
		let params = this.post();
		let id = params.id;
		let orderModel = this.model("t_order");
		await orderModel.where({ id: id }).update({ status: 1, pay_type: 1 });
		this.success({}, "")
	}

	async delAction () {
		let params = this.post();
		let id = params.id;
		let orderModel = this.model("t_order");
		await orderModel.where({ id: id }).update({ status: 2 });
		this.success({}, "")
	}

	async detailAction () {
		let params = this.post();
		let id = params.id;
		let orderModel = this.model("t_order");
		let order = await orderModel.where({ id: id, status: ["IN", [0, 1]] }).find();
		if (think.isEmpty(order)) {
			return this.fail(1000, "暂无订单信息！")
		}
		let goodsModel = this.model("t_goods_info");
		let ids = order.goods_ids.split(",");
		let gList = await goodsModel.where({ id: ["IN", ids] }).select();
		let list = [];
		for (let item of ids) {
			list.push(gList.find(it => it.id == item));
		}
		list.sort((a, b) => {
			return b.price - a.price;
		})

		if (list.length == 1) {	//单买5折
			for (let item of list) {
				item.show_price = parseFloat((item.price * 0.5).toFixed(2));
			}
		} else if (list.length <= 3) {
			list.forEach((item, index) => {
				if (index == 0) {
					item.show_price = item.price;
				} else {
					item.show_price = 0;
				}
			});
		} else if (list.length <= 7) {
			list.forEach((item, index) => {
				if (index < 2) {
					item.show_price = item.price;
				} else {
					item.show_price = 0;
				}
			});
		}
		this.success({
			...order,
			goods_list: list
		})
	}

	async myStatAction () {
		let params = this.post();
		let l_user_id = params.l_user_id;
		let orderModel = this.model("t_order");
		let orderList = await orderModel.where({ user_id: l_user_id, status: ["IN", [0, 1]] }).select();
		let stat = {
			order_count: orderList.length,
			order_paid_count: orderList.filter(it => it.status == 1).length,
			order_uppaid_count: orderList.filter(it => it.status == 0).length,
		}
		let price = 0;
		let price_paid = 0;
		let price_unpaid = 0;
		let count = 0;
		let original_price = 0;
		let discount_price = 0;
		for (let item of orderList) {
			price += item.price;
			if (item.status == 0) {
				price_unpaid += item.price;
			} else {
				price_paid += item.price;
				count += item.goods_ids.split(",").length;
				original_price += item.original_price;
				discount_price += item.discount_price;
			}
		}
		stat.price = price.toFixed(2);
		stat.price_paid = price_paid.toFixed(2);
		stat.price_unpaid = price_unpaid.toFixed(2);
		stat.count = count;
		stat.original_price = original_price.toFixed(2);
		stat.discount_price = discount_price.toFixed(2);
		this.success(stat, "");
	}

	async shopStatAction () {
		let params = this.post();
		let orderModel = this.model("t_order");
		let orderList = await orderModel.where({ status: 1 }).select();
		let day_price = 0;
		let day_order = 0;
		let day_count = 0;
		let total_price = 0;
		let total_order = 0;
		let total_count = 0;
		let curr = dayjs();
		for (let item of orderList) {
			let book_count = item.goods_ids.split(",").length;
			if (dayjs(item.add_time * 1000).isSame(curr, "day")) {
				day_price += item.price;
				day_order += 1;
				day_count += book_count
			}
			total_price += item.price;
			total_count += book_count;
		}
		total_order = orderList.length;
		total_price = total_price.toFixed(2);
		day_price = day_price.toFixed(2);
		this.success({
			day_price, day_order, day_count, total_price, total_order, total_count
		})
	}
};
