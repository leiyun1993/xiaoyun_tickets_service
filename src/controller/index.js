const Base = require('./base.js');
const dayjs = require("dayjs");

module.exports = class extends Base {
    indexAction() {
        return this.display();
    }

    async __before() {
    }

    
};
