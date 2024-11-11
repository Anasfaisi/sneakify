const nodeMailer =  require("nodemailer")
require('dotenv').config()

const Transporter = nodeMailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS
    }
})

exports.sendOtp = async (email,otp)=>{
      const MailOptions = {
        from:process.env.EMAIL_USER,
        to:email,
        subject : "OTP verification code ",
        html: `<h1>Account Verification</h1>
        <p>Your OTP for account verification is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>`
      }

try{
    await Transporter.sendMail(MailOptions)
    return true
}

catch(error){
    console.log("email sending error :"+error)
    return false
}
}

