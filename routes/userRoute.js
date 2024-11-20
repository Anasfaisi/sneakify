// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controller/userController");
const { isAuthenticated,isAdmin,checkIfBlocked} = require("../middlewares/auth");
const passport = require("passport")

router.get("/signup", controller.getSignuppage);
router.post("/signup", controller.signup);

router.get("/otp-verify", controller.showVerifyOTP);
router.post("/otp-verify", controller.otpVerify);
router.post("/otp-verify/resendOtp", controller.resendOtp);

router.get("/login", controller.getLoginPage);
router.post("/login",controller.login);


router.get("/home",controller.home);

router.get("/shop",controller.listingProducts)
router.get("/productDetails",controller.productDetails)


router.get('/logout', controller.logout);
router.get("/auth/google",passport.authenticate("google",{scope:['profile','email']}))
router.get("/auth/google/callback", passport.authenticate('google',{failureRedirect:'/users/signup'}),(req,res)=>{
    res.redirect("/users/home")
})
module.exports = router;
