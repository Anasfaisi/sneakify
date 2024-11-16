// middleware/auth.js
exports.isAuthenticated = (req, res, next) => {
    console.log(req.session.user)
    if (!req.session.user) {
        return res.redirect("/users/login")
    }
    else{
     next()
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



