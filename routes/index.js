const express = require("express");
const { generatePassword, comparePassword } = require("../helpers/utils");
const router = express.Router();

module.exports = function (db) {
  router.get("/", function (req, res) {
    const successMessage = req.session.success || null;
    delete req.session.success;
    res.render("login", {
      successMessage,
      errorMessage: null,
    });
  });

  router.get("/register", function (req, res) {
    res.render("register", {
      errorMessage: null,
    });
  });

  router.post("/register", async function (req, res) {
    const { email, password, repassword } = req.body;

    if (password !== repassword) {
      return res.render("register", {
        errorMessage: "Password do not match",
      });
    }

    try {
      const existingUser = await db.query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
      );
      if (existingUser.rows.length > 0) {
        return res.render("register", {
          errorMessage: "Email sudah terdaftar",
        });
      }

      const hashedPassword = generatePassword(password);
      await db.query(`INSERT INTO users (email, password) VALUES ($1, $2)`, [
        email,
        hashedPassword,
      ]);

      req.session.success = "successfully registered, please sig in!";
      return res.redirect("/");
    } catch (err) {
      return res.render("register", {
        errorMessage: "Error saat registrasi: " + err.message,
      });
    }
  });

  router.post("/login", async function (req, res) {
    const { email, password } = req.body;

    try {
      const result = await db.query(`SELECT * FROM users WHERE email = $1`, [
        email,
      ]);

      if (result.rows.length === 0) {
        return res.render("login", {
          errorMessage: "email is not registered",
          successMessage: null,
        });
      }

      const user = result.rows[0];
      const match = comparePassword(password, user.password);

      if (!match) {
        return res.render("login", {
          errorMessage: "password is wrong",
          successMessage: null,
        });
      }

      req.session.user = { id: user.id, email: user.email };
      return res.redirect("/todos");
    } catch (err) {
      return res.render("login", {
        errorMessage: "Login error: " + err.message,
        successMessage: null,
      });
    }
  });

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
