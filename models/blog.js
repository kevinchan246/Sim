const mongoose = require("mongoose");
const slugify = require("slugify");
const createDomPurity = require("dompurify");
const { JSDOM } = require("jsdom");
const dompurify = createDomPurity(new JSDOM().window);

const blogSchema = new mongoose.Schema({
    title: String,
    coverImg: String,
    contents: String,
    
    date: {
        type: Date,
        default: Date.now
    },

    slug: {
        type: String,
        required: true,
        unique: true
    },

    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        profileImg: String,
        username: String,
        displayName: String,
    },

    sanitizedHtml: {
        type: String,
        required: true
    }

})

//run before every operation like save, create, update, etc
blogSchema.pre('validate', function(next) {
    if (this.title) {
        this.slug = slugify(this.title, {
            lower : true,
            strict: true
        })
    }

    if(this.contents){
        this.sanitizedHtml = dompurify.sanitize(this.contents, { ADD_TAGS: ["iframe"], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] });
    }

    next()
})

module.exports = mongoose.model("blog", blogSchema);