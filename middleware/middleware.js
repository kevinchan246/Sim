
module.exports = {
    isLoggedIn: (req, res, next) => {
        if(req.isAuthenticated()){
            return next();
        }
        req.flash("error", "Hey you need to tell me who you are first! (;");
        res.redirect("/login");
    },

    escReg: (text) => {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    },

}

