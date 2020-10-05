const express = require("express");
const router = express.Router({mergeParams:true});
const Blog = require("../models/blog");
const User = require("../models/user");
const Comment = require("../models/comment");
const middleware = require("../middleware/middleware.js");
const blog = require("../models/blog");
const comment = require("../models/comment");

//CREATE - add new campground to DB
//this route will create the new campgound

//NEW -  show form for creating new blog
//this route should show the form that will send the data to the post route
router.get("/home/new", middleware.isLoggedIn, async(req, res) => {

    res.render("blogs/new", { blog : new Blog() });
})

//show edit blog page route
router.get("/home/edit/:id", async(req, res) => {
    const blog = await Blog.findById(req.params.id);
    res.render("blogs/edit", { blog : blog });
})

//show blog route
router.get("/home/:slug", async(req, res) => {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (blog == null) {
        req.flash("error", "Cannot find the blog");
        res.redirect("/home");
    }
  
        res.render("blogs/show", {blog: blog});
   
})

//route for posting new blog
router.post("/home", middleware.isLoggedIn, async(req, res, next) => {
    req.blog = new Blog();
    next()
}, saveBlogAndRedirect('new'))

//route for editing existing blog
router.put("/home/:id", middleware.isLoggedIn,  async(req, res, next) => {
    req.blog = await Blog.findById(req.params.id);
    next()
}, saveBlogAndRedirect('edit'))

//route for deleting a blog
router.delete("/home/:id", middleware.isLoggedIn, async(req, res) => {
    await Blog.findByIdAndDelete(req.params.id)
    req.flash("error", "The blog has been deleted")
    res.redirect("/home");
})

//function for saving blogs
function saveBlogAndRedirect(path){
    return async(req, res) => {
        let errs;
        let blog = req.blog
        blog.title = req.body.title;
        blog.coverImg = req.body.coverImg;
        blog.contents = req.body.contents;
        blog.author = {
            id : req.user._id,
            username: req.user.username,
            displayName: req.user.displayName,
            profileImg: req.user.profileImg,
            profileImgId: req.user.profileImgId
        }
        try{
            blog = await blog.save();
            req.flash("success", "The blog has been posted!")
            res.redirect(`/home/${blog.slug}`);
        }
        catch (e) {
            console.log(e)
            errs = e;
            res.render(`blogs/${path}`, { blog : blog } , errs);
        }  
    }
}



//route for showing searching blog result
router.get("/result", (req, res) => {
    if (req.query.search){
        const regex = new RegExp(middleware.escReg(req.query.search), 'gi');
        Blog.find({"title": regex}, (err, foundBlogs) => {
            if(err) {
                req.flash("error", err);
                res.redirect("back");
            }else{
                res.render("blogs/searchResult", {blogs: foundBlogs, qs: req.query});
            }
        })
    }
})

//TODO: add comment route both post and edit
//route for posting a new comment
router.post("/home/:slug/comment", middleware.isLoggedIn, async(req, res) => {
    Blog.findOne({slug: req.params.slug}, async(err, foundBlog) => {
        let newComment = new Comment();
        newComment.author.id = req.body.userId;
        newComment.author.displayName = req.body.userDisplayName;
        newComment.author.profileImg = req.body.userProfileImg;
        newComment.content = req.body.content;
        foundBlog.comments.push(newComment);
        try{            
            foundBlog = await foundBlog.save();
        } catch (err){
            console.log(err)
        }
        req.flash("success", "Comment Posted");
        res.redirect("back");
    })
})


//get route for comments
router.get("/home/:slug/comment", async(req, res) => {
    await Blog.findOne({slug : req.params.slug}, (err, foundBlog) => {
        if(err) {
            console.log(err);
        } else{
            res.redirect("/home/:slug");
        }
    })
})


router.delete("/home/:slug/comment/:id", middleware.isLoggedIn, async(req, res) => {
    await Blog.findOne({slug:req.params.slug}, async(err, foundBlog) => {
        if (foundBlog.comments.find(elem => elem.id === req.params.id)){
            //if the follower already exists, remove it
            const idx = (commentObj => commentObj.req.params.id === req.params.id)
            foundBlog.comments.splice(idx, 1);
            await foundBlog.save();
            res.redirect("back");
        } else {
            req.flash("error", "Cannot find the comment in database");
            res.redirect("back");
        }
    })

})


module.exports = router;