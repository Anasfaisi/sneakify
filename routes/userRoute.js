// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controller/userController');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/signup',controller.getSignuppage);
router.post('/signup',controller.signup);
router.get('/login', controller.getLoginPage);
router.post('/login', controller.login);
router.get('/otp-verify',controller.showVerifyOTP)
router.post('/otp-verify',controller.otpVerify)
router.get('/home',(req,res)=>res.send("homepage")
)
// router.get('/logout', logout);


module.exports = router;