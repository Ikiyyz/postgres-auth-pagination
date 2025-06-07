const express = require("express");
const { generatePassword, comparePassword } = require("../helpers/utils");
const router = express.Router();

module.exports = function (db) {
  // Halaman Login
  router.get("/", function (req, res) {
    const successMessage = req.flash("success");
    const errorMessage = req.flash("error");

    res.render("login", {
      successMessage: successMessage[0] || null,
      errorMessage: errorMessage[0] || null,
    });
  });

  // Halaman Register
  router.get("/register", function (req, res) {
    const errorMessage = req.flash("error");

    res.render("register", {
      errorMessage: errorMessage[0] || null,
    });
  });

  // Proses Register
  router.post("/register", async function (req, res) {
    const { email, password, repassword } = req.body;

    if (password !== repassword) {
      req.flash("error", "Password do not match");
      return res.redirect("/register");
    }

    try {
      const existingUser = await db.query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
      );

      if (existingUser.rows.length > 0) {
        req.flash("error", "Email sudah terdaftar");
        return res.redirect("/register");
      }

      const hashedPassword = generatePassword(password);
      await db.query(`INSERT INTO users (email, password) VALUES ($1, $2)`, [
        email,
        hashedPassword,
      ]);

      req.flash("success", "Successfully registered, please sign in!");
      return res.redirect("/");
    } catch (err) {
      req.flash("error", "Error saat registrasi: " + err.message);
      return res.redirect("/register");
    }
  });

  // Proses Login
  router.post("/login", async function (req, res) {
    const { email, password } = req.body;

    try {
      const result = await db.query(`SELECT * FROM users WHERE email = $1`, [
        email,
      ]);

      if (result.rows.length === 0) {
        req.flash("error", "Email is not registered");
        return res.redirect("/");
      }

      const user = result.rows[0];
      const match = comparePassword(password, user.password);

      if (!match) {
        req.flash("error", "Password is wrong");
        return res.redirect("/");
      }

      req.session.user = { id: user.id, email: user.email };
      return res.redirect("/todos");
    } catch (err) {
      req.flash("error", "Login error: " + err.message);
      return res.redirect("/");
    }
  });

  // Logout
  router.get("/logout", function (req, res) {
    req.session.destroy((err) => {
      if (err) {
        return res.send("Error saat logout");
      }
      res.redirect("/");
    });
  });

  return router;
};
