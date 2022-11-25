const Base = require('./base.js');
const dayjs = require("dayjs");

module.exports = class extends Base {
	indexAction () {
		return this.display();
	}

	async syncFreeGoodsAction () {
		let model = this.model("goods_info_list");
		model._pk = "goods_id";
		let where = {
			'f.goods_id': [">", 0],
			'g.is_active': ["!=", 1]
		}
		let list = await model.alias("g")
			.join({
				table: 'SELECT * FROM goods_free WHERE is_active=1',
				join: 'left',
				as: 'f',
				on: ['goods_id', 'goods_id']
			}).where(where)
			.field('g.*,f.is_active as f_is_active')
			.select();

		if (list.length > 0) {
			let freeModel = this.model("goods_free");
			freeModel._pk = "goods_id";
			let updateList = list.map(it => {
				return {
					goods_id: it.goods_id,
					is_active: 0,
				}
			})
			freeModel.updateMany(updateList);
		}
		console.log(`共更新了${list.length}条数据`);
		return this.success({ },`共更新了${list.length}条数据`)
	}

	async getGoodsListAction () {
		let params = this.post();
		let pageNo = params.page_no || 1;
		let pageSize = params.page_size || 10;
		let goods_name = params.goods_name || "";
		let class_id = params.class_id || "";
		let goods_key = params.goods_key || "";
		let min_price = params.min_price || "";
		let max_price = params.max_price || "";

		let model = this.model("goods_info_list");
		model._pk = "goods_id";
		let where = {
			'f.goods_id': null,
			'g.is_active': 1,
		}

		if (goods_name) {
			where['g.goods_name'] = ["like", `%${goods_name}%`];
		}
		if (class_id) {
			where['g.class_id'] = ["like", `%.${class_id}.%`];
		}
		if (goods_key) {
			where['g.goods_key'] = goods_key;
		}
		if (min_price && max_price) {
			where['g.origin_price'] = ["BETWEEN", min_price, max_price];
		} else if (min_price) {
			where['g.origin_price'] = [">=", min_price];
		} else if (max_price) {
			where['g.origin_price'] = ["<=", max_price];
		}

		let list = await model.alias("g")
			.join({
				table: 'SELECT * FROM goods_free WHERE is_active=1',
				join: 'left',
				as: 'f',
				on: ['goods_id', 'goods_id']
			}).where(where)
			.field('g.*')
			.page(pageNo, pageSize)
			.countSelect();
		for (let item of list.data) {
			let saveNum = await think.cache(`goods_num:${item.goods_id}`, undefined, 'redis');
			console.log("saveNum", saveNum);
			item.save_num = saveNum ? saveNum : 0;
		}

		return this.success({ list: list.data, total: list.count })
	}

	async getFreeListAction () {
		let params = this.post();
		let goods_name = params.goods_name || "";
		let class_id = params.class_id || "";
		let start_time = params.start_time || "";
		let end_time = params.end_time || "";
		let goods_key = params.goods_key || "";
		let pageNo = params.page_no || 1;
		let pageSize = params.page_size || 10;
		let classModel = this.model("goods_class");
		let classList = await classModel.where({ is_active: 1 }).select();
		for (let item of classList) {
			item.temp_class_id = `.${item.class_id}.`;
		}
		let model = this.model("goods_free");
		model._pk = "goods_id";
		let where = {
			'f.is_active': 1,
			// 'g.is_active': 1,
		}

		if (start_time && end_time) {
			let startTime = dayjs(start_time).startOf("day").format("YYYY-MM-DD HH:mm:ss");
			let endTime = dayjs(end_time).endOf("day").format("YYYY-MM-DD HH:mm:ss");
			where['f.create_time'] = ["BETWEEN", startTime, endTime];
		}

		if (goods_name) {
			where['g.goods_name'] = ["like", `%${goods_name}%`];
		}
		if (class_id) {
			where['g.class_id'] = ["like", `%.${class_id}.%`];
		}
		if (goods_key) {
			where['g.goods_key'] = goods_key;
		}

		let list = await model.alias("f")
			.join({
				table: 'goods_info_list',
				join: 'left',
				as: 'g',
				on: ['goods_id', 'goods_id']
			}).where(where)
			.field('f.create_time as f_create_time, f.is_active,g.*')
			.order("f.create_time DESC")
			.page(pageNo, pageSize)
			.countSelect();
		for (let item of list.data) {
			let classArr = item.class_id.split(",");
			let className = classList.filter(it => {
				return classArr.includes(it.temp_class_id);
			}).map(it => {
				return it.class_name;
			}).join("、");
			item.class_name = className;
			let saveNum = await think.cache(`goods_num:${item.goods_id}`, undefined, 'redis');
			console.log("saveNum", saveNum);
			item.save_num = saveNum ? saveNum : 0;
		}
		return this.success({ list: list.data, total: list.count })
	}

	/**
	 * 添加免费送书书籍
	 */
	async addFreeAction () {
		let params = this.post();
		let goods_ids = params.goods_ids || "";
		let arr = goods_ids.split(",").map(Number).filter(it => {
			return it > 0;
		}).map(it => {
			return {
				goods_id: it,
				is_active: 1,
				create_time: dayjs().format("YYYY-MM-DD HH:mm:ss")
			}
		});
		let model = this.model("goods_free");
		model._pk = "goods_id";
		let hasList = await model.where({ goods_id: ['in', goods_ids] }).select()
		let hasIds = hasList.map(it => {
			return it.goods_id;
		}).map(Number);

		let updateList = arr.filter(it => {
			return hasIds.includes(it.goods_id)
		})
		let addList = arr.filter(it => {
			return !hasIds.includes(it.goods_id)
		})
		try {
			if (addList.length > 0) {
				await model.addMany(addList)
			}
			if (updateList.length > 0) {
				await model.updateMany(updateList)
			}
			this.success({})
		} catch (e) {
			console.log(e);
			this.fail(1000, "数据异常", {})
		}
	}

	/**
	 * 添加免费送书书籍
	 */
	async addFreeAllAction () {
		let params = this.post();
		let goods_name = params.goods_name || "";
		let class_id = params.class_id || "";
		let goods_key = params.goods_key || "";
		let min_price = params.min_price || 0;
		let max_price = params.max_price || "";

		let goodsModel = this.model("goods_info_list");
		goodsModel._pk = "goods_id";
		let where = {
			is_active: 1,
			price: {},
		}

		if (goods_name) {
			where['goods_name'] = ["like", `%${goods_name}%`];
		}
		if (class_id) {
			where['class_id'] = ["like", `%.${class_id}.%`];
		}
		if (goods_key) {
			where['goods_key'] = goods_key;
		}
		where['price'][">="] = min_price;
		if (max_price && max_price > 0) {
			where['price']["<="] = max_price;
		}
		let goodsList = await goodsModel.where(where).select();
		if (goodsList.length <= 0) {
			return this.success({});
		}
		let goods_ids = [];
		let arr = [];
		let curr = dayjs().format("YYYY-MM-DD HH:mm:ss");
		for (let item of goodsList) {
			arr.push({
				goods_id: item.goods_id,
				is_active: 1,
				create_time: curr
			})
			goods_ids.push(item.goods_id);
		}
		goods_ids = goods_ids.join(",")

		let model = this.model("goods_free");
		model._pk = "goods_id";
		let hasList = await model.where({ goods_id: ['in', goods_ids] }).select()
		let hasIds = hasList.map(it => {
			return it.goods_id;
		}).map(Number);

		let updateList = arr.filter(it => {
			return hasIds.includes(it.goods_id)
		})
		let addList = arr.filter(it => {
			return !hasIds.includes(it.goods_id)
		})
		try {
			if (addList.length > 0) {
				await model.addMany(addList)
			}
			if (updateList.length > 0) {
				await model.updateMany(updateList)
			}
			this.success({})
		} catch (e) {
			console.log(e);
			this.fail(1000, "数据异常", {})
		}
	}

	/**
	 * 删除免费送书书籍
	 */
	async delFreeAction () {
		let params = this.post();
		let goods_id = params.goods_id || "";
		let model = this.model("goods_free");
		model._pk = "goods_id";
		let data = await model.where({ goods_id: goods_id }).find();
		if (think.isEmpty(data)) {
			// 内容为空时的处理
			return this.fail(1000, "无此商品", {});
		}
		let rows = await model.where({ goods_id: goods_id }).update({ is_active: 0 });
		this.success({}, "删除成功")
	}


	async testAction () {
		let params = this.post();
		if (!params.ids) {
			return this.fail(1000, "ids?", {})
		}
		let goodsIdList = params.ids.split(",");
		for (let item of goodsIdList) {
			let random = 10 + parseInt(Math.random() * 10);
			let res = await think.cache(`goods_num:${item}`, random, 'redis');
			console.log("res", res);
		}
		this.success({}, "设置成功")
	}

};
