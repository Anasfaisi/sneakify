const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../model/user");
const path = require("path")
const bcrypt =require("bcrypt")
const env = require("dotenv").config();





passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/users/auth/google/callback",
    },
    async (accesstoken, refreshToken, profile, done) => {
      try {
     
        console.log(profile);
        let user = await User.findOne({ email: profile.emails[0].value });

        console.log("passport user", user);

        if (user) {
          return done(null, user);
        } else {
          const firstName = profile.name.givenName || "Google";
          const lastName = profile.name.familyName || "User";
          const hashedPassword = await bcrypt.hash("123456", 10);

          user = await new User({
            firstName: firstName,
            lastName: lastName,
            email: profile.emails[0].value,
            password: hashedPassword,
            googleId: profile.id,
          }).save();
          return done(null, user);
        }
      } catch (error) {
        console.log(error);
        return done(error, null);
      }
    }
  )
);

//to add details in to the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

module.exports = passport;
