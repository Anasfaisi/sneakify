// controllers/userController.js
const User = require("../model/user");
const unverifiedUser = require("../model/unverifiedUser");
const bcrypt = require("bcrypt");
const emailService = require("../config/emailService");
const { resolveContent } = require("nodemailer/lib/shared");
const Product = require("../model/products");
const Address = require("../model/address");
const Cart = require("../model/cart");
const Order = require("../model/order");
const Category = require("../model/category")

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.getSignuppage = async (req, res) => {
  if (req.session?.passport?.user) {
    console.log("user is in the session");

    return res.redirect("/users/home");
  }
  console.log("it is rendering the signup page");
  res.render("users/signup", {
    title: "Sign up ",
  });
};

exports.signup = async (req, res) => {
  console.log("it is able to reach post signup route");
  const { firstName, lastName, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    console.log("the existing user : ", existingUser);
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "This email is already registered" });
    }

    //generate otp
    const otp = generateOtp();
    console.log(otp);

    const otpExpiry = new Date(Date.now() + 15 * 1000);
    console.log(otpExpiry);

    await unverifiedUser.create({
      firstName,
      lastName,
      email,
      password,
      otp: otp,
      otpExpiry: otpExpiry,
    });

    // send otp email
    const emailSent = await emailService.sendOtp(email, otp);
    console.log(emailSent);

    if (!emailSent) {
      console.error("error in sending email");
      res.status(500).json({ message: "failed to send email" });
    }
    req.session.pendingEmail = email;

    res.status(200).json({ message: "redirecting to otp verification" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "unexpected error occur" });
  }
};

exports.showVerifyOTP = async (req, res) => {
  console.log("Rendering OTP verification page");

  try {
    const email = req.session.pendingEmail;
    if (!email) {
      return res.redirect("/users/signup");
    }
    const unVerifiedUser = await unverifiedUser.findOne({ email });
    const otpExpiry = unVerifiedUser.otpExpiry.toISOString();

    res.render("users/otp-verify", {
      email,
      title: "Verify Email",
      otpExpiry,
    });
  } catch (error) {
    console.log("the render error is " + error);
  }
};

exports.otpVerify = async (req, res) => {
  console.log("Handling OTP verification");

  try {
    const { otp } = req.body;

    const email = req.session.pendingEmail;
    if (!email) {
      return res.status(500).json({ message: "Please sign up first" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered ." });
    }

    let user = await unverifiedUser.findOne({ email });
    if (!user) {
      return res
        .status(500)
        .json({ message: "User not found! Please try again" });
    }

    console.log("current otp :", otp);
    console.log("database otp :", user.otp);

    if (user.otp != otp) {
      console.log("OTP invalid or expired");
      return res.status(500).json({ message: "invalid OTP" });
    }
    if (user.otpExpiry < Date.now()) {
      return res.status(500).json({ message: "OTP expired try with new one " });
    }
    const hashedPassword = await bcrypt.hash(user.password, 10);
    console.log(hashedPassword);

    orgUser = await User.create({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: hashedPassword,
    });

    orgUser.isVerified = true;
    await orgUser.save();

    req.session.passport = {};
    req.session.passport.user = orgUser._id;
    console.log(req.session.passport.user)

    console.log("User successfully verified:", req.session.passport);

    delete req.session.pendingEmail;
    await unverifiedUser.deleteOne({ email });

    res.status(200).json({ success: true, message: "Successfully signed in" });
  } catch (error) {
    console.error(error, "error in catch of backend");
    res.status(500).json({ message: "Something went wrong! Please try again" });
  }
};

exports.resendOtp = async (req, res) => {
  console.log("it is resend otp post route");
  try {
    const email = req.session.pendingEmail;
    if (!email) {
      return res.status(400).json({ error: "Please sign up first" });
    }

    const user = await unverifiedUser.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 15 * 1000);
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    console.log(otp, "the resend otp");
    await user.save();

    const emailSent = emailService.sendOtp(email, otp);
    if (!emailSent) {
      return res.status(500).json({ error: "Unable to send OTP to email" });
    }

    return res
      .status(200)
      .json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Oops! Something went wrong" });
  }
};

//==========================================================
exports.getLoginPage = async (req, res) => {
  if (req.session?.passport?.user) {
    return res.redirect("/users/home");
  } else {
    return res.render("users/login", {
      title: "Login Page",
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user.isBlocked) {
      console.log("this is responsible for not entering");
      console.log(req.session);
      return res.redirect("/users/login");
    }

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "user not found" });
    }

    const check = await bcrypt.compare(password, user.password);

    if (!check) {
      return res.status(401).json({
        success: false,
        message: "the username and password and does not match",
      });
    }

    req.session.passport = {};
    req.session.passport.user = user._id;
    console.log(req.session);
    res.status(200).json({ success: true, message: "logged in succesfully" });
  } catch (error) {
    console.error("error occured in usercontroller in login validation", error);
    res.status(500).json({ errors: { general: "server error " } });
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
    // res.clearCookie("connect.sid");
    console.log("session destroyed succesfully");
    // return res.status(200).json({message:"logged out"})
    res.redirect("/users/login");
  });
};

