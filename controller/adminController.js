const Admin = require("../model/admin");
const bcrypt = require("bcrypt");
const Product = require("../model/products");
const User = require("../model/user");
const Category = require("../model/category");
const Order = require("../model/order");
const Coupon = require("../model/coupon");
const Offer = require("../model/offer")
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
  //   console.log(req.body.email);

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

exports.getDashboard = async (req, res) => {
  res.render("admin/dashboard");
};

exports.logout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Could not log out",
      });
    }
    console.log("session destroyed succesfully");
    return res.status(200).json({ message: "logged out succesfully" });
  });
};

// =========================================================================

exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if no page is specified
    const limit = 5; // Number of products per page
    const skip = (page - 1) * limit;

    // Get the total count of products
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch the products for the current page
    const products = await Product.find()
      .skip(skip)
      .limit(limit)
      .populate("category"); // If you want to populate the category (optional)

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

    // Parse and validate other fields
    const imageUrls = req.files.map((file) => file.filename); // Assuming files are uploaded successfully
    if (!name || !description || !price || !category) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided." });
    }

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
    console.log(productId);

    // Create the new product with the validated data

    const newProduct = new Product({
      productId,
      name,
      description,
      price,
      category,
      sizes, // Use the parsed sizes array
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
  console.log("addddd");
  try {
    const productId = req.params.id;
    const action = req.params.action;
    console.log(productId);
    console.log(action);
    console.log("sdfghjkl");

    // Find the product by ID
    const product = await Product.findById(productId);
    console.log(product);

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
    console.error(error);
    res.status(500).json({ message: "Error updating product status" });
  }
};

//to list the products
exports.listProducts = async (req, res) => {
  console.log("aaaaaa");
  try {
    console.log(req.params);
    const productId = req.params.id;
    const action = req.params.action;
    console.log(productId);
    console.log(action);

    const product = await Product.findById(productId);
    console.log(product);

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

exports.getOrders = async (req, res) => {
  try {
    // Get the current page and set a default if not present
    const currentPage = parseInt(req.query.page) || 1;
    const itemsPerPage = 10; // Number of orders per page

    // Calculate the number of orders to skip for pagination
    const skip = (currentPage - 1) * itemsPerPage;

    // Fetch orders with pagination
    const orders = await Order.find()
      .populate("userId")
      .skip(skip)
      .limit(itemsPerPage);

    // Get the total number of orders for pagination
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / itemsPerPage);

    res.render("admin/orderManagement", {
      orders,
      currentPage,
      totalPages,
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
    console.log(order);

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

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: "cancelled" },
      { new: true }
    );
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    res.json({ success: true, message: "Order has been cancelled", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to cancel order" });
  }
};


exports.getEditProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const categories = await Category.find({ isActive: true });
    if (!product || !categories) {
      return res.status(404).json({ message: "Product or category not found" });
    }
    res.render("admin/editProduct", { product, categories });
  } catch (err) {
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
    const users = await User.find({});
    console.log(users);

    res.render("admin/userManagement", { users });
  } catch (error) {
    res.status(500).send("Error fetching users");
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log(userId);
    const { isBlocked } = req.body;
    console.log(isBlocked);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isBlocked },
      { new: true }
    );
    console.log(updatedUser);
    if (isBlocked && req.session.user && req.session.user._id === userId) {
      console.log("in the session destroying");
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
    const categories = await Category.find({});
    res.render("admin/category", { categories });
  } catch (error) {
    res.status(500).send("Server Error");
  }
};

exports.addCategory = async (req, res) => {
  let { name } = req.body;
  name = name.toLowerCase();
  console.log(name);
  try {
    const category = new Category({ name, isActive: true });
    console.log(category);

    //checking for existing category

    let existingCategories = await Category.find({
      name: { $regex: name, $options: "i" },
    });
    if (existingCategories.length > 0) {
      console.log("Matching categories found:", existingCategories);
      return res
        .status(400)
        .json({ success: false, message: "Category already exists" });
    } else {
      const savedCategory = await category.save();
      console.log(savedCategory);
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
  console.log(name);
  try {
    let category = await Category.findByIdAndUpdate(req.params.id, { name });
    console.log(category);
    res.status(200).json({ success: true, message: "succesfully updated" });
  } catch (error) {
    res.status(500).send("Error updating category");
  }
};

// =================================================================================



exports.getCoupons = async (req, res) => {
  console.log("it is reaaching in get coupon ");
  try {
    const coupons = await Coupon.find();
    if (!coupons) {
      res.status(500).json({ message: "no coupons found" });
    }
    res.render("admin/couponManagement", {
      coupons,
    });
  } catch (error) {}
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
    console.log(req.body)
    
    if(!code||
      !discountType||
      !minimumPurchase||
      !startDate||
      !expiryDate){
      return res.status(500).json({message:"please fill all the fields"})
      }

    const existingCoupon = await Coupon.find({code:code})
    console.log(existingCoupon);
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
    console.log(newCoupon,"new coupon")
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

      console.log(req.body)
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
        const productOffers = await Offer.find({ offerType: 'product' }).populate('appliedToProduct', 'name');
        // console.log("productOffers",productOffers)
        
        const categoryOffers = await Offer.find({ offerType: 'category' }).populate('appliedToCategory', 'name');
        
        const applicableProducts = await Product.find({}, 'name');
        const applicableCategories = await Category.find({}, 'name');
        // console.log("applicableProducts",applicableProducts)
        // console.log("applicableCategories",applicableCategories)
        
        const offers = await Offer.find()
        // console.log("offers",offers)
        res.render('admin/offerManagement', {
            productOffers,
            categoryOffers,
            applicableCategories,
            applicableProducts,
            offers,
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
      appliedToProduct,
      appliedToCategory,
      maximumDiscount,
    } = req.body;

    if (!offerName || !percentage || !validFrom || !validUntil || !offerType || !(appliedToProduct || appliedToCategory) || !maximumDiscount) {
      return res.status(400).json({ message: "All required fields must be filled." });
    }

    // Check for existing offer
    const existingOffer = await Offer.findOne({ offerName });
    if (existingOffer) {
      return res.status(404).json({ message: "Offer already exists." });
    }

    // Fetch the relevant product or category
    const product = await Product.findById(appliedToProduct).populate("offer");
    const category = await Category.findById(appliedToCategory).populate("offer");

    const newOffer = new Offer({
      offerName,
      percentage,
      validFrom,
      validUntil,
      offerType,
      appliedToProduct,
      appliedToCategory,
      offerTypeReference: offerType === 'product' ? 'Product' : 'Category',
      maximumDiscount,
      productName: product?.name || "",
      categoryName: category?.name || "",
    });

    // If the offer applies to a product
    if (offerType === 'product' && product) {
      product.originalPrice = product.price; // Set the original price
      const discountAmount = Math.min((product.price * percentage) / 100, maximumDiscount); // Calculate discount
      product.discountedPrice = product.price - discountAmount; // Calculate new price
      product.offer = newOffer._id; // Link offer to product
      await product.save();
    } 
    // If the offer applies to a category
    else if (offerType === 'category' && category) {
      const productsInCategory = await Product.find({ category: category._id }).populate("offer")
      for (const product of productsInCategory) {
        product.originalPrice = product.price;
        const discountAmount = Math.min((product.price * percentage) / 100, maximumDiscount);
        product.discountedPrice = product.price - discountAmount;
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
        console.log(offerData);
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
          console.log(req.body)
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
