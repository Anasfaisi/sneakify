const express = require("express");
const session = require("express-session")
const path = require("path");
const adminRouter = require("./routes/adminRoute");
const usersRouter = require("./routes/userRoute");
const connectDB = require("./config/db");
const PORT = process.env.PORT;

const app = express();
require("dotenv").config();
connectDB();
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  secret:'key',
  resave:false,
  saveUninitialized:false,
  cookie:{secure:false}
}))

// app.use("/", adminRouter);
app.get("/",(req,res)=>{
  res.json({"message":"server is running"})
})
app.use("/users", usersRouter);
app.use((req,res,next)=>{
  console.log(`${req.method}  and the url is ${req.url}`)
  next()
})

app.listen(PORT, () =>
  console.log("server listening at http://localhost:3000/users/signup")
);
