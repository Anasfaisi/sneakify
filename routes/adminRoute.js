// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controller/adminController");
const { isAdmin } = require("../middlewares/auth");
const upload = require("../config/multer");
const Product = require("../model/products")

router.get("/login", controller.getLogin);
router.post("/login", controller.postLogin);
router.get("/dashboard", isAdmin, controller.getDashboard);
router.get("/logout", controller.logout);

router.get("/users", controller.listUsers);
router.post("/users/:id/block", controller.blockUser);
router.post("/users/:id/unblock", controller.unblockUser);

router.get("/category", controller.getAllCategories);
router.post("/category/add", controller.addCategory);
router.post("/edit/:id", controller.updateCategory);
router.post("/category/:id/activate", controller.activateCategory);
router.post("/category/:id/deactivate", controller.deactivateCategory);

router.get("/products", controller.getProducts);
router.post('/products/add', upload.array('croppedImages'), controller.addProducts);
router.get('/products/:id',controller.getEditProducts)
// router.post('/products/:id',controller.editProducts)
router.post('/products/:id/:action',controller.listProducts) 
router.post('/products/:id/:action',controller.unListProducts) 




module.exports = router;
