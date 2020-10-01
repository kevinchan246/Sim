const express = require("express");
const passport = require("passport");
const router = express.Router({mergeParams:true});

//authenticate with google
//route GET 'auth/google'
router.get('/auth/google', passport.authenticate("google", { scope: ['openid', 'profile', 'email'] }))

//Google auth callback
//get /auth/google/callback
router.get("/auth/google/callback", passport.authenticate("google", { 
    failureRedirect: "/login",
    failureFlash: 'Failed login with Google account'
}), (req, res) => {
    //if auth success
    res.redirect("/home");
})

module.exports = router;