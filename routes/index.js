const express = require("express");
const {
  generatePassword,
  comparePassword,
  checkLogin,
} = require("../helpers/utils");
const path = require("path");
const router = express.Router();

module.exports = function (db) {
  router.get("/", function (req, res) {
    const successMessage = req.flash("success");
    const errorMessage = req.flash("error");

    res.render("login", {
      successMessage: successMessage[0] || null,
      errorMessage: errorMessage[0] || null,
    });
  });

  router.get("/register", function (req, res) {
    const errorMessage = req.flash("error");

    res.render("register", {
      errorMessage: errorMessage[0] || null,
    });
  });

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

      req.session.user = {
        id: user.id,
        email: user.email,
        avatar: user.avatar,
      };

      return res.redirect("/todos");
    } catch (err) {
      req.flash("error", "Login error: " + err.message);
      return res.redirect("/");
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

  router.get("/users/avatar", checkLogin, function (req, res) {
    res.render("avatar", {
      user: req.session.user,
      avatar: req.session.user.avatar || null,
      errorMessage: req.flash("error")[0] || null,
    });
  });

  router.post("/users/avatar", checkLogin, function (req, res) {
    if (!req.files || !req.files.avatar) {
      console.log("req.files:", req.files);
      req.flash("error", "Tidak ada file yang diupload");
      return res.redirect("/users/avatar");
    }

    const avatar = req.files.avatar;
    const fileExt = path.extname(avatar.name);
    const fileName = `${req.session.user.id}_${Date.now()}${fileExt}`;
    const uploadPath = path.join(
      __dirname,
      "../public/images/avatars",
      fileName
    );

    avatar.mv(uploadPath, function (err) {
      if (err) {
        req.flash("error", "Gagal upload: " + err.message);
        return res.redirect("/users/avatar");
      }
      console.log("File berhasil diupload ke:", uploadPath);

      db.query(
        "UPDATE users SET avatar = $1 WHERE id = $2",
        [fileName, req.session.user.id],
        function (dbErr) {
          if (dbErr) {
            req.flash("error", "Gagal update database: " + dbErr.message);
            return res.redirect("/users/avatar");
          }

          req.session.user.avatar = fileName;
          return res.redirect("/todos");
        }
      );
    });
  });

  return router;
};