//===========================================================
exports.getForgetPassword = async (req, res) => {
  res.render("users/forgetPassword");
};

exports.forgetPassword = async (req, res) => {
  console.log("=========reached in post forget password");
  try {
    const email = req.body.email;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Encode the email (use any secure encoding mechanism)
    const encodedEmail = Buffer.from(email).toString("base64");

    // Generate the reset password URL
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/users/resetPassword?email=${encodedEmail}`;
    console.log(resetUrl);

    const expiryTime = Date.now() + 10 * 60 * 1000; // 15 minutes
    user.resetPasswordExpiry = expiryTime;

    // Send the email (mock email sending)
    const emailSent = await emailService.sendPasswordResetEmail(
      email,
      resetUrl
    );
    console.log(emailSent);
    if (!emailSent) {
      return res.status(500).json({ message: "Error sending reset link" });
    }
    console.log("1");
    return res.status(200).json({ message: "Password reset link sent" });
    console.log("2");
  } catch (error) {
    console.error("Error in forget password:", error);
    return res
      .status(500)
      .json({ message: "Error occurred in forget password" });
  }
};

exports.showResetPasswordForm = (req, res) => {
  console.log("it is reaching in show reset form");
  try {
    const { email } = req.query;
    console.log(email);

    // Decode the email
    const decodedEmail = Buffer.from(email, "base64").toString("utf-8");
    console.log(decodedEmail);

    return res.render("users/resetPasswordForm", {
      email: decodedEmail,
      title: "Reset Password",
    });
  } catch (error) {
    console.error("Error rendering reset password form:", error);
    return res.redirect("/users/forgetPassword");
  }
};

exports.resetPassword = async (req, res) => {
  console.log("it reached in post reset password ");
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    if (password !== confirmPassword || !password || !confirmPassword) {
      return res.status(400).json({ message: "password does not match" });
    }

    const newPassword = await bcrypt.hash(password, 10);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    if (Date.now() > user.resetPasswordExpiry) {
      return res.status(400).json({ message: "Reset link has expired" });
    }
    user.password = newPassword;
    user.resetPasswordExpiry = undefined;
    await user.save();

    return res.status(200).json({ message: "password updated succesfully" });
  } catch (error) {
    console.log(error, "error occured in password reseting block");
    return res
      .status(500)
      .json({ message: "something went wrong in reseting password" });
  }
};

//==============================================================

exports.home = async (req, res) => {
  


  try {
    const products = await Product.find({ isActive: true });
    const users = await User.find({ isBlocked: false });
    res.render("users/home", { products, users });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).send("Server error");
  }
};

//=============================================================

exports.listingProducts = async (req, res) => {
  console.log("It is reached in listing products");
  try {
    const { sizes, category, minPrice, maxPrice, sort, featured , page = 1, limit = 5,search } = req.query; 
    let filter = { isActive: true }; 

    if (search) {
      const searchRegex = new RegExp(search, "i"); // "i" for case-insensitive
      filter.$or = [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } }
      ];
    }

    // Size filter
    if (sizes) {
      const sizeArray = sizes.split(",").map((size) => size.trim());
      filter.sizes = { $elemMatch: { size: { $in: sizeArray } } };
    }

    // Category filter
    if (category) {
      const categories = category.split(",").map((cat) => cat.trim());
      filter.category = { $in: categories };
    }

    // Price filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Featured filter
    if (featured === "true") {
      filter.featured = true;
    }

    // Initialize the query
    let sortOptions = {};
    if (sort) {
      switch (sort) {
        case 'price-asc':
          sortOptions.price = 1; // Ascending price
          break;
        case 'price-desc':
          sortOptions.price = -1; // Descending price
          break;
        case 'popularity':
          sortOptions.popularity = -1; // Descending popularity
          break;
        case 'newArrivals':
          sortOptions.createdAt = -1; // New arrivals (desc)
          break;
        case 'name-asc':
          sortOptions.name = 1; // Alphabetical order (ascending)
          break;
        case 'name-desc':
          sortOptions.name = -1; // Alphabetical order (descending)
          break;
        default:
          break;
      }
    }

    
    
    const skip = (page - 1) * limit;
    const totalProducts = await Product.countDocuments(filter); // Total number of products matching the filter
    const totalPages = Math.ceil(totalProducts / limit); // Total number of pages

    let productsQuery = Product.find(filter).sort(sortOptions).skip(skip).limit(limit);

    const products = await productsQuery;

    const inStockProducts = products.filter((product) =>
      product.sizes.some((size) => size.stock > 0)
    );

    // Mark out of stock sizes
    inStockProducts.forEach((product) => {
      product.sizes.forEach((size) => {
        size.isOutOfStock = size.stock === 0;
      });
    });

    // Fetch categories
    const categoriesList = await Category.find({ isActive: true });

    // Render the view
    res.render("users/shop", {
      products: inStockProducts,
      categories: categoriesList,
      currentPage: Number(page),
      totalPages: totalPages,
      totalProducts: totalProducts,
      search: search || '',
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};



exports.filter = async (req, res) => {
  console.log("it is reached in filter");
  const { sizes } = req.query; // sizes=5,6,7
  console.log("sizes are :",sizes);
  let filter = {};

  if (sizes) {
    const sizeArray = sizes.split(",").map(String); // Convert to ["5", "6", "7"]
    filter["sizes"] = { $elemMatch: { size: { $in: sizeArray } } }; // Check if any size matches
}

  try {
    console.log("filter :", filter);
      const products = await Product.find(filter);
      console.log(products);
      res.json(products); // Return filtered products
  } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).send("Server error");
  }
}

//=========================================================
exports.productDetails = async (req, res) => {
  try {
    const productId = req.params.id;

    // Find the product by ID and populate the offer
    const product = await Product.findById(productId).populate("offer");
    console.log(product);
    if (!product) {
      return res.status(404).render("users/error", {
        message: "Product not found",
      });
    }

    // Increment product popularity
    product.popularity += 1;
    await product.save()

    
    const relatedProducts = await Product.find()
    
    res.render("users/productDetails", {
      product,
      relatedProducts,
   
    });
    
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.render("users/productDetails")
  }
};


exports.getStock = async (req, res) => {
  const { id, size } = req.params;
  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find the specific size in the sizes array
    const sizeData = product.sizes.find((s) => s.size === size);

    if (!sizeData) {
      return res.status(404).json({ message: "Size not found" });
    }

    res.json({ stock: sizeData.stock });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching product stock" });
  }
};

exports.sortProducts = async (req, res) => {
  const { sort, size, color, brand, gender, category } = req.query; // Extract query parameters

  const filters = {};

  if (size && size.length > 0) {
    filters["sizes.size"] = { $in: size.map((s) => parseInt(s)) }; // Match products where 'sizes.size' is one of the selected sizes
  }

  let sortOption = {};
  switch (sort) {
    case "price-asc":
      sortOption = { price: 1 };
      break;
    case "price-desc":
      sortOption = { price: -1 };
      break;
    case "rating":
      sortOption = { averageRating: -1 };
      break;
    case "featured":
      sortOption = { featured: -1 };
      break;
    case "new-arrivals":
      sortOption = { createdAt: -1 };
      break;
    case "a-z":
      sortOption = { name: 1 };
      break;
    case "z-a":
      sortOption = { name: -1 };
      break;
    default:
      sortOption = {};
  }

  try {
    const products = await Product.find(filters).sort(sortOption).exec();

    res.render("shop", { products });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching products");
  }
};
//==========================================================

exports.profile = async (req, res) => {
  try {
    console.log("reached profile route");

    const currentUser = req.session.passport.user;

    const user = await User.findById(currentUser);
    console.log(user);
    res.render("users/profile", { user });
  } catch (error) {
    console.log("error in rendering the profile* :", error);
    res.status(500).json({ message: "rendering failed" });
  }
};

exports.updateUserDetails = async (req, res) => {
  try {
    const user = req.session.passport.user;
    const { firstName, lastName, email } = req.body;
    await User.findByIdAndUpdate(user, {
      firstName,
      lastName,
      email,
    });
    res.status(200).json({ message: "user details updated succesfully" });
  } catch (error) {
    console.log("error in updating the user details  ", error);
    res.status(500).json({ message: "error in updating user" });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    console.log(req.session, "req.session");
    const userId = req.session.passport?.user;
    console.log(userId);
    if (!userId) {
      return res
        .status(404)
        .json({ message: "User not found or not logged in" });
    }

    const user = await User.findById(userId);
    console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }
    console.log(currentPassword);
    console.log(user.password, "====");

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    console.log(isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    confirmPassword = await bcrypt.hash(confirmPassword, 10);
    user.password = confirmPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//===========================================================
exports.getAddress = async (req, res) => {
  console.log("it is reached in get address");
  try {
    const userId = req.session.passport.user;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }
    const address = await Address.find({ userId: user._id });

    res.render("users/address", {
      address,
    });
  } catch (error) {}
};

exports.addAddress = async (req, res) => {
  try {
    const userId = req.session.passport.user;

    const {
      firstName,
      lastName,
      address,
      place,
      city,
      district,
      pincode,
      state,
      phone,
      country,
    } = req.body;

    const newAddress = new Address({
      userId: userId,
      firstName,
      lastName,
      address,
      city,
      place,
      city,
      district,
      pincode,
      state,
      country,
      phone,
    });
    await newAddress.save();
    res.status(200).json({ message: "succesfully added the new address" });
  } catch (error) {
    console.log(error, "the error occured in adding address");
    res.status(500).json({ message: "adding new address failed" });
  }
};

exports.editAddress = async (req, res) => {
  try {
    console.log("it is reaching in edit address");

    const addressId = req.params.id;

    const {
      firstName,
      lastName,
      address,
      place,
      city,
      district,
      pincode,
      state,
      phone,
      country,
    } = req.body;
    const userAddress = await Address.findByIdAndUpdate(addressId, {
      firstName,
      lastName,
      address,
      city,
      place,
      district,
      state,
      country,
      pincode,
      phone,
    });
    console.log("this is user address ", userAddress);

    userAddress.save();
    res.status(200).json({ message: "user address updated succesfully" });
  } catch (error) {
    console.log(error, "error occured in updating user");
    return res.status(500).json({ message: "error in updating user Address" });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;

    const deletedAddress = await Address.findByIdAndDelete(addressId);

    if (!deletedAddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ message: "Error deleting address" });
  }
};

//================================================================================

exports.getorderHistory = async (req, res) => {
  console.log("it is reached in get order history");
  try {
    const userId = req.session.passport.user;
    const user = await User.findById(userId);
    const orders = await Order.find({ userId: user._id });
    console.log(orders);

    res.render("users/orderHistory", { orders });
  } catch (error) {
    console.log(error, "error occured in getting order history");
  }
};

exports.getOrderDetails = async (req, res) => {
  console.log("it is reaching in order details");

  try {
    const orderId = req.params.id;
    console.log(orderId);
    const order = await Order.findById(orderId);
    console.log(order);
    res.render("users/orderDetails", { order });
  } catch (error) {
    console.log(error, "error occured in getting order details");
  }
};

exports.cancelOrder = async (req, res) => {
  console.log("it is reached in cancel order");
  try {
    const orderId = req.params.id;
    console.log(orderId);
    const userId = req.session.passport.user;

    const order = await Order.findOne({
      _id: orderId,
      userId: userId,
    }).populate("products.productId");
    console.log(order);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    console.log(order.status);
    if (order.status !== "pending") {
      return res.status(400).json({ message: "Order cannot be cancelled" });
    }
    order.status = "cancelled";
    console.log(order.status);


    for (const item of order.products) {
      const product = item.productId;
      const sizeStock = product.sizes.find((size) => size.size === item.size);
      if (sizeStock) {
    


        await Product.findOneAndUpdate(
          { _id: product._id, "sizes.size": item.size },
          { $inc: { "sizes.$.stock": item.quantity } }, 
          { new: true } 
        );
      }
    }
    await order.save();

    res.status(200).json({ message: "cancelled the product" });
  } catch (error) {
    console.log(error, "error in canceling the product");
    res
      .status(500)
      .json({ message: "An error occurred while cancelling the order" });
  }
};
