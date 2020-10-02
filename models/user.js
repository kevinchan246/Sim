const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new mongoose.Schema({
    displayName: {type: String, unique:true, required: true},
    username: {type: String, unique: true },
    password: String,
    email: {type: String, unique: true },
    emailVerified: {type: Boolean, default: false},
    verifyToken: {type: String, default:null},
    verifyTokenExpires: {type: Date},
    aboutMe: {type: String, default: "You haven't share anything about youself yet"},
    profileImg: {type: String, default: ""},
    profileImgId: {type: String, default: ""},
    createdAt: { type: Date, default: Date.now },
    provider: {type: String, default: 'email'},
    providerId: {type: String, default: null},
    resetPasswordToken: {type: String},
    resetPasswordExpires: {type: Date},
    jobTitle: {type: String, default: ""},
    followers: [{
        followerId : {
            type: mongoose.Schema.Types.ObjectId,
        },
        displayName: String,
        profileImg: String
    }],
    followings: [{
        followedId : {
            type: mongoose.Schema.Types.ObjectId,
        },
        displayName: String,
        profileImg: String
    }],
    savedBlogs : [{
        blogId : {
            type : mongoose.Schema.Types.ObjectId,
        },
        title : String,
        coverImg : String,
        author: {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            profileImg: String,
            displayName: String,
        },
        date: Date,
        slug : String
    }]

})

UserSchema.plugin(passportLocalMongoose, { errorMessages : {
    UserExistsError : "A user with the given email is already registered."
}});




module.exports = mongoose.model("User", UserSchema);