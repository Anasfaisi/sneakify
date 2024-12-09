// middleware/auth.js
const User = require("../model/user")
exports.isAuthenticated =async (req, res, next) => {
  console.log("reaching in is authenticated middle ware");
  if (req.session.passport?.user) {
      try {
        const userId = req.session.passport.user;
        const user = await User.findById(userId);
  
        if (user && user.isBlocked) {
          
          req.session.destroy(() => {
            return res.redirect("/users/login");
          });
        } else {
          next();
        }
      } catch (error) {
        console.error("Error checking blocked user:", error);
        return res.redirect("/users/login");
      }
    } else {
      return res.redirect("/users/login")
    }
  };

exports.isAdmin = (req, res, next) => {
    if (!req.session.admin) {

        return res.redirect("/admin/login")
    }
    else{
        next();
    }
};



