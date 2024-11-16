const Admin = require("../model/admin");
const bcrypt = require("bcrypt");
const Product = require("../model/products");
const User = require("../model/user");
const Category = require("../model/category");

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
    const products = await Product.find(); // Fetches all products
    res.render("admin/productManagement", {
      products,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addProducts = async (req, res) => {
  try {
    let { name, description, stock, price, category } = req.body;

    
    
    console.log(name, description, stock, price, category);

    const imageUrls = req.files.map((file) => `/uploads/${file.filename}`); // Array of URLs
    const imageNumber = req.body.imageNumber; // Determine which image this is
       console.log(`${imageNumber} is uploaded and has ${imageUrl} url`)
    if (
      !name ||
      !description ||
      stock === undefined ||
      price === undefined ||
      !category
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided." });
    }

    stock = Number(stock);
    price = Number(price);

    if (typeof stock !== "number" || stock < 0) {
      return res
        .status(400)
        .json({ message: "Stock must be a non-negative number." });
    }
    if (typeof price !== "number" || price < 0) {
      return res
        .status(400)
        .json({ message: "Price must be a non-negative number." });
    }

    const newProduct = new Product({
      name,
      description,
      stock,
      price,
      images:imageUrls,
      category,
      isActive: true,
    });

    const savedProduct = await newProduct.save();
    res.status(201).json({success:true, message: "product added succesfully", savedProduct});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===========================================================================
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find({});

    res.render("admin/userManagement", { users });
  } catch (error) {
    res.status(500).send("Error fetching users");
  }
};

exports.blockUser = async (req, res) => {
  try {
    console.log("it is reaching in block user");
    const userId = req.params.id;
    // console.log(userId)
    let check = await User.findByIdAndUpdate(userId, { isBlocked: true });
    // console.log(check);
    res.redirect("/admin/users");
  } catch (error) {
    res.status(500).json({ message: "Error blocking user" });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { isBlocked: false });
    res.redirect("/admin/users");
  } catch (error) {
    res.status(500).json({ message: "Error unblocking user" });
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
  const { name } = req.body;
  console.log(name);
  try {
    const category = new Category({ name, isActive: true });
    console.log(category);
    await category.save();
    res.redirect("/admin/category");
  } catch (error) {
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
  const { name } = req.body;
  try {
    await Category.findByIdAndUpdate(req.params.id, { name });
    res.redirect("/admin/category");
  } catch (error) {
    res.status(500).send("Error updating category");
  }
};
