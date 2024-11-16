// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controller/userController");
const { isAuthenticated,isAdmin,checkIfBlocked} = require("../middlewares/auth");

router.get("/signup", controller.getSignuppage);
router.post("/signup", controller.signup);

router.get("/otp-verify", controller.showVerifyOTP);
router.post("/otp-verify", controller.otpVerify);
router.post("/otp-verify/resendOtp", controller.resendOtp);

router.get("/login", controller.getLoginPage);
router.post("/login",controller.login);


router.get("/home", isAuthenticated,(req,res)=>res.send("home page"));


router.get('/logout', controller.logout);

module.exports = router;
