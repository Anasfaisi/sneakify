const Admin = require("../model/admin");
const bcrypt = require("bcrypt");
const Product = require("../model/products");
const User = require("../model/user");
const Category = require("../model/category");
const Order = require("../model/order")

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
  console.log("the admin is ",req.session.admin);
  try {
    const products = await Product.find(); 
    const categories = await Category.find({ isActive: true });
 
    res.render("admin/productManagement", {
      products,categories
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
        .json({ message: "Invalid sizes format. Each size must include size and stock." });
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

    // Create the new product with the validated data
    const newProduct = new Product({
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
      .json({ success: true, message: "Product added successfully", savedProduct });
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
          return res.status(404).json({ message: 'Product not found' });
      }

      // Switch the active status
      if (action === 'list') {
          product.isActive = true;
      } else if (action === 'unList') {
          product.isActive = false;
      }

      // Save the updated product
      await product.save();

      res.status(200).json({ message: 'Product status updated successfully' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating product status' });
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
          return res.status(404).json({ message: 'Product not found' });
      }

      if (action === 'list') {
          product.isActive = true;
      } else if (action === 'unList') {
          product.isActive = false;
      }

      await product.save();

      res.status(200).json({ message: 'Product status updated successfully' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating product status' });
  }
};




exports.getOrders = async (req, res) => {
  try {
    console.log("Fetching orders...");
    const orders = await Order.find()
      .populate('userId', ) 
      .populate('products.productId'); 
    console.log(orders);
    res.render("admin/orderManagement", { orders });
  } catch (error) {
    console.log("Error in fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.getOrderDetails = async (req,res)=>{
  console.log("it is reaching in order details")
  try {
    const orderId = req.params.id;
    const userId = req.session.passport.user;
    const order = await Order.findById(orderId).populate("userId")
    .populate("products.productId")
    console.log(order);

    res.status(200).json(order)
  } catch (error) {
    console.log(error,"error occured in getting order details")
  }
}



exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, message: 'Order status updated successfully', order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};


exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, message: 'Order has been cancelled', order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
};














exports.getEditProducts= async (req,res)=>{
  try {
    const product = await Product.findById(req.params.id);
    res.json(product);
} catch (err) {
    res.status(500).json({ error: 'Failed to fetch product details.' });
}
}




exports.editProducts = async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, price, category, existingImages, deletedImages } = req.body;

    console.log("Body Data:", req.body);
    console.log("Uploaded Files:", req.files);

    // Parse JSON data from the frontend
    const existingImagesList = JSON.parse(existingImages || '[]');
    const deletedImagesList = JSON.parse(deletedImages || '[]');

    // Handle new images
    const newImages = req.files.map(file => file.filename);

    // Remove deleted images from the server
    if (deletedImagesList.length > 0) {
      deletedImagesList.forEach(image => {
        const imagePath = path.join(__dirname, '../uploads', image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath); // Delete the file from the server
        }
      });
    }

    // Final list of images: Existing (minus deleted) + Newly added
    const updatedImages = [
      ...existingImagesList.filter(img => !deletedImagesList.includes(img)),
      ...newImages,
    ];

    // Update the product in the database
    await Product.findByIdAndUpdate(productId, {
      name,
      description,
      stock,
      price,
      category,
      images: updatedImages, // Update with combined images
    });

    res.status(200).json({ message: 'Product updated successfully!', images: updatedImages });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// ===========================================================================
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find({});
    console.log(users)

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
    

    const updatedUser = await User.findByIdAndUpdate(userId, { isBlocked }, { new: true });
    console.log(updatedUser);
    if (isBlocked && req.session.user && req.session.user._id === userId) {
      console.log("in the session destroying");
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
        res.clearCookie("connect.sid")
        return res.redirect("/users/login")
      });
    }

    res.status(200).json({
      success: true,
      message: `User has been ${isBlocked ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ success: false, message: "Error updating user status" });
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
    
    const category = new Category({ name, isActive: true })
    console.log(category);

    //checking for existing category
   

let existingCategories = await Category.find({ name: { $regex: name, $options: 'i' } });
if (existingCategories.length > 0) {
  console.log("Matching categories found:", existingCategories);
  return res.status(400).json({ success: false, message: "Category already exists" });
}else{
  const savedCategory = await category.save();
  console.log(savedCategory); 
  res.status(200).json({success:true,message:"succesfully updated"})
}


  } catch (error) {
    console.log('error',error);
    
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
    res.status(200).json({"success":true,message:"succesfully updated"})
  } catch (error) {
    res.status(500).send("Error updating category");
  }
};


// =================================================================================
