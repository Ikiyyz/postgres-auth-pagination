const express = require("express");
const router = express.Router();
const moment = require("moment");

module.exports = function (db) {
  const checkLogin = (req, res, next) => {
    if (!req.session.user) return res.redirect("/");
    next();
  };

  router.get("/", checkLogin, async function (req, res) {
    try {
      const {
        page = 1,
        title,
        startdate,
        enddate,
        complete,
        operator,
        sortBy = "deadline",
        sortMode = "asc",
      } = req.query;

      const limit = 5;
      const offset = limit * (page - 1);

      const filters = [];
      const values = [];

      const baseCondition = `userid = $${values.length + 1}`;
      values.push(req.session.user.id);

      if (title) {
        values.push(`%${title}%`);
        filters.push(`title ILIKE $${values.length}`);
      }

      if (startdate && enddate) {
        values.push(startdate);
        values.push(`${enddate} 23:59:59`);
        filters.push(
          `deadline BETWEEN $${values.length - 1} AND $${values.length}`
        );
      } else if (startdate) {
        values.push(startdate);
        filters.push(`deadline >= $${values.length}`);
      } else if (enddate) {
        values.push(`${enddate} 23:59:59`);
        filters.push(`deadline <= $${values.length}`);
      }

      if (complete === "true" || complete === "false") {
        values.push(complete === "true");
        filters.push(`complete = $${values.length}`);
      }

      const whereClause =
        filters.length > 0
          ? `WHERE ${baseCondition} AND (${filters.join(
              ` ${operator.toUpperCase()} `
            )})`
          : `WHERE ${baseCondition}`;

      // Validasi sorting
      const validFields = ["title", "complete", "deadline"];
      const safeSortBy = validFields.includes(sortBy) ? sortBy : null;
      const safeSortMode = sortMode === "desc" ? "DESC" : "ASC";

      // query total data
      let sql = `SELECT * FROM todos ${whereClause}`;
      let sqlCount = `SELECT COUNT(*) AS total FROM todos ${whereClause}`;

      if (safeSortBy) {
        sql += ` ORDER BY ${safeSortBy} ${safeSortMode}`;
      }

      sql += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);

      // query total pagination
      const countResult = await db.query(
        sqlCount,
        values.slice(0, values.length - 2)
      );
      const total = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(total / limit);

      // query todo
      const todosResult = await db.query(sql, values);

      const urlSearchParams = new URLSearchParams(req.query);
      urlSearchParams.delete("page");
      const paginationQuery = urlSearchParams.toString()
        ? urlSearchParams.toString() + "&"
        : "";

      res.render("todos/list", {
        todos: todosResult.rows,
        currentPage: Number(page),
        totalPages,
        query: req.query,
        user: req.session.user,
        offset,
        sortBy: sortBy || "",
        sortMode: sortMode || "",
        moment,
        paginationQuery,
      });
    } catch (err) {
      console.error(err);
      res.send("Terjadi kesalahan saat mengambil data");
    }
  });

  router.get("/add", checkLogin, (req, res) => {
    res.render("todos/add", {
      user: req.session.user,
    });
  });

  // add a new todo
  router.post("/add", checkLogin, (req, res) => {
    const { title } = req.body;
    const user = req.session.user;

    if (!title) {
      return res.send("Title is required and cannot be empty.");
    }

    const deadline = moment().add(1, "days").toDate();

    const sql = `INSERT INTO todos (title, deadline, complete, userid) VALUES ($1, $2, $3, $4)`;
    db.query(sql, [title, deadline, false, user.id], (err) => {
      if (err) return res.send("Error adding todo: " + err.message);
      res.redirect("/todos");
    });
  });

  router.post("/edit/:id", checkLogin, (req, res) => {
    const { title, deadline, complete } = req.body;
    const id = req.params.id;

    const sql = `UPDATE todos SET title = $1, deadline = $2, complete = $3 WHERE id = $4 AND userid = $5`;
    db.query(
      sql,
      [title, deadline, complete === "on", id, req.session.user.id],
      (err) => {
        if (err) return res.send("Error editing todo: " + err.message);
        res.redirect("/todos");
      }
    );
  });

  router.get("/edit/:id", checkLogin, (req, res) => {
    const id = req.params.id;
    const sql = `SELECT * FROM todos WHERE id = $1 AND userid = $2`;
    db.query(sql, [id, req.session.user.id], (err, result) => {
      if (err) return res.send("Error fetching todo: " + err.message);
      if (result.rows.length === 0) return res.send("Todo not found");
      res.render("todos/edit", { todo: result.rows[0], moment });
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

  return router;
};
