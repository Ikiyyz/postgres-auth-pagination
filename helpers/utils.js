const bycrpt = require('bcrypt');
const salrtRounds = 10;

module.exports = {
    generatePassword : function(password) {
        return bycrpt.hashSync(password, salrtRounds);
    },
    comparePassword : function(password, hash) {
        return bycrpt.compareSync(password, hash);
    }
}