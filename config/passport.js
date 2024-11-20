const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../model/user")
const env =  require("dotenv").config()

passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"/users/auth/google/callback",
    
},
async (accesstoken,refreshToken,profile,done)=>{
try {
    console.log("swtfrgyubhkmp,l\n\nguvbhijnk");
    let user =await User.findOne({googleId:profile.id})
    
    
    if(user){
        return done(null,user)
    }else{
        console.log("it is reaching in creating use");
        const firstName = profile.name.givenName || "Google";
        const lastName = profile.name.familyName || "User";

        user = new User({
            firstName: firstName,
            lastName: lastName,
            email: profile.emails[0].value,
            googleId: profile.id,      
        })
        await user.save()
        return done(null ,user)
    }
} catch (error) {
    console.log(error)
    return done(error,null)
    
}
}
))

//to add details in to the session
passport.serializeUser((user,done)=>{
    done(null,user.id)
})

passport.deserializeUser((id,done)=>{
    User.findById(id)
    .then(user=>{
        done(null,user)
    }).catch(err=>{
        done(err,null)
    })

})

module.exports = passport