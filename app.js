const express = require("express");
const session = require("express-session");
const path = require("path");
const adminRouter = require("./routes/adminRoute");
const usersRouter = require("./routes/userRoute");
const connectDB = require("./config/db");
const MongoStore = require("connect-mongo");
require("dotenv").config();


const PORT = process.env.PORT;
const passport = require("./config/passport")

const app = express();
connectDB();
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "uploads")));
// Prevent caching by setting headers
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// Configure session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI, 
      collectionName: "sessions", 
      ttl: 24 * 60 * 60, 
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  })
);

app.use((req, res, next) => {
  console.log(`${req.method}  and the url is ${req.url}`);
  next();
});
// Error Handling Middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack); // Log the error for debugging
//   res.status(err.status || 500).render("users/errorPage", {
//     message: err.message || "Internal Server Error",
//   });
// });

// // 404 Error Handler for Unknown Routes
// app.use((req, res) => {
//   res.status(404).render("users/errorPage", {
//     message: "Page Not Found",
//   });
// });

app.use((req, res, next) => {
  res.locals.isAuthenticate = req.session.passport?.user ? true : false;
  next();
});
app.get("/",(req,res)=>res.redirect("/users/home"))
app.use(passport.initialize());
app.use(passport.session());
app.use("/admin", adminRouter);
app.use("/users", usersRouter);

app.listen(PORT, () =>
  console.log(`server listening at http://localhost:${PORT}`)
);
