// controllers/userController.js
const User = require("../model/user");
const bcrypt = require("bcrypt");
const emailService = require("../config/emailService");
const { resolveContent } = require("nodemailer/lib/shared");
const Product = require("../model/products");
const Address = require("../model/address")
const Cart    = require("../model/cart")
const Order = require("../model/order")



const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.getSignuppage = async (req, res) => {
  if (req.session?.passport?.user) {
    console.log("user is in the session");

    return res.redirect("/users/home");
  }
  console.log("it is rendering the page");
  res.render("users/signup", {
    title: "Sign ups ",
    user: req.session.passport.user || null,
  });
};

exports.signup = async (req, res) => {
  console.log("it is able to reach post signup route");
  const { firstName, lastName, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    console.log("the existing user : ", existingUser);
    if (existingUser) {
      console.log("it is checking existing user");
      return res.status(400).json({ message: "This email is already registered" });
  
    }

    //generate otp
    const otp = generateOtp();
    console.log(otp);
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000);
    console.log(otpExpiry);

    if (existingUser && !existingUser.isVerified) {
      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.password = password;
      existingUser.otp.code = otp;
      existingUser.otp.expiresAt = otpExpiry;
      await existingUser.save();
    } else {
      console.log("after existing user checking");
      console.log(req.body.firstName)
      console.log(req.body.email)
      console.log(req.body.password)
      console.log(otp)
      console.log(otpExpiry)
      
     const hashedpassword= await bcrypt.hash(password,10)
     console.log(hashedpassword);
     let user= await User.create({
        firstName,
        lastName,
        email,
        password:hashedpassword,
        otp: {
          code: otp,
          expiresAt: otpExpiry,
        },
      });
      
      console.log("it is creating user");
      console.log(user);
    }

    // send otp email
    const emailSent = await emailService.sendOtp(email, otp);
    console.log(emailSent);

    if (!emailSent) {
      console.error("error in sending email");
      res.status(500).json({ errors: { general: "failed to send email" } });
    }

    req.session.pendingEmail = email;
    console.log(email);
    res.status(200).json({message:"ready to send the email"})
  } catch (error) {
    console.error(error);
    res.status(500).json({message: "unexpected error occured" ,
    });
  }
};

