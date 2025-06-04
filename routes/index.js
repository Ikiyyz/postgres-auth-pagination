const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

module.exports = function (db) {
  // Halaman login
  router.get("/", function (req, res) {
    const successMessage = req.session.success || null;
    delete req.session.success;
    res.render("login", {
      successMessage,
      errorMessage: null,
    });
  });

  // Halaman register
  router.get("/register", function (req, res) {
    res.render("register", {
      errorMessage: null, 
    });
  });

  // Proses register
  router.post("/register", async function (req, res) {
    const { email, password, repassword } = req.body;
    console.log(req.body);

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

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(`INSERT INTO users (email, password) VALUES ($1, $2)`, [
        email,
        hashedPassword,
      ]);

      req.session.success = "Berhasil daftar, silakan login!";
      return res.redirect("/");
    } catch (err) {
      return res.render("register", {
        errorMessage: "Error saat registrasi: " + err.message,
      });
    }
  });

  // Proses login
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
      const match = await bcrypt.compare(password, user.password);

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
