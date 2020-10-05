const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    author : {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        displayName: String,
        profileImg: String
    },
    content : {type: String},
    createdDate: { type: Date, default: Date.now },
})


module.exports = mongoose.model("Comment", commentSchema);