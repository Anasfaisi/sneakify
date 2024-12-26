const Admin = require("../model/admin");
const bcrypt = require("bcrypt");
const Product = require("../model/products");
const User = require("../model/user");
const Category = require("../model/category");
const Order = require("../model/order");
const Coupon = require("../model/coupon");
const Offer = require("../model/offer")
const Wallet= require("../model/wallet")
const Notification = require("../model/notification")
const path = require('path')
const fs = require('fs');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const { v4: uuidv4 } = require("uuid");

exports.getLogin = async (req, res) => {
  if (req.session.admin) {
    console.log(12345);

    return res.redirect("/admin/dashboard");
  }

  return res.render("admin/admin-login");
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    const check = await bcrypt.compare(password, admin.password);
    if (!check) {
      return res.status(404).json({ message: "Incorrect credentials" });
    }

    req.session.admin = admin._id;
    res.status(200).json({ success: true, message: "Login successful" });
    // } else {
    // Invalid credentials
    //   res.status(401).json({ success: false, message: "Invalid Credentials" });
    // }
  } catch (error) {
    console.error("Error in admin login:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
    });
  }
};



exports.logout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Could not log out",
      });
    }
    return res.status(200).json({ message: "logged out succesfully" });
  });
};


exports.getDashboard = async (req, res) => {
  console.log("it is reaching in admin dashboard")
  res.render("admin/dashboard");
};


exports.getChart = async (req, res) => {
  const filter = req.query.filter || 'yearly'; // default to yearly

  try {
    // Logic to get the sales data based on the filter (Yearly, Monthly, Weekly)
    let aggregationPipeline;

    if (filter === 'yearly') {
      aggregationPipeline = [
        { $group: { _id: { $year: '$orderDate' }, totalSales: { $sum: '$grandTotal' } } },
        { $sort: { _id: 1 } }  // Sort by year ascending
      ];
    } else if (filter === 'monthly') {
      aggregationPipeline = [
        { $group: { _id: { $month: '$orderDate' }, totalSales: { $sum: '$grandTotal' } } },
        { $sort: { _id: 1 } }  // Sort by month ascending
      ];
    } else if (filter === 'weekly') {
      aggregationPipeline = [
        { $group: { _id: { $isoWeek: '$orderDate' }, totalSales: { $sum: '$grandTotal' } } },
        { $sort: { _id: 1 } }  // Sort by week ascending
      ];
    }

    const salesData = await Order.aggregate(aggregationPipeline);

    // Prepare labels and sales data
    const labels = salesData.map(item => item._id);
    const sales = salesData.map(item => item.totalSales);

    res.json({ labels, sales });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
}

exports.getDashboardStats = async (req, res) => {
  try {
    // Top Products
    const topProducts = await Order.aggregate([
      { $unwind: "$products" }, // Flatten the products array
      {
        $group: {
          _id: "$products.productId",
          totalSold: { $sum: "$products.quantity" },
          totalRevenue: { $sum: "$products.totalPrice" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          _id: 1,
          name: "$productDetails.name",
          price: "$productDetails.price",
          totalSold: 1,
          totalRevenue: 1,
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }, // Top 10 products
    ]);

    // Top Categories
    const topCategories = await Order.aggregate([
      { $unwind: "$products" }, // Flatten the products array
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$productDetails.category", // Group by category
          totalSold: { $sum: "$products.quantity" },
        },
      },
      {
        $project: {
          _id: 1,
          category: "$_id",
          totalSold: 1,
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }, // Top 10 categories
    ]);

    // Send the results
    res.json({
      topProducts,
      topCategories,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getDashboardData = async (req, res)=> {
  try {
    // Total Sales (sum of all grandTotal from orders)
    const totalSales = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },  // excluding cancelled orders
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]);

    // Total Products (count all products across orders)
    const totalProducts = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } }, // excluding cancelled orders
      { $unwind: '$products' }, // flatten products array
      { $count: 'total' }
    ]);

    // Total Customers (distinct count of users)
    const totalCustomers = await Order.distinct('userId');

    // Revenue (if you're considering it separately)
    const revenue = totalSales[0] ? totalSales[0].total : 0;

    res.json({
      totalSales: totalSales[0] ? totalSales[0].total : 0,
      totalProducts: totalProducts[0] ? totalProducts[0].total : 0,
      totalCustomers: totalCustomers.length,
      revenue: revenue,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).send('Server error');
  }
}

