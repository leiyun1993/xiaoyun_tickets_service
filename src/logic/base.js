
'use strict';
module.exports = class extends think.Logic {


	objStr (obj) {
		if (!obj) return "参数错误";
		let arr = [];
		for (let key in obj) {
			arr.push(obj[key])
		}
		return arr.join(",")
	}
};
