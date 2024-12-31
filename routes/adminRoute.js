// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controller/adminController");
const { isAdmin } = require("../middlewares/auth");
const upload = require("../config/multer");
const Product = require("../model/products");

router.get("/login", controller.getLogin);
router.post("/login", controller.postLogin);
router.post("/logout",isAdmin, controller.logout);

router.get("/dashboard", isAdmin, controller.getDashboard);
router.get("/dashboardrouter/charData",isAdmin,controller.getChart)
router.get("/dashboardStats",isAdmin,controller.getDashboardStats)
router.get("/dashboardData",isAdmin,controller.getDashboardData)
router.get("/chartData",isAdmin,controller.getChart)

router.get("/users", isAdmin, controller.listUsers);
router.post("/users/:id/status", controller.updateUserStatus);

router.get("/category", isAdmin, controller.getAllCategories);
router.post("/category/add", controller.addCategory);
router.post("/category/edit/:id", controller.updateCategory);
router.post("/category/:id/activate", controller.activateCategory);
router.post("/category/:id/deactivate", controller.deactivateCategory);

router.get("/products", isAdmin, controller.getProducts);
router.post("/products/add",upload.array("croppedImages"),controller.addProducts);

router.patch("/products/:id/:action", controller.listProducts);
router.patch("/products/:id/:action", controller.unListProducts);

router.get('/editProduct/:id',controller.getEditProducts)
router.post('/products/edit/:productId', upload.any(),controller.editProducts)


router.get("/orders",isAdmin,controller.getOrders)
router.get("/orderDetails/:id",isAdmin,controller.getOrderDetails)
router.post('/orders/:id/status', isAdmin, controller.updateOrderStatus);
router.post('/orders/:id/cancel', isAdmin, controller.approveCancelOrder);
router.post("/orders/:id/return",isAdmin,controller.approveReturnOrder)


router.get("/coupons",isAdmin,controller.getCoupons)
router.post("/addCoupon",isAdmin,controller.addCoupon)
router.post("/:id/delete",isAdmin,controller.deleteCoupon)
router.post("/:id/deleted",isAdmin,controller.reuseCoupon)
router.get("/getCoupon/:id",isAdmin,controller.getSingleCoupon)
router.put("/editCoupon/:id",isAdmin,controller.editCoupon)

router.get("/offers",isAdmin,controller.getOffers)
router.post("/addOffer",isAdmin,controller.addOffer)
router.get("/getOffer/:id",isAdmin,controller.getSingleOffer)
router.put("/editOffer/:id",isAdmin,controller.editOffer)
router.post('/offer/:id/delete', isAdmin,controller.deleteOffer);
router.post('/offer/:id/deleted', isAdmin,controller.reuseOffer);


router.get("/salesReport",isAdmin,controller.loadSalesReport)
router.get('/export/excel',isAdmin,controller.exportExcel);
router.get('/export/pdf',isAdmin ,controller.exportPDF);



module.exports = router;
