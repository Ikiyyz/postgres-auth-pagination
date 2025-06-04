const express = require("express");
const router = express.Router();

module.exports = function (db) {
  function checkLogin(req, res, next) {
    if (!req.session.user) return res.redirect("/");
    next();
  }

  router.get("/", checkLogin, (req, res) => {
    const user = req.session.user;
    const limit = 5;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) AS total FROM todos WHERE userid = $1`;
    const todosQuery = `SELECT * FROM todos WHERE userid = $1 ORDER BY id LIMIT $2 OFFSET $3`;

    db.query(countQuery, [user.id], (err, countResult) => {
      if (err) return res.send("Error counting todos");

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      db.query(todosQuery, [user.id, limit, offset], (err, todosResult) => {
        if (err) return res.send("Error getting todos");

        res.render("todos/list", {
          todos: todosResult.rows,
          page,
          totalPages,
        });
      });
    });
  });

  router.post("/add", checkLogin, (req, res) => {
    const { title, deadline } = req.body;
    const user = req.session.user;

    if (!title || !deadline) return res.send("Title dan deadline wajib diisi");

    const sql = `INSERT INTO todos (title, deadline, userid) VALUES ($1, $2, $3)`;
    db.query(sql, [title, deadline, user.id], (err) => {
      if (err) return res.send("Error adding todo: " + err.message);
      res.redirect("/todos");
    });
  });

  router.post("/edit/:id", checkLogin, (req, res) => {
    const { title, deadline, complete } = req.body;
    const id = req.params.id;

    const sql = `UPDATE todos SET title = $1, deadline = $2, complete = $3 WHERE id = $4 AND userid = $5`;
    db.query(sql, [title, deadline, complete === "on", id, req.session.user.id], (err) => {
      if (err) return res.send("Error editing todo: " + err.message);
      res.redirect("/todos");
    });
  });

  router.get("/delete/:id", checkLogin, (req, res) => {
    const id = req.params.id;
    const sql = `DELETE FROM todos WHERE id = $1 AND userid = $2`;
    db.query(sql, [id, req.session.user.id], (err) => {
      if (err) return res.send("Error deleting todo: " + err.message);
      res.redirect("/todos");
    });
  });

  router.get("/detail/:id", checkLogin, (req, res) => {
    const id = req.params.id;
    const sql = `SELECT * FROM todos WHERE id = $1 AND userid = $2`;
    db.query(sql, [id, req.session.user.id], (err, result) => {
      if (err) return res.send("Error fetching todo: " + err.message);
      res.render("todos/detail", { todo: result.rows[0] });
    });
  });

  return router;
};
