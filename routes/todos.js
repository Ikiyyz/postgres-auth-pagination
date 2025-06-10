const express = require("express");
const router = express.Router();
const moment = require("moment");
const { checkLogin } = require("../helpers/utils.js");

module.exports = function (db) {
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

    // user login adalah kondisi tetap
    values.push(req.session.user.id);
    const baseCondition = `users.id = $${values.length}`;

    // dynamic filters
    if (title) {
      values.push(`%${title}%`);
      filters.push(`todos.title ILIKE $${values.length}`);
    }

    if (startdate && enddate) {
      values.push(startdate);
      values.push(`${enddate} 23:59:59`);
      filters.push(
        `todos.deadline BETWEEN $${values.length - 1} AND $${values.length}`
      );
    } else if (startdate) {
      values.push(startdate);
      filters.push(`todos.deadline >= $${values.length}`);
    } else if (enddate) {
      values.push(`${enddate} 23:59:59`);
      filters.push(`todos.deadline <= $${values.length}`);
    }

    if (complete === "true" || complete === "false") {
      values.push(complete === "true");
      filters.push(`todos.complete = $${values.length}`);
    }

    // operator
    const op = operator && operator.toUpperCase() === "AND" ? "AND" : "OR";
    
    // base condition
    let whereClause = `WHERE ${baseCondition}`;
    if (filters.length > 0) {
      whereClause += ` AND (${filters.join(` ${op} `)})`;
    }

    const validSortFields = ["deadline", "title", "complete", "id"];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "deadline";
    const safeSortMode = sortMode.toLowerCase() === "desc" ? "DESC" : "ASC";

    // limit dan offset parameter
    values.push(limit);
    values.push(offset);

    const sql = `
      SELECT todos.id, todos.title, todos.deadline, todos.complete
      FROM todos
      LEFT JOIN users ON todos.userid = users.id
      ${whereClause}
      ORDER BY todos.${safeSortBy} ${safeSortMode}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const sqlCount = `
      SELECT COUNT(*) AS total
      FROM todos
      LEFT JOIN users ON todos.userid = users.id
      ${whereClause}
    `;

    const todosCount = await db.query(
      sqlCount,
      values.slice(0, values.length - 2)
    );
    const totalRows = parseInt(todosCount.rows[0].total, 10);
    const totalPages = Math.ceil(totalRows / limit);
    const todos = await db.query(sql, values);

    // generate pagination query string
    const pageQuery = `page=${page}`;
    const urlSearchParams = new URLSearchParams(req.query);
    urlSearchParams.delete("page");
    const otherQuery = urlSearchParams.toString();

    // menggabungkan query string
    const paginationQuery = otherQuery
      ? `${pageQuery}&${otherQuery}`
      : pageQuery;

    res.render("todos/list", {
      todos: todos.rows,
      currentPage: Number(page),
      totalPages,
      query: req.query,
      user: req.session.user,
      offset,
      sortBy: safeSortBy,
      sortMode: safeSortMode,
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
