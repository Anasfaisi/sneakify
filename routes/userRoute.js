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


router.get("/shop",controller.listingProducts)
router.get("/products",controller.filter)


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
router.post("/orderCancel/:id",controller.cancelOrder)


router.get("/cart",isAuthenticated,cartController.getCart)
router.post("/cart/add",cartController.addToCart)
router.put("/cart/quantityUpdate/:id",cartController.quantityUpdate)
router.delete("/cart/removeProduct/:id",cartController.removeProduct)

router.post("/applyCoupon",cartController.applyCoupon)
router.post("/removeCoupon",cartController.removeCoupon)



router.get("/wishlist",isAuthenticated,wishlistController.getWishList)
router.post("/addToWishlist",isAuthenticated,wishlistController.addToWishlist)
router.delete("/removeItem",wishlistController.removeItem)

router.get("/checkout",isAuthenticated,checkoutController.getCheckout)

router.post("/placeOrder",checkoutController.placeOrder)
router.get("/orderPlaced",checkoutController.orderPlaced)
router.post("/razorPay/createOrder",checkoutController.createOrder)

module.exports = router;