// =========================================================================

exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; 
    const limit = 5; 
    const skip = (page - 1) * limit;

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    
    const products = await Product.find()
      .skip(skip)
      .limit(limit)
      .populate("category"); 

    const categories = await Category.find({ isActive: true });

    if (!products || !categories) {
      return res.status(404).json({ message: "Product or category not found" });
    }

    res.render("admin/productManagement", {
      products,
      categories,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product details." });
  }
};

exports.addProducts = async (req, res) => {
  try {
    let { name, description, price, category, sizes } = req.body;

    // Parse sizes (coming as a JSON string from the frontend)
    if (typeof sizes === "string") {
      sizes = JSON.parse(sizes);
    }

    // Validate sizes
    if (!Array.isArray(sizes) || sizes.length === 0) {
      return res
        .status(400)
        .json({ message: "Sizes must be provided as a non-empty array." });
    }

    const isValidSizes = sizes.every(
      (item) =>
        typeof item.size === "string" &&
        item.size.trim() !== "" &&
        typeof item.stock === "number" &&
        item.stock >= 0
    );

    if (!isValidSizes) {
      return res
        .status(400)
        .json({
          message:
            "Invalid sizes format. Each size must include size and stock.",
        });
    }

    
    const imageUrls = req.files.map((file) => file.filename); 
    if (!name || !description || !price || !category) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided." });
    }
    
    const samplecategory = await Category.findOne({name:category})
    console.log(samplecategory)
    const categoryId = samplecategory._id;
    price = Number(price);
    if (typeof price !== "number" || price <= 0) {
      return res
        .status(400)
        .json({ message: "Price must be a non-negative number." });
    }
    const productId = `PROD-${uuidv4()
      .replace(/-/g, "")
      .slice(0, 6)
      .toUpperCase()}`;


    const newProduct = new Product({
      productId,
      name,
      description,
      price,
      category,
      categoryId,
      sizes, 
      images: imageUrls,
      isActive: true,
    });

    const savedProduct = await newProduct.save();
    res
      .status(201)
      .json({
        success: true,
        message: "Product added successfully",
        savedProduct,
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.unListProducts = async (req, res) => {

  try {
    const productId = req.params.id;
    const action = req.params.action;
 

    // Find the product by ID
    const product = await Product.findById(productId);
    

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Switch the active status
    if (action === "list") {
      product.isActive = true;
    } else if (action === "unList") {
      product.isActive = false;
    }

    // Save the updated product
    await product.save();

    res.status(200).json({ message: "Product status updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error updating product status" });
  }
};

//to list the products
exports.listProducts = async (req, res) => {

  try {
    const productId = req.params.id;
    const action = req.params.action;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (action === "list") {
      product.isActive = true;
    } else if (action === "unList") {
      product.isActive = false;
    }

    await product.save();

    res.status(200).json({ message: "Product status updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating product status" });
  }
};


//====================================================================
exports.getOrders = async (req, res) => {
  try {
    const currentPage = parseInt(req.query.page) || 1;
    const itemsPerPage = 10; 

    
    const skip = (currentPage - 1) * itemsPerPage;

    
    const orders = await Order.find()
      .populate("userId")
      .skip(skip)
      .limit(itemsPerPage);

    
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / itemsPerPage);
    const notifications = await Notification.find({}).sort({ createdAt: -1 }).populate({path: 'orderId',})
    
    


    res.render("admin/orderManagement", {
      orders,
      currentPage,
      totalPages,
      notifications,
    });
  } catch (error) {
    console.log("Error in fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.getOrderDetails = async (req, res) => {
  console.log("it is reaching in order details");
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .populate("userId")
      .populate("products.productId");

    res.status(200).json(order);
  } catch (error) {
    console.log(error, "error occured in getting order details");
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "shipped", "delivered", "cancelled"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    res.json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update order status" });
  }
};

exports.approveCancelOrder = async (req, res) => {
  console.log("it is reaching in cancel order");
  try {
    const {orderId,notificationId} =req.body;


    const order = await Order.findById(orderId)
    
   
    if (!order || order.status !== "cancel_requested") {
      return res.status(404).json({ message: "Invalid order for approval" });
    }
    
    
    if (order.paymentMethod !== "Cash on Delivery") {
      const wallet = await Wallet.findOne({ userId: order.userId._id }) || new Wallet({ userId: order.userId._id, balance: 0, transactions: [] });

      // Credit refund amount
      wallet.balance += order.totalAmount;
      wallet.transactions.push({
        type: "credit",
        amount: order.totalAmount,
        description: `Refund for cancelled order ${order.orderId}`,
        date: new Date(),
      });
    

      await wallet.save();
    }
      order.status = "cancelled";
      await order.save();
    


     const notification = await Notification.findById(notificationId)
     await notification.deleteOne({_id:notificationId})


    res.status(200).json({ message: "Order cancellation approved" });
  } catch (error) {
    console.log(error, "Error approving cancellation");
    res.status(500).json({ message: "An error occurred during approval" });
  }
};

exports.approveReturnOrder = async (req,res)=>{

  console.log("it is reacing in approve return")
  try {
    const userId = req.session.passport.user;
    const orderId = req.params.id;
    const notificationId = req.body.notificationId
    const order = await Order.findById(orderId)
    if(!order){
      return res.status(500).json({message:"order not found"})
    }
 
    if(order.status !== "return_requested"){
      return res.status(500).json({message:"invalid order for approval"})
    }
   
       
    order.status = "returned";
    await order.save();


    const wallet = await Wallet.findOne({ userId: order.userId._id }) || new Wallet({ userId: order.userId._id, balance: 0, transactions: [] });
    // Credit refund amount
      wallet.balance += order.totalAmount;
      wallet.transactions.push({
        type: "credit",
        amount: order.totalAmount,
        description: `Refund for cancelled order ${order.orderId}`,
        date: new Date(),
      });

      await wallet.save();

      const notification = await Notification.findById(notificationId)
      await notification.deleteOne({_id:notificationId})

      res.status(200).json({ message: "Order return approved" });

  } catch (error) {
    console.log(error)
  }
}



exports.getEditProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const categories = await Category.find({ isActive: true });
    if (!product || !categories) {
      return res.status(404).json({ message: "Product or category not found" });
    }
    res.render("admin/editProduct", { product, categories });
  } catch (err) {
    console.log(error)
    res.status(500).json({ error: "Failed to fetch product details." });
  }
};

exports.editProducts = async (req, res) => {
  try {
    const productId = req.params.productId; // Get the product ID from the URL
    const { name, description, price, sizes } = req.body;

    const sizesArray = JSON.parse(req.body.sizes); // Parse the sizes array from the request

    // Find the existing product by ID
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    // Filter only cropped images
    const croppedImages = req.files.filter((file) =>
      file.fieldname.startsWith("croppedImages")
    );

    // Step 2: Group by index and retain unique cropped images
    const uniqueCroppedImages = {};
    croppedImages.forEach((file) => {
      const match = file.fieldname.match(/\[(\d+)\]/); // Extract index from `croppedImages[index]`
      if (match) {
        const index = parseInt(match[1], 10); // Extracted index
        // Retain only the first file for each index
        if (!uniqueCroppedImages[index]) {
          uniqueCroppedImages[index] = file;
        }
      }
    });

    // Update existing images with new cropped images by index
    Object.keys(uniqueCroppedImages).forEach((index) => {
      const croppedImage = uniqueCroppedImages[index];
      if (product.images[index]) {
        // Replace the existing image at this index
        product.images[index] = croppedImage.filename; // Use file path or URL (if Cloudinary)
      }
    });

    // Update the product fields
    product.name = name;
    product.description = description;
    product.price = price;
    product.sizes = sizesArray;

    // Save the updated product
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update product. Please try again later.",
    });
  }
};

