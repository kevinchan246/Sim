const express = require("express");
const router = express.Router({mergeParams:true});
const Blog = require("../models/blog");
const User = require("../models/user");
const middleware = require("../middleware/middleware.js");

//CREATE - add new campground to DB
//this route will create the new campgound

//NEW -  show form for creating new blog
//this route should show the form that will send the data to the post route
router.get("/home/new", middleware.isLoggedIn, async(req, res) => {

    res.render("blogs/new", { blog : new Blog() });
})

router.get("/home/edit/:id", async(req, res) => {
    const blog = await Blog.findById(req.params.id);
    res.render("blogs/edit", { blog : blog });
})

router.get("/home/:slug", async(req, res) => {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (blog == null) {
        req.flash("error", "Cannot find the blog");
        res.redirect("/home");
    }
  
        //if user is not logged in
        res.render("blogs/show", {blog: blog});
   
})

router.post("/home", async(req, res, next) => {
    req.blog = new Blog();
    next()
}, saveBlogAndRedirect('new'))

router.put("/home/:id", async(req, res, next) => {
    req.blog = await Blog.findById(req.params.id);
    next()
}, saveBlogAndRedirect('edit'))

router.delete("/home/:id", async(req, res) => {
    await Blog.findByIdAndDelete(req.params.id)
    req.flash("error", "The blog has been deleted")
    res.redirect("/home");
})

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



//result for searching blog
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



module.exports = router;