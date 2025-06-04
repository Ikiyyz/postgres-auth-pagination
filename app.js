const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const session = require("express-session");
const { Pool } = require("pg");

const pool = new Pool({
  user: "todouser",
  password: "todopassword",
  host: "localhost",
  port: 5432,
  database: "tododb",
});

const indexRouter = require("./routes/index.js")(pool);   
const todosRouter = require("./routes/todos.js")(pool);   

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: "rahasia_todoku",
  resave: false,
  saveUninitialized: false,
}));

// Routing
app.use("/", indexRouter);
app.use("/todos", todosRouter);

// catch 404 and error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
