// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controller/userController");
const cartController = require("../controller/cartController")
const wishlistController = require("../controller/wishListController")
const checkoutController = require("../controller/checkoutController")
const { isAuthenticated,checkIfBlocked} = require("../middlewares/auth");
const passport = require("passport")

router.get("/signup", controller.getSignuppage);
router.post("/signup", controller.signup);

router.get("/otp-verify", controller.showVerifyOTP);
router.post("/otp-verify", controller.otpVerify);
router.post("/otp-verify/resendOtp", controller.resendOtp);

router.get("/login", controller.getLoginPage);
router.post("/login",controller.login);

router.get("/getForgetPassword",controller.getForgetPassword)
router.post("/forgetPassword",controller.forgetPassword)
router.get("/resetPassword",controller.showResetPasswordForm)
router.post("/resetPasswordForm",controller.resetPassword)

router.get("/home",controller.home);
router.get("/about",controller.getAbout)


router.get("/shop",controller.listingProducts)



router.get("/productDetails/:id",controller.productDetails)
router.get('/product/:id/size/:size',controller.getStock)
router.get("/shop/sort", controller.sortProducts)


router.get('/logout', controller.logout);
router.get("/auth/google",passport.authenticate("google",{scope:['profile','email']}))
router.get("/auth/google/callback", passport.authenticate('google',{failureRedirect:'/users/signup'}),(req,res)=>{
    res.redirect("/users/home")
})


router.get("/profile",isAuthenticated,controller.profile)
router.put("/editProfile",controller.updateUserDetails)
router.patch("/editPassword",controller.updatePassword)


router.get("/address",isAuthenticated, controller.getAddress)
router.post("/address/add",controller.addAddress)
router.put("/address/edit/:id",controller.editAddress)
router.delete("/address/delete/:id", controller.deleteAddress);

router.get("/orders",isAuthenticated,controller.getorderHistory)
router.get("/orderDetails/:id",isAuthenticated,controller.getOrderDetails)
router.post("/orderCancel/:id",isAuthenticated,controller.cancelOrder)
router.post("/orderReturn/:id",isAuthenticated,controller.returnOrder)
router.get("/invoiceDownload/:id",isAuthenticated,controller.invoiceDownload)


router.get("/cart",isAuthenticated,cartController.getCart)
router.post("/cart/add",isAuthenticated,cartController.addToCart)
router.put("/cart/quantityUpdate/:id",isAuthenticated,cartController.quantityUpdate)
router.delete("/cart/removeProduct/:id",isAuthenticated,cartController.removeProduct)

router.post("/applyCoupon",isAuthenticated,cartController.applyCoupon)
router.post("/removeCoupon",isAuthenticated,cartController.removeCoupon)



router.get("/wishlist",isAuthenticated,wishlistController.getWishList)
router.post("/addToWishlist",isAuthenticated,wishlistController.addToWishlist)
router.delete("/removeItem",isAuthenticated,wishlistController.removeItem)

router.get("/wallet",isAuthenticated,controller.loadWallet)

router.get("/checkout",isAuthenticated,checkoutController.getCheckout)
router.post("/placeOrder",isAuthenticated,checkoutController.placeOrder)
router.get("/orderPlaced",isAuthenticated,checkoutController.orderPlaced)
router.post("/razorPay/createOrder",checkoutController.placeOrder)
router.post("/razorPay/verifyPayment",checkoutController.verifyPayment)
router.post("/handlePaymentFailure",checkoutController.handleFailure)
router.post("/razorPay/retryPayment",checkoutController.retryPayment)
module.exports = router;
