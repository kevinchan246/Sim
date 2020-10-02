const express = require("express");
const passport = require("passport");
const router = express.Router({mergeParams:true});

//authenticate with google
//route GET 'auth/google'
router.get("/auth/google", passport.authenticate("google", { scope: ['openid', 'profile', 'email'] }));

//Google auth callback
//get /auth/google/callback
router.get("/auth/google/callback", passport.authenticate("google", { 
    failureRedirect: "/login",
    failureFlash: 'Failed login with Google account'
}), (req, res) => {
    //if auth success
    res.redirect("/home");
});

//authenticate with Facebook
//route GET '/auth/facebook'
router.get("/auth/facebook", passport.authenticate('facebook', {scope: 'email'}));

//Facebook auth callback
//GET /auth/facebook/callback
router.get("/auth/facebook/callback", passport.authenticate('facebook', {
    successRedirect: "/home",
    failureRedirect: "/login"
}));

// //authenticate with Twitter
// //route GET "/auth/twitter"
// router.get('/auth/twitter', passport.authenticate('twitter'));

// //Twitter auth callback
// //GET /auth/twitter/callback
// router.get('/auth/twitter/callback', passport.authenticate('twitter', { 
//     successRedirect: '/home',
//     failureRedirect: '/login' 
// }));

module.exports = router;