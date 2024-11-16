// controllers/userController.js
const User = require("../model/user");
const bcrypt = require("bcrypt");
const emailService = require("../config/emailService");
const { resolveContent } = require("nodemailer/lib/shared");

const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.getSignuppage = async (req, res) => {
  
  if (req.session.user) {
    console.log("user is in the session");

    return res.redirect("/users/home");
  }
  console.log("it is rendering the page");
  res.render("users/signup", {
    title: "Sign ups ",
    user: req.session.user || null,
  });
};

exports.signup = async (req, res) => {
  console.log("it is able to reach post signup route");
  const { firstName, lastName, email, password } = req.body;
  const errors = {};
  try {
    const existingUser = await User.findOne({ email });
    console.log(existingUser)
    if (existingUser && existingUser.isVerified) {
      console.log("it is checking existing user");
      errors.email = "This email is already registered";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    //generate otp
    const otp = generateOtp();
    console.log(otp);
    const otpexpiry = new Date(Date.now() + 2 * 60 * 1000);
    console.log(otpexpiry);

    if (existingUser && !existingUser.isVerified) {
      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.password = password;
      existingUser.otp.code = otp;
      existingUser.otp.expiresAt = otpexpiry;
      await existingUser.save();
    } else {
      // console.log("after existing user checking");
      // console.log(req.body.firstName)
      // console.log(req.body.email)

      await User.create({
        firstName,
        lastName,
        email,
        password,
        otp: {
          code: otp,
          expiresAt: otpexpiry,
        },
      });
      console.log("it is creating user");
    }

    // send otp email
    const emailSent = await emailService.sendOtp(email, otp);

    if (!emailSent) {
      console.error("error in sending email");
      errors.general = "otp not send to email";
      res.status(500).json({ errors: { general: "failed to send email" } });
    }

    req.session.pendingEmail = email;
    res.redirect("/users/otp-verify");
  } catch (error) {
    console.error(error);
    res.status(500).json({
      errors: { general: "unexpected error occured" },
    });
  }
};

exports.showVerifyOTP = (req, res) => {
  console.log("Rendering OTP verification page");

  const email = req.session.pendingEmail;
  if (!email) {
    return res.redirect("/users/signup");
  }

  res.render("users/otp-verify", {
    email,
    title: "Verify Email",
  });
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
    console.log("User identified");

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

    req.session.user = user._id;
    console.log("User successfully verified:", req.session.user);

    delete req.session.pendingEmail;
    console.log(req.session.user);

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
  console.log("it is resendotp post route");
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


exports.getLoginPage = async (req, res) => {

  if (req.session.user) {
    console.log("user available");

    return res.redirect("/users/home");
  }

  return res.render("users/login", {
    title: "login page",
  });
};


exports.login = async (req, res) => {


  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    
    if(user.isBlocked){
      console.log("this is responsible for not entering");
      return res.redirect("/users/login")}
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
    req.session.user = user._id;
    res.status(200).json({ success: true, message: "logged in succesfully" });
  } catch (error) {
    console.error("error occured in usercontroller in login validation", error);
    res.status(500).json({ errors: { general: "server error " } });
  }
};

//! Logout user
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Could not log out",
      });
    }
    // res.clearCookie("connect.sid"); // Clear session cookie
    console.log("session destroyed succesfully");
    return res.status(200).json({message:"logged out"})
  });
};

exports.getForgetPassword = (req, res) => {
  res.render("forgetPassword");
};

exports.postForgetPassword = (req, res) => {};

exports.home = async (req, res) => {
  res.render("users/home");
};
