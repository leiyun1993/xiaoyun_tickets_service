module.exports = class extends think.Logic {
    indexAction() {

    }

    async __before() {
        return this.fail(1004, "Not Found !", {});  
    } 
};