// ===========================================================================
exports.listUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 users per page
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments(); // Total users
    const users = await User.find().skip(skip).limit(limit); // Paginated users

    res.render("admin/userManagement", {
      users,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
    });
  } catch (error) {
    console.log(error)
    res.status(500).send("Error fetching users");
  }
};


exports.updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { isBlocked } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isBlocked },
      { new: true }
    );
    if (isBlocked && req.session.user && req.session.user._id === userId) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
        res.clearCookie("connect.sid");
        return res.redirect("/users/login");
      });
    }

    res.status(200).json({
      success: true,
      message: `User has been ${
        isBlocked ? "blocked" : "unblocked"
      } successfully`,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res
      .status(500)
      .json({ success: false, message: "Error updating user status" });
  }
};

// =============================================================================
exports.getAllCategories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 categories per page
    const skip = (page - 1) * limit;

    const totalCategories = await Category.countDocuments(); // Count all categories
    const categories = await Category.find().skip(skip).limit(limit); // Fetch paginated categories

    res.render("admin/category", {
      categories,
      currentPage: page,
      totalPages: Math.ceil(totalCategories / limit),
      totalCategories,
    });
  } catch (error) {
    console.log(error)
    res.status(500).send("Server Error");
  }
};

exports.addCategory = async (req, res) => {
  let { name } = req.body;
  name = name.toLowerCase();
  try {
    const category = new Category({ name, isActive: true });
    console.log(category);

    //checking for existing category

    let existingCategories = await Category.find({
      name: { $regex: name, $options: "i" },
    });
    if (existingCategories.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Category already exists" });
    } else {
      const savedCategory = await category.save();
      res.status(200).json({ success: true, message: "succesfully updated" });
    }
  } catch (error) {
    console.log("error", error);

    res.status(500).send("Error adding category");
  }
};