exports.showVerifyOTP = (req, res) => {
  console.log("Rendering OTP verification page");

  const email = req.session.pendingEmail;
  console.log(email);
  if (!email) {
    return res.redirect("/users/signup");
  }
  try {
    res.render("users/otp-verify", {
      email,
      title: "Verify Email",
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
      return res.status(500).json({
        errors: { general: "Please sign up first" },
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(500).json({
        errors: { general: "User not found! Please try again" },
      });
    }

    console.log("current otp :", otp);
    console.log("database otp :", user.otp.code);
    if (user.otp.code != otp) {
      console.log("OTP invalid or expired");

      return res.status(500).json({
        errors: { otp: "OTP expired or invalid" },
      });
    }

    user.isVerified = true;
    user.otp.code = undefined;
    await user.save();

    req.session.passport = {};
    req.session.passport.user = user._id;

    console.log("User successfully verified:", req.session.passport);

    delete req.session.pendingEmail;

    res.status(200).json({ success: true, message: "Successfully signed in" });
  } catch (error) {
    console.error(error);
    console.log("error in catch of backend");
    res.status(500).json({
      errors: { general: "Something went wrong! Please try again" },
    });
  }
};

exports.resendOtp = async (req, res) => {
  console.log("it is resend otp post route");
  try {
    const email = req.session.pendingEmail;
    if (!email) {
      return res.status(400).json({ error: "Please sign up first" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000);
    user.otp = { code: otp, expiresAt: otpExpiry };
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
  exports.getLoginPage = async(req, res) => {
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
    // res.clearCookie("connect.sid"); // Clear session cookie
    console.log("session destroyed succesfully");
    // return res.status(200).json({message:"logged out"})
    res.redirect("/users/login");
  });
};


//===========================================================
exports.getForgetPassword = async(req, res) => {
  res.render("users/forgetPassword");
};

exports.forgetPassword = async(req, res) => {
  console.log("it is reaching in post forget password ");
  try {
    const email = req.body.email;
    const user = await User.findOne({email})
    if(!user){
      return res.status(404).json({message:"user not found"})
    }
    const otp = generateOtp()
    user.otp.code =otp
    await user.save()


    const emailSent = await emailService.sendOtp(email, otp);
    console.log(emailSent);
    req.session.pendingEmail = email;

    if(!emailSent){
      return res.status(500).json({message:"error in sending the otp "})
    }else{
      return res.status(200).json({message:"otp sent successfully"})
    }

  } catch (error) {
    console.log(error,"error occuring in forget password controller")
    return res.status(500).json({message:"error occured in forget password"})
  }
};

//==============================================================

exports.home = async (req, res) => {
  console.log(req.session);

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
  try {
    // Fetch all active products
    const products = await Product.find({ isActive: true });

    // Filter out products where all sizes are out of stock
    const inStockProducts = products.filter((product) => {
      return product.sizes.some((size) => size.stock > 0); // If any size has stock > 0
    });

    // Add stock information for each product's size to manage disabled state
    inStockProducts.forEach((product) => {
      product.sizes.forEach((size) => {
        size.isOutOfStock = size.stock === 0; // Mark sizes as out of stock if stock is 0
      });
    });

    console.log(inStockProducts);
    res.render("users/shop", {
      products: inStockProducts, // Send filtered products to the view
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

exports.productDetails = async (req, res) => {
  try {
    const relatedProducts = await Product.find();
    const productId = req.params.id;
    const product = await Product.findById(productId);
    res.render("users/productDetails", { product, relatedProducts });
  } catch (error) {
    console.error("this is hapening " + error);
    res
      .status(500)
      .json({ success: false, message: "can't able to fetch product" });
  }
};

exports.getStock =async (req, res) => {
  const { id, size } = req.params;
  try {
      const product = await Product.findById(id);
      if (!product) {
          return res.status(404).json({ message: 'Product not found' });
      }

      // Find the specific size in the sizes array
      const sizeData = product.sizes.find(s => s.size === size);

      if (!sizeData) {
          return res.status(404).json({ message: 'Size not found' });
      }

      res.json({ stock: sizeData.stock });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching product stock' });
  }
}


exports.sortProducts =async (req, res) => {
  const { sort, size, color, brand, gender, category } = req.query;  // Extract query parameters

  const filters = {};

  if (size && size.length > 0) {
    filters["sizes.size"] = { $in: size.map(s => parseInt(s)) };  // Match products where 'sizes.size' is one of the selected sizes
  }

  


  let sortOption = {};
  switch (sort) {
    case 'price-asc':
      sortOption = { price: 1 };
      break;
    case 'price-desc':
      sortOption = { price: -1 };
      break;
    case 'rating':
      sortOption = { averageRating: -1 };
      break;
    case 'featured':
      sortOption = { featured: -1 };
      break;
    case 'new-arrivals':
      sortOption = { createdAt: -1 };
      break;
    case 'a-z':
      sortOption = { name: 1 };
      break;
    case 'z-a':
      sortOption = { name: -1 };
      break;
    default:
      sortOption = {};
  }

  try {
    const products = await Product.find(filters)
      .sort(sortOption)
      .exec();

    res.render("shop", { products });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching products");
  }
}
//==========================================================

exports.profile = async(req,res)=>{
  try{
    console.log("reached profile route");
   
    const currentUser = req.session.passport.user
 
    const user = await User.findById(currentUser)
    console.log(user);
    res.render("users/profile",{user})
   
    }
  catch(error){
    console.log("error in rendering the profile* :",error)
    res.status(500).json({message:"rendering failed"})

  }


}


exports.updateUserDetails = async(req,res)=>{
  try {
    const user = req.session.passport.user
    const {firstName,lastName,email}=req.body
    await User.findByIdAndUpdate(user,{
      firstName,
      lastName,
      email,
    })
    res.status(200).json({message:"user details updated succesfully"})
  } catch (error) {
    console.log("error in updating the user details  ",error);
    res.status(500).json({message:"error in updating user"})
}

}


exports.updatePassword = async (req, res) => {
  try {
    console.log(req.session ,"req.session");
    const userId = req.session.passport?.user; 
    console.log(userId);
    if (!userId) {
      return res.status(404).json({ message: "User not found or not logged in" });
    }

    const user = await User.findById(userId);
    console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }
  console.log(currentPassword);
  console.log(user.password,"====");
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    console.log(isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
  
   
    user.password = confirmPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



//===========================================================
exports.getAddress = async(req,res)=>{

  console.log("it is reached in get address");
  try {
    const userId = req.session.passport.user

    const user = await User.findById(userId)
    if(!user){
      return res.status(404).send("User not found");
    }
    const address = await Address.find({ userId: user._id }); 

    res.render("users/address",{
      address
    })

  } catch (error) {
    
  }
}

exports.addAddress = async (req,res)=>{
  try {
    const userId = req.session.passport.user

    const {firstName,lastName,address,place,city,district,pincode,state,phone,country}= req.body;
  


    const newAddress = new Address({
      userId : userId,
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
      phone
    })
    await newAddress.save()
    res.status(200).json({message:"succesfully added the new address"})
  }
   catch (error) {
    console.log(error,"the error occured in adding address")
    res.status(500).json({message:"adding new address failed"})
  }
}


exports.editAddress =async (req,res)=>{
 try{
  console.log("it is reaching in edit address");
  
  const addressId = req.params.id

  const {firstName,lastName,address,place,city,district,pincode,state,phone,country}= req.body;
  const userAddress = await Address.findByIdAndUpdate(addressId,{

    firstName,
    lastName,
    address,
    city,
    place,
    district,
    state,
    country,
    pincode,
    phone
    
  })
  console.log("this is user address ",userAddress);
  
  userAddress.save()
  res.status(200).json({message:"user address updated succesfully"})

 }
 catch(error){
  console.log(error,"error occured in updating user")
  return res.status(500).json({message:"error in updating user Address"})
 }
}


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


exports.getorderHistory =async (req,res)=>{
  console.log("it is reached in get order history")
  try {
     const userId =req.session.passport.user;
     const user = await User.findById(userId);
     const orders = await Order.find({userId:user._id})
     console.log(orders);

     res.render("users/orderHistory",{orders})
  } catch (error) {
    console.log(error,"error occured in getting order history")
  }
}

exports.getOrderDetails = async(req,res)=>{
  console.log("it is reaching in order details");
  
  try {
    const orderId =req.params.id;
    console.log(orderId);
    const order = await Order.findById(orderId);
    console.log(order)
    res.render("users/orderDetails",{order})
  } catch (error) {
    console.log(error,"error occured in getting order details")
    
  }
}

exports.cancelOrder =async (req, res) => {
  console.log("it is reached in cancel order");
  try {
    const orderId = req.params.id;
    const userId = req.session.passport.user; 

    
    const order = await Order.findOne({ _id: orderId, userId: userId });
    console.log(order);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
     console.log(order.status);
    if (order.status !== 'pending') {
       return res.status(400).json({ message: 'Order cannot be cancelled' });
    }

    
    order.status = 'cancelled'; 
    await order.save();
    console.log(order.status);

    res.status(200).json({message:"cancelled the product"})

  } catch (error) {
    console.log(error,"errror in canceling the product");
    res.status(500).json({ message: 'An error occurred while cancelling the order' });
  }
}