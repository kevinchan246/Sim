const express = require("express");
const router = express.Router({mergeParams:true});
const User = require("../models/user");
const middleware = require("../middleware/middleware.js");
const Blog = require("../models/blog");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require('dotenv').config();

//upload file configs
var multer = require('multer');
var storage = multer.diskStorage({
  filename: (req, file, callback) => {
      //create a custom name for the uploaded file
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = (req, file, cb) => {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files(.jpg/.jpeg/.png/.gif) are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
const { render } = require("ejs");
cloudinary.config({ 
  cloud_name: 'simblogimage', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//show account route
//under account page, there exists update tab pane
router.get("/account/:id", middleware.isLoggedIn, async(req, res) => {
    const user = await User.findById(req.params.id);
    const blogs = await Blog.find().sort({
        date: "desc"
    })
    res.render("users/account", {user: user, blogs: blogs});
})

//update profile route 
router.put("/account/:id", upload.single('profileImg'), async(req, res, next) => {
    let user = await User.findById(req.body.userId);
    
    //check if there is any file need to be upload
    if (req.file){
        try {
            if (user.profileImgId != ""){
                await cloudinary.v2.uploader.destroy(user.profileImgId);
            }
            let result = await cloudinary.v2.uploader.upload(req.file.path);
            user.profileImgId = result.public_id;
            user.profileImg = result.secure_url;
            
        } catch(err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
    }
    
    
    //check the duplicates of displayname 
    if (user.displayName != req.body.displayName){
        //wait for the app to check the same displayName exists 
        //boolean flag
        const foundUser = await User.exists({displayName: req.body.displayName});
        if (foundUser){
            req.flash("error", "The Display Name has been used, please enter a different one.")
            return res.redirect("back");
        } else {
            try {
                //if the displayName doesn't exist, apply it to the current user
                user.displayName = req.body.displayName;
            } catch (err) {
                req.flash("error", "Error occurs when finding user:" + err);
                res.redirect("back");
            }
        }
    } 
    user.aboutMe = req.body.aboutMe
    user.jobTitle = req.body.jobTitle
    try{
        user = await user.save();
        res.redirect(`/account/${user.id}`)
    }catch(e){
        req.flash("error", "Error when saving the updated information");
        return res.redirect(`/account/${user.id}`);
    }
})

//forgot password route
router.get("/forgot", (req, res) => {
    res.render("users/forgot");
})

//post route for reset password
router.post("/forgot", (req, res) => {
    async.waterfall([
        //first create a token for the unique reset page
        (done) => {
            crypto.randomBytes(20, (err, buf) => {
                const token = buf.toString('hex');
                done(err, token);
            });
        },
        //match the user
        (token, done) => {
            User.findOne({email: req.body.email}, (err, user) => {
                if (!user){
                    req.flash("error", "Cannot find the account with this email.");
                    return res.redirect("/forgot");
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; //the token expires after 1 hr

                //save token info
                user.save((err) => {
                    done(err, token, user);
                });

            })
        },
        //send the reset email
        (token, user, done) => {
            //mailer config
            const smtpTransport = nodemailer.createTransport({
                service: "Gmail",
		port: 465,
		secure: true,
                auth: {
                    user: "sim.blog.management@gmail.com",
                    pass: process.env.GMAILPW
                }
            });
            //The email content setting
            const mailOptions = {
                to: user.email,
                from: "sim.blog.management@gmail.com",
                subject: "Reset Password",
                text: "You are receiving this email because you (or someone else) have requested the reset of the password of the account that associated with " +
                    user.email + "." +
                    "Please click the following link, or paste it into your browser to complete the process." +
                    "http://" + req.headers.host + "/reset/" + token + "\n\n" +
                    "If you did not make this request, please ignore this email and your password will not be changed" + "\n\n" +
                    "To ensure the security of your account, we recommend you to change your password regularly"
            };
            smtpTransport.sendMail(mailOptions, (err) => {
               
                req.flash("success", "An email has been sent to " + user.email + " with further instructions.");
                res.redirect("/forgot");
                done(err, "done");
                
            });
        }

    ], 
    //if there is any error with sending the email
    (err) => {
        if (err) {
            req.flash("error", err.message);
            res.redirect("/forgot");
        };
    });
});



//get route for the reset page
router.get("/reset/:token", (req, res) => {
    //find the user who makde the request: check the token and check the expiration time of the token
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()} }, (err, user) =>{
        if (!user) {
            req.flash("error", "Password reset token is invalid or expired.");
            return res.redirect("/forgot");
        }
        res.render('users/reset', {token: req.params.token});
    });
});
//post route for reset password
router.post("/reset/:token", (req, res) => {
    async.waterfall([
        (done) => {
            //find and get the info about the user
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()} }, (err, user) => {
                if (!user) {
                    req.flash("error", "Password reset token is invalid or expired.");
                    return res.redirect("/back");
                }
                //check if the new password match the confirm password
                if (req.body.newPassword === req.body.confirmNewPassword) {
                    //set the new password to the user
                    user.setPassword(req.body.newPassword, (err) => { 
                        //after setting the new password, delete the token and exiration time
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;
                        //update the changes in database and log in the user
                        user.save((err) => {
                            if (err){
                                req.flash("error", "Error when saving new password");
                                res.redirect("back");
                            }else{
                                done(err,user);
                            }
                        });
                    })
                } else {
                    req.flash("error", "Passwords do not match");
                    return res.redirect('back');
                }
            })
        },
        //send the confirmation email
        (user, done) => {
            //mailer config
            const smtpTransport = nodemailer.createTransport({
                service: "Gmail",
		port: 465,
		secure:true,
                auth: {
                    user: "sim.blog.management@gmail.com",
                    pass: process.env.GMAILPW
                }
            });
            //The email content setting
            const mailOptions = {
                to: user.email,
                from: "sim.blog.management@gmail.com",
                subject: "Changed Password Confirmation",
                text: "Your password with account " + user.email + " has been changed." 
            };
            smtpTransport.sendMail(mailOptions, (err) => {
                req.flash("success", "Password changed! An confirmation email has been sent to " + user.email);
                res.redirect("/login");
                done(err, "done");
            });
        }
    ], (err) => {
        if (err) {
            req.flash("error", err);
            res.redirect("/forgot");
        };
    });
})

//post route for changing password
router.post("/account/:id", middleware.isLoggedIn, (req, res) => {
    async.waterfall([
        (done) => {
            //find and get the info about the user
            User.findById(req.params.id, (err, user) => {
                if (!user) {
                    req.flash("error", "Couldn't find the user, try to login first or relog");
                    return res.redirect("/back");
                }
                //check if the new password match the confirm password
                if (req.body.newPassword === req.body.newPasswordConfirm) {
                    //set the new password to the user
                    user.changePassword(req.body.currentPassword, req.body.newPassword, (err, user) => {
                        if (err) { return done(err); }
                        
                        user.authenticate(req.body.newPassword, (err, result) => {
                            if (err) { return done(err); }
                            done();
                        });
                    });
                   
                } else {
                    req.flash("error", "Passwords do not match");
                    return res.redirect('back');
                }
            })
        },
        //send the confirmation email
        (done) => {
            User.findById(req.params.id, (err, user) => {
                //mailer config
                const smtpTransport = nodemailer.createTransport({
                    service: "Gmail",
		    port: 465,
		    secure: true,
                    auth: {
                        user: "sim.blog.management@gmail.com",
                        pass: process.env.GMAILPW
                    }
                });
                //The email content setting
                const mailOptions = {
                    to: user.email,
                    from: "sim.blog.management@gmail.com",
                    subject: "Changed Password Confirmation",
                    text: "Your password with account " + user.email + " has been changed." 
                };
                smtpTransport.sendMail(mailOptions, (err) => {
                    req.flash("success", "Password changed! An confirmation email has been sent to " + user.email);
                    res.redirect("/home");
                    done();
                });
            });
        }
    ], (err) => {
        if (err) {
            req.flash("error", err.message);
            res.redirect("/home");
        };
    });
})

router.get("/verify", middleware.isLoggedIn, async(req, res) => {
    let user = await User.findById(req.params.id);
    res.render("verificationSent", {user: user});
})

//route for requsting verification email
router.post("/verify", middleware.isLoggedIn, async(req, res) => {
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
            User.findById(req.body.id, (err, user) => {
                if (!user){
                    req.flash("error", "Cannot find the account with this email.");
                    return res.redirect("back");
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
		port: 465,
		secure: true,
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
                text: "You were requested to verify the email address with Sim using " +
                    user.email + ". " + "\n\n" +
                    "Please click the following link, or paste it into your browser to confirm the email address." + "\n\n" +
                    "This link will be expired after 1 hour." + "\n\n" +
                    "http://" + req.headers.host + "/verify/" + token + "\n\n" +
                    "If you did not make this request, please ignore this email." + "\n\n" +
                    "Thank you!"
            };
            smtpTransport.sendMail(mailOptions, (err) => {
                req.flash("success", "Verification email sent, please check your email.")
                res.redirect("back");
                done(err, "done");
            });
        }],
        //handling errors
        (err) => {
            if (err){
                
                console.log(err);
            }
        }
    );
})

router.get("/usershow/:displayName", async(req, res) =>{
    const user = await User.findOne({ displayName: req.params.displayName });
    const blogs = await Blog.find().sort({
        date: "desc"
    })
    if (user == null) {
        req.flash("error", "Cannot find the user");
        res.redirect("back");
    }
    res.render("userShows/userShow", {user: user, blogs : blogs});
})

router.get("/usershow/:displayName/followers", async(req,res) => {
    const user = await User.findOne({ displayName: req.params.displayName });
    if (user == null) {
        req.flash("error", "Cannot find the user");
        res.redirect("back");
    }
    res.render("userShows/showFollowers", {user: user});
})

//route for follow/unfollow a user
router.post("/follow/:displayName", middleware.isLoggedIn, async(req, res) => {
    await User.findOne({displayName : req.body.authorName}, async(err, foundAuthor) => {
        let currentUser = await User.findOne({displayName: req.body.userName}); 
        if (foundAuthor.followers.find(elem => elem.displayName === req.body.userName)){
            //if the follower already exists, remove it
            const idx = (followerObj) => followerObj.followerId === req.user._id;
            foundAuthor.followers.splice(idx, 1);
        } else {
            //if the follower not exist, push it in
            let follower = {
                followerId : req.user._id,
                displayName: req.body.userName,
                profileImg: currentUser.profileImg
            }
            foundAuthor.followers.push(follower);
        }
        const authorId = foundAuthor._id;
        const authorProfileImg = foundAuthor.profileImg;
        foundAuthor.save(async(err) => {
            if (err){
                req.flash("error", "Error happened when saving the user by follower system");
                res.redirect("back");
            } else {
                await User.findOne({displayName : req.body.userName}, (err, user) => {
                    if (user.followings.find(elem => elem.displayName === req.body.authorName)){
                        //if the following id already exists, remove it
                        const idx = (followingObj) => followingObj.followingId === authorId;
                        user.followings.splice(idx, 1);
                    } else {
                        //if the following id not exist, push it in
                        let author = {
                            followedId : authorId,
                            displayName : req.body.authorName,
                            profileImg: authorProfileImg
                        }
                        user.followings.push(author);
                    }
                    user.save(async(err) => {
                        if (err){
                            req.flash("error", "Error happened when saving the user by following system");
                            res.redirect("back");
                        } else {
                            
                            res.redirect("back");
                        }
                    })
                })
            }
        })
    });
})

//route for save/unsave blogs
router.post("/blog/:slug/save", async(req, res) => {
    //find the specific blog and current user
    const blog = await Blog.findOne({slug : req.body.slug});

    await User.findOne({displayName : req.body.userName}, async(err, user) => {
        if (err) {
            req.flash("error", "Error finding current user...");
            res.redirect("back");
        } else {
            if (user.savedBlogs.find(elem => elem.title === blog.title)){
                //if the follower already exists, remove it
                const idx = (savedBlogObj) => savedBlogObj.title === blog.title;
                user.savedBlogs.splice(idx, 1);
            } else {
                //if the follower not exist, push it in
                let newlySavedBlog = {
                    blogId : blog.id,
                    title : blog.title,
                    coverImg : blog.coverImg,
                    author: {
                        id: blog.author.id,
                        profileImg: blog.author.profileImg,
                        displayName: blog.author.displayName,
                    },
                    date : blog.date,
                    slug : req.body.slug
                }
                user.savedBlogs.push(newlySavedBlog);
            }
        
            await user.save((err)=>{
                if (err){
                    req.flash("error", "Error happened when saving the user by save blog system");
                    res.redirect("back");
                } else {
                    res.redirect("back");
                }
            })
        }
    });
    
    // user.savedBlogs.id = blog._id;
    // user.savedBlogs.author = blog.author;
})




module.exports = router;