exports.activateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (category) {
      category.isActive = true;
      await category.save();
      res.redirect("/admin/category");
    } else {
      res.status(404).json({ error: "Category not found" });
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Failed to activate category" });
  }
};

exports.deactivateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (category) {
      category.isActive = false;
      await category.save();
      res.redirect("/admin/category");
    } else {
      res.status(404).json({ error: "Category not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to deactivate category" });
  }
};

exports.updateCategory = async (req, res) => {
  console.log("it is in update");
  const { name } = req.body;
  try {
    let category = await Category.findByIdAndUpdate(req.params.id, { name });
    res.status(200).json({ success: true, message: "succesfully updated" });
  } catch (error) {
    res.status(500).send("Error updating category");
  }
};

// =================================================================================



exports.getCoupons = async (req, res) => {
  console.log("it is reaching in get coupon");
  try {
    // Extract page and limit query parameters, defaulting to page 1 and limit 10
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate the starting index
    const startIndex = (page - 1) * limit;

    // Fetch total count for calculating total pages
    const totalCount = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated coupons
    const coupons = await Coupon.find()
      .skip(startIndex)
      .limit(limit);

    // Render the coupon management page with paginated data
    res.render("admin/couponManagement", {
      coupons,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log("Error fetching coupons:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.addCoupon = async (req, res) => {
  console.log("it is reaching in add coupon");
  try {
    const {
      code,
      discountType,
      discountValue,
      maximumDiscount,
      minimumPurchase,
      startDate,
      expiryDate,
    } = req.body;
    
    if(!code||
      !discountType||
      !minimumPurchase||
      !startDate||
      !expiryDate){
      return res.status(500).json({message:"please fill all the fields"})
      }

    const existingCoupon = await Coupon.findOne({code:code})
    if(existingCoupon){
      return res.status(500).json({message:"same coupon code already exist"})
    }
    const newCoupon = new Coupon({
      code,
      discountType,
      discountValue,
      maximumDiscount,
      minimumPurchase,
      startDate,
      expiryDate,
    })
    await newCoupon.save()
    res.status(200).json({message:"coupon added succesfully"})

    
  } catch (error) {
    console.log("error happened in adding coupon",error)
    res.status(500).json({message:"something went wrong"})
  }
};


exports.deleteCoupon = async (req,res)=>{
  console.log("it is reached in delete coupon")
  try {
    const couponId = req.params.id;

    if(!couponId){
      return res.status(500).json({message:"coupon id not found"})
    }
    const coupon =await Coupon.findById(couponId)
    if(!coupon){
      return res.status(500).json({message:'coupon not found'})
    }
    coupon.isActive = false;
    await coupon.save()
    res.redirect("/admin/coupons")
  } catch (error) {
    console.log("error happened in deleting coupon",error)
    return res.status(500).json({message:"something happened wrong"})
  }
}

exports.reuseCoupon = async (req,res)=>{
  console.log("it is reached in reuse coupon")
  try {
    const couponId = req.params.id;
    if(!couponId){
      res.status(500).json({message:"coupon not found"})
    }
    const coupon = await Coupon.findById(couponId)
    if(!coupon){
      res.status(500).json({message:"coupon not found"})
    }
    coupon.isActive = true;
    await coupon.save()
    res.redirect("/admin/coupons")
  } catch (error) {
    console.log("error happened in reuse coupon")
    res.status(500).json({message:"something went wrong"})
  }
}

exports.getSingleCoupon = async (req,res)=>{
  console.log("it is reaching in get single coupon")
  try {
    const couponId = req.params.id;
    if(!couponId){
      return res.status(500).json({message:"coupon id does not found"})
    }
    const couponData = await Coupon.findById(couponId)
    res.status(200).json({message:"success",couponData})
  } catch (error) {
    console.log(error)
    return res.status(500).json({message:"something happened wrong"})
  }
}

exports.editCoupon = async (req,res)=>{
  console.log("it is reaching in edit coupon");
    try {
      const couponId = req.params.id
      if(!couponId){ return res.status(404).json({message:"coupon id not found"})}

       const editData = req.body;
       if (!editData || Object.keys(editData).length === 0) {
        return res.status(400).json({ message: "No data provided for updating" });
      }
       const coupon = await Coupon.findById(couponId)
       if(!coupon){
        return res.status(404).json({message:"coupon is not found"})
       }
       const updatedCoupon = await Coupon.findByIdAndUpdate(
        couponId,
        { $set: editData }, 
        { new: true, runValidators: true } 
      );
  
      
      res.status(200).json({ message: "Coupon updated successfully"});
       
    } catch (error) {
      console.log(error)
    }
}

//=====================================================


exports.getOffers = async (req, res) => {
  console.log("it is reaching in get offers");
  try {
    // Extract page and limit query parameters, default to page 1 and limit 10
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate the starting index
    const startIndex = (page - 1) * limit;

    // Fetch total count for calculating total pages
    const totalOffers = await Offer.countDocuments();
    const totalPages = Math.ceil(totalOffers / limit);

    // Fetch paginated offers
    const offers = await Offer.find()
      .populate('applicableProducts', 'name')
      .populate('applicableCategories', 'name')
      .skip(startIndex)
      .limit(limit);
   console.log(offers[0].m)
    // Fetch all applicable products and categories (not paginated)
    const applicableProducts = await Product.find({}, 'name');
    const applicableCategories = await Category.find({}, 'name');

    res.render('admin/offerManagement', {
      offers,
      applicableProducts,
      applicableCategories,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};


exports.addOffer = async (req, res) => {
  try {
    const {
      offerId,
      offerName,
      percentage,
      validFrom,
      validUntil,
      offerType,
      applicableProducts,
      applicableCategories,
      maximumDiscount,
    } = req.body;

    if (!offerName || !percentage || !validFrom || !validUntil || !offerType || !(applicableProducts || applicableCategories) || !maximumDiscount) {
      return res.status(400).json({ message: "All required fields must be filled." });
    }

    // Check for existing offer
    const existingOffer = await Offer.findOne({ offerName });
    if (existingOffer) {
      return res.status(404).json({ message: "Offer already exists." });
    }

    // Fetch the relevant product or category
    const product = await Product.findById(applicableProducts).populate("offer");
    const category = await Category.findById(applicableCategories).populate("offer");

     const newOffer = new Offer({
      offerName,
      percentage,
      validFrom,
      validUntil,
      offerType,
      applicableCategories,
      applicableProducts,
      offerTypeReference: offerType === 'product' ? 'Product' : 'Category',
      maximumDiscount,
      productName: product?.name || "",
      categoryName: category?.name || "",
    });

    // If the offer applies to a product
    if (offerType === 'product' && product) {
      const offerDiscount = Math.min((product.price * percentage) / 100, maximumDiscount); // Calculate discount
      if(offerDiscount > product.price/2){
        product.offerDiscount = maximumDiscount
        return res.status(500).json({message:"cannot set offer less than cost 50% of the Products Actual price "})
      }else{
      product.offerDiscount = product.price - offerDiscount; 
      }
      product.offer = newOffer._id; // Link offer to product
      await product.save();
    } 
    // If the offer applies to a category
    else if (offerType === 'category' && category) {
      const productsInCategory = await Product.find({ category: category._id }).populate("offer")
      for (const product of productsInCategory) {
        const offerDiscount= Math.min((product.price * percentage) / 100, maximumDiscount);
        if(offerDiscount > product.price/2){
          product.offerDiscount = maximumDiscount
          return res.status(500).json({message:"cannot set offer less than cost 50% of the Products Actual price "})
        }else{
        product.offerDiscount = product.price - discountAmount; 
        }
        product.offer = newOffer._id;
        await product.save();
      }
      category.offer = newOffer._id; // Link offer to category
      await category.save();
    }

    await newOffer.save();
    res.status(201).json({ message: "Offer created successfully.", offer: newOffer });

  } catch (error) {
    console.error("Error in addOffer:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};

exports.getSingleOffer = async (req,res)=>{
      console.log("it is reaching in get single offer")
      try {
        const offerId = req.params.id
        if(!offerId){
          return res.status(500).json({message})
        }

        const offerData = await Offer.findById(offerId)
        if(!offerData){
          return res.status(500).json({message:"offer does not found"})
        }

        res.status(200).json({message:"offer captured ",offerData})
      } catch (error) {
        console.log("error happened in capturing offer",error)
        return res.status(500).json({message:"somethng happened wrong"})
      }
    }


exports.editOffer = async (req,res)=>{
        console.log("it is reaching in edit offer");

        try {
          const offerId = req.params.id;
          if(!offerId){
            return res.status(500).json({message:"offer id is not found"})
          }

          const { data } = req.body; 
          if (!data) {
            return res.status(400).json({ message: "No data received for update" });
          }

        const updatedOffer = await Offer.findByIdAndUpdate(offerId,
          { $set: data }, 
          { new: true, runValidators: true } )
      
        res.status(200).json({message:"offer updated successful",updatedOffer})
          
        } catch (error) {
          console.log("something happened wrong",error)
          return res.status(500).json({message:"something happened wrong"})
        }
      }

      // Delete Offer
exports.deleteOffer = async (req, res) => {
      console.log("It is reaching in delete offer");

      try {
        const offerId = req.params.id; // Get the offerId from the request params

        if (!offerId) {
          return res.status(500).json({ message: "Offer id not found" });
        }

        const offer = await Offer.findById(offerId); // Find the offer by its ID
        if (!offer) {
          return res.status(500).json({ message: "Offer not found" });
        }

        offer.isActive = false; // Set the offer's isActive status to false
        await offer.save(); // Save the offer with the updated status

        // Redirect to the offers list after the operation is complete
        res.redirect("/admin/offers");
      } catch (error) {
        console.log("Error happened in deleting offer", error);
        return res.status(500).json({ message: "Something went wrong" });
      }
    };

    // Reuse Offer (Reactivate)
exports.reuseOffer = async (req, res) => {
      console.log("It is reaching in reuse offer");

      try {
        const offerId = req.params.id;

        if (!offerId) {
          return res.status(500).json({ message: "Offer id not found" });
        }

        const offer = await Offer.findById(offerId);
        if (!offer) {
          return res.status(500).json({ message: "Offer not found" });
        }

        offer.isActive = true; // Set the offer's isActive status to true (reactivate)
        await offer.save();

        // Redirect to the offers list after the operation is complete
        res.redirect("/admin/offers");
      } catch (error) {
        console.log("Error happened in reusing offer", error);
        return res.status(500).json({ message: "Something went wrong" });
      }
    };


    //===================================================
    exports.loadSalesReport = async (req, res) => {
      console.log("it is reaching in sales report");
  
      try {
          const { dateRange = '1-day', page = 1, limit = 10 } = req.query;  // Extract pagination and date range
          const currentPage = parseInt(page);
          const itemsPerPage = parseInt(limit);
  
          let dateFilter = { status: 'delivered' }; // Filter only 'delivered' orders
          const currentDate = moment();
  
          // Apply date filtering logic
          if (dateRange === '1-day') {
              dateFilter.createdAt = { $gte: currentDate.subtract(1, 'days').toDate() };
          } else if (dateRange === '1-week') {
              dateFilter.createdAt = { $gte: currentDate.subtract(1, 'weeks').toDate() };
          } else if (dateRange === '1-month') {
              dateFilter.createdAt = { $gte: currentDate.subtract(1, 'months').toDate() };
          }
  
          // Fetch total sales data (only delivered orders) to calculate overall totals
          const totalSalesData = await Order.find(dateFilter);
          const totalAmount = totalSalesData.reduce((sum, order) => sum + order.grandTotal, 0);
          const totalSales = totalSalesData.length;
          const totalDiscount = totalSalesData.reduce(
              (sum, order) => sum + (order.totalDiscount || 0),
              0
          );
  
          // Count total records for pagination
          const totalFilteredSalesData = totalSalesData.length;
          const totalPages = Math.ceil(totalFilteredSalesData / itemsPerPage);
  
          // Fetch paginated sales data based on the date filter (only delivered orders)
          const salesData = await Order.find(dateFilter)
              .sort({ createdAt: -1 })
              .skip((currentPage - 1) * itemsPerPage)
              .limit(itemsPerPage);
  
          // If no sales data is found
          if (!salesData || salesData.length === 0) {
              return res.render("admin/salesReport", {
                  totalSales,
                  totalAmount,
                  totalDiscount,
                  salesData: [],
                  currentPage,
                  totalPages,
                  dateRange,
              });
          }
  
          console.log(salesData)
          // Render sales report page with overall totals
          res.render("admin/salesReport", {
              totalSales,
              totalAmount,
              totalDiscount,
              salesData,
              currentPage,
              totalPages,
              dateRange,
          });
      } catch (error) {
          console.log(error);
          res.status(500).send("Error loading sales report");
      }
  };
  
    


exports.exportExcel = async (req, res) => {
  try {
    // Fetch sales data
    const salesData = await Order.find(); // Replace with your logic to fetch sales data

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Add columns
    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 20 },
      { header: 'Total Amount', key: 'grandTotal', width: 15 },
      { header: 'Coupon Discount', key: 'couponDiscount', width: 15 },
      { header: 'Offer Discount', key: 'offerDiscount', width: 15 },
      { header: 'User Name', key: 'userName', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
    ];

    // Add rows
    salesData.forEach(order => {
      worksheet.addRow({
        orderId: order.orderId,
        grandTotal: order.grandTotal,
        couponDiscount: order.couponDiscount || 'No coupon applied',
        offerDiscount: order.offerDiscount || 'No offers',
        userName: order.addressDetails.firstName,
        date: new Date(order.createdAt).toLocaleDateString(),
      });
    });

    // Write to file and send to the user
    const filePath = path.join(__dirname, 'sales-report.xlsx');
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, 'sales-report.xlsx', (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error downloading file.');
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating Excel report.');
  }
};






exports.exportPDF =  async (req, res) => {
  try {
      const { dateRange } = req.query; // Get the selected date range from the query parameters

      // Initialize a filter object
      let dateFilter = {};

      // Get the current date
      const currentDate = new Date();

      // Apply the filtering logic based on the selected date range
      if (dateRange === '1-day') {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          dateFilter.createdAt = { $gte: startOfDay };  // Filter orders from today onwards
      } else if (dateRange === '1-week') {
          const startOfWeek = new Date();
          startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());  // Start of the week (Sunday)
          dateFilter.createdAt = { $gte: startOfWeek };  // Filter orders from the start of the week
      } else if (dateRange === '1-month') {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);  // First day of the month
          dateFilter.createdAt = { $gte: startOfMonth };  // Filter orders from the start of the month
      }

      // Fetch the orders based on the date filter
      const orders = await Order.find(dateFilter).populate('userId').exec();

      // Map the orders data
      const data = orders.map(order => ({
          orderId: order.orderId,
          totalAmount: order.totalAmount,
          couponDiscount: order.couponDiscount || 'No coupon applied',
          offerDiscount: order.offerDiscount || 'No offers',
          userName: `${order.addressDetails.firstName} ${order.addressDetails.lastName}`,
          date: new Date(order.createdAt).toLocaleDateString(),
      }));

      // Calculate summary values
      const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalSales = orders.length;
      const totalDiscount = orders.reduce((sum, order) => sum + (order.couponDiscount || 0) + (order.offerDiscount || 0), 0);

      // Generate the PDF document (similar to the previous logic)
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=Sneakify-sales-report.pdf');
      doc.pipe(res);

      doc.fontSize(16).text('Sales Report', { align: 'center' });
      doc.moveDown(1.5);

      const pageHeight = 700;
      const marginTop = 50;
      const marginBottom = 50;
      const tableTop = 100;
      const rowHeight = 25;
      const columnSpacing = 5;
      const columnWidth = 80;
      let y = tableTop;

      const headers = Object.keys(data[0]);
      let x = 50;

      // Add headers to the table
      headers.forEach((header) => {
          doc.fontSize(10).text(header, x, y, { width: columnWidth, align: 'center' });
          x += columnWidth + columnSpacing;
      });

      doc.moveTo(50, y + rowHeight - 10)
         .lineTo(50 + headers.length * (columnWidth + columnSpacing) - columnSpacing, y + rowHeight - 10)
         .stroke();

      y += rowHeight;

      // Check page space before adding each row of data
      function checkPageSpace(doc, currentY, heightNeeded) {
          if (currentY + heightNeeded > pageHeight - marginBottom) {
              doc.addPage();
              return marginTop;
          }
          return currentY;
      }

      // Add data rows to the table
      data.forEach((row) => {
          y = checkPageSpace(doc, y, rowHeight);
          x = 50;

          Object.values(row).forEach((cell) => {
              doc.fontSize(8).text(String(cell), x, y, { width: columnWidth, align: 'center', ellipsis: true });
              x += columnWidth + columnSpacing;
          });

          y += rowHeight;

          doc.moveTo(50, y - 10)
             .lineTo(50 + headers.length * (columnWidth + columnSpacing) - columnSpacing, y - 10)
             .stroke();
      });

      // Add summary to the PDF
      y = checkPageSpace(doc, y, 100);
      doc.fontSize(12).text('Summary', 50, y);
      y += 20;

      doc.fontSize(10)
         .text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 50, y)
         .text(`Total Sales: ${totalSales}`, 50, y + 15)
         .text(`Total Discount: ₹${totalDiscount.toFixed(2)}`, 50, y + 30);

      doc.end();
  } catch (error) {
      console.log(`Error in downloadPDF: ${error}`);
      res.status(500).send('Error generating PDF');
  }
};

