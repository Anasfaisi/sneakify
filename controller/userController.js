
// controllers/userController.js
const User = require('../model/user');
const bcrypt = require('bcrypt');
const emailService = require("../config/emailService");
const { resolveContent } = require('nodemailer/lib/shared');

const generateResetToken =()=>{
    return crypto.randomBytes(32).toString('hex')
}

   //! otp verification
   const generateOtp = ()=>{
    return Math.floor(100000+Math.random()*900000).toString()
    }
   





// !Register new user
exports.getSignuppage=async(req,res)=>{
    console.log("it is rendering the page");
    res.render("signup",{
        title:"Sign ups ",
        user : req.session.user || null
    })
}

exports.signup = async (req, res) => {
    console.log("it is able to reach post signup route");
    const { firstName, lastName, email, password } = req.body;
    const errors = {};
   try{

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
        console.log("it is checking existing user");
        errors.email = 'This email is already registered';
    }
    
     if (Object.keys(errors).length>0){
        return res.status(400).json({ errors }) ;
    }
     

  
     //generate otp
     const  otp = generateOtp()
     console.log(otp)
     const otpexpiry = new Date(Date.now()+10*60*1000)
     console.log(otpexpiry)

     
     if(existingUser && !existingUser.isVerified){
        existingUser.firstName = firstName;
        existingUser.lastName = lastName;
        existingUser.password = password;
        existingUser.otp.code  = otp;
        existingUser.otp.expiresAt = otpexpiry;
        await existingUser.save()
     }else{
        console.log("after existing user checking");
        console.log(req.body.firstName)
        console.log(req.body.email)
        
        await User.create({
            firstName,
            lastName,
            email,
            password,
            otp:{
                code:otp,
             expiresAt : otpexpiry,
            }
        })
        console.log('it is creating user')
     }
    


     // send otp email
     const emailSent = await emailService.sendOtp(email,otp)

     if(!emailSent){
        console.error("error in sending email")
        errors.general = "otp not send to email"
        res.status(500).json({errors:{general:"failed to send email"}})
    }


    req.session.pendingEmail = email
    res.json({success:true,
        message:"OTP sent succesfully to the Email",
       
    })


    } catch (error){
        console.error(error)
        res.status(500).json({
            errors:{general : "unexpected error occured"}
        })
    }
};



exports.showVerifyOTP = (req, res) => {
    console.log("show verify otp rendered")
    const email = req.session.pendingEmail;
    
    if (!email) {
        return res.redirect('/users/signup');
    }
    
    res.render('otpverify', {
        email,
        title: 'Verify Email'
    });
};


exports.otpVerify= async (req,res)=>{
    console.log("it is coming to the otp verification handler")
    try{
    const {otp}=req.body;
    const email = req.session.pendingEmail

    if(!email){
        return res.status(500).json({
            errors:{general:"please sign up first"}
        })
    }


    if (!otp || otp.length !== 6) {
        console.log("reached in otp length checking")
        res.status(200).json({errors:{otp:"otp must be 6 characters"}})
    }

    const user = await User.findOne({email})
    console.log("user identified")
    if(!user){
        return res.status(500).json({
            errors:{general :"user not found !! please try again"}
        })
    }



    if (user.otp.code != otp  || otp.expiresAt < Date.now() ){
        console.log("reached to otp expiry")
        return res.status(500).json({
            errors:{otp:"otp expired or invalid otp"}
        })
    }
   

    user.isVerified = true
    user.otp.code = undefined
    await user.save()

    req.session.user = user._id
    console.log(req.session.user+ "user succesfully created")
    delete req.session.pendingEmail

    res.json({ success: true, message: "OTP verification successful" });


    }catch(error){
        console.log(error)
        res.status(500).json({
            errors:{general:"something went wrong !! please try again"}
        })
    }
}


exports.resendOtp = async(req,res)=>{
    errors={}
    try{
     const {email}=req.session.pendingEmail
     if(!email){
        res.render("otpverify",{
            title :"resend otp ",
            errors:{general:"please sign up first"}
        })
     }

     const user = await User.findOne({email})
     if(!user){
        res.render("otpverify",{
            title :"resend otp ",
            errors:{general:"user not found"}
        })
     }

     const otp = generateOtp()
     const otpexpiry = new Date(Date.now()+10*60*1000)

     user.otp={
        code :otp,
        expiresAt:otpexpiry
     }
     await user.save()

    const emailSent = emailService.sendOtp(email,otp)
    if(!emailSent){
        console.log("email is not departured")
        res.render("otpverify",{
            title :"resend otp ",
            errors:{general:"cannot send otp to the email"} 
        })
    }
    
     
      return res.render('otpverify', {
        success: 'New verification code sent to your email',
        email,
        title: 'Verify Email'
    });

    }catch(error){
        console.error(error)
        res.render("otpverify",{
            title:"resend otp",
            errors :{general :"oops!! something went wrong"}
        })
    }
}


//!  user login
exports.getLoginPage = (req,res)=>{
      res.render("login",{
         title:"login",
         user : req.session.user || null
      })
      

}

// ! login handler
exports.login = async(req,res)=>{
    const {email,password}= req.body

    try{
    const user = await User.findOne({email})
    console.log("user",user);

    const check= await bcrypt.compare(password, user.password)
    console.log("check",check);
    

    if(!check){

        return res.render("login",{
            title : "error login",
            error : "the login and password and does not match"
        })
    }
    req.session.user = user._id
    res.redirect("/users/home")
    }
    catch(error){
        console.error(error)
       res.render("login",{
          error:"some thing went wrong",
          title:"login error",
          email:req.body.email
       })
    }
}


//! Logout user
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Could not log out'
            });
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    });
};

