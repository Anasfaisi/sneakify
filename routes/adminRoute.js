// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controller/adminController");
const { isAdmin } = require("../middlewares/auth");
const upload = require("../config/multer");
const Product = require("../model/products");

router.get("/login", controller.getLogin);
router.post("/login", controller.postLogin);
router.get("/dashboard", isAdmin, controller.getDashboard);
router.get("/logout", controller.logout);

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
router.post('/orders/:id/cancel', isAdmin, controller.cancelOrder);


module.exports = router;
