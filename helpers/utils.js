const bcrypt = require("bcrypt");
const saltRounds = 10;

function generatePassword(password) {
  return bcrypt.hashSync(password, saltRounds);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

const checkLogin = (req, res, next) => {
  if (!req.session.user) return res.redirect("/");
  next();
};

module.exports = {
  generatePassword,
  comparePassword,
  checkLogin,
};
