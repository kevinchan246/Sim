const express = require("express");
const router = express.Router({mergeParams:true});
const Blog = require("../models/blog");
const passport = require("passport");
const User = require("../models/user");
const { render } = require("ejs");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

//GET root route -render the landing page
router.get("/", async(req, res) => {
    const blogs = await Blog.find().sort({
        date: "desc"
    })
    
    res.render("blogs/home", {blogs : blogs, currentUser: req.user});
})

//GET home page route
router.get("/home", async(req, res) => {
    //sort the blogs in descending date form
    const blogs = await Blog.find().sort({
        date: "desc"
    })
    res.render("blogs/home", {blogs : blogs, currentUser: req.user});
})


//==============
// AUTH ROUTES
//==============

//email verification route
router.get("/verify/:token", async(req, res) => {

    User.findOne({verifyToken: req.params.token, verifyTokenExpires: {$gt: Date.now()} }, async(err, user) =>{
        if (!user) {
            req.flash("error", "Verification token is invalid or expired.");
            return res.redirect("/home");
        }
        //reset tokens to null and set emailVerified to true
        user.emailVerified = true;
        user.verifyToken = null;
        user.verifyTokenExpires = null;
        user = await user.save();
        res.render("emailVerification", {token: req.params.token});

    });
})

// show the register form
router.get("/register", (req, res) => {
    res.render("register");
})

//handle sign up logic
router.post("/register", (req, res) => {
    const {displayName, username, password, password2, dob} = req.body;
    let errs;

    if(password.length < 8){
        errs = 'Passwords has to be at least 8 characters';
        return res.render("register", { 
            errs,
            displayName, 
            username,
            password,
            password2, 
            dob, 
          });
    }
    if (password != password2) {
        errs = 'Passwords do not match';
        
        return res.render("register", { 
            errs,
            displayName, 
            username,
            password,
            password2, 
            dob, 
          });

    } else {
        //check if the displayName exists
        //the duplicate of username will be auto-checked by password-local-mongoose middleware 
        User.findOne({ displayName: displayName}).then(user => {
            if(user){
                
                errs = 'Display name already exits, please choose a different one';
                return res.render("register", { 
                    errs,
                    displayName, 
                    username,
                    password,
                    password2, 
                    dob
                });
            } 
            else {
                //register to database
                
                User.register(new User({
                    username : req.body.username, 
                    displayName: req.body.displayName, 
                    email: req.body.username,
                    dob: req.body.dob,
                }), req.body.password, (err, user) => {

                    async.waterfall([
                        //first create a token for the unique verification page
                        (done) => {
                            crypto.randomBytes(20, (err, buf) => {
                                const token = buf.toString('hex');
                                done(err, token);
                            });
                        },
                        //match the user
                        (token, done) => {
                            User.findOne({email: req.body.username}, (err, user) => {
                                if (!user){
                                    req.flash("error", "Cannot find the account with this email.");
                                    return res.redirect("/login");
                                }

                                user.verifyToken = token;
                                user.verifyTokenExpires = Date.now() + 3600000; //the token expires after 1 hr

                                //save token info
                                user.save((err) => {
                                    done(err, token, user);
                                });

                            })
                        },

                        //send the verification email
                        (token, user, done) => {
                            //mailer config
                            const smtpTransport = nodemailer.createTransport({
                                service: "Gmail",
                                auth: {
                                    user: "sim.blog.management@gmail.com",
                                    pass: process.env.GMAILPW
                                }
                            });
                            //The email content setting
                            const mailOptions = {
                                to: user.email,
                                from: "sim.blog.management@gmail.com",
                                subject: "Email Confirmation",
                                text: "You have created an account with Sim using " +
                                    user.email + ". " +
                                    "Please click the following link, or paste it into your browser to confirm the email address." + "\n\n" +
                                    "http://" + req.headers.host + "/verify/" + token + "\n\n" +
                                    "If you did not make this request, please ignore this email." + "\n\n" +
                                    "Thank you!"
                            };
                            smtpTransport.sendMail(mailOptions, (err) => {
                                req.flash("success", "An confirmation email has been sent to " + user.email + ". Please check your email.");
                                res.redirect("/login");
                                done(err, "done");
                                
                            });
                        }],
                        //handling errors
                        (err) => {
                            if (err){
                                req.flash("error", err.message);
                                res.redirect("/register");
                            }
                        }
                    );

                    if(err){
                        errs = err;
                        return res.render("register", { 
                            errs,
                            displayName, 
                            username,
                            password,
                            password2, 
                            dob
                        });
                    }

                    //authenticate and login user
                    passport.authenticate("local")(req, res, () => {
                        req.flash("success", "An confirmation email has been sent to " + user.email + ". Please check your email.");
                        res.redirect("/home");
                    })
                    
                })
            }
        })
    }
})

//show login form
router.get("/login", (req, res) => {
    res.render("login", {});
})
//handle the login logic
//app.post("/login", middleware, callback) 
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/home",
        successFlash: 'Welcome!',
        failureRedirect: "/login",
        failureFlash: true
    }), (req, res) => {
    //this callback won't do anything, can get rid of it if want to
})

//logout route
router.get("/logout", (req, res) => {
    req.logout();
    req.flash("success", "Logged you out, see you later~");
    res.redirect("/home");
})


module.exports = router;