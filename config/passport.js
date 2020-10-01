const passport = require('passport');
const LocalStrategy = require("passport-local");
require('dotenv').config();

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const User = require('../models/user');



module.exports = (passport) => {

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });
    
    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            done(err, user);
        });
    });
    
    passport.use(new LocalStrategy(User.authenticate(), 
    ));
    
    //google auth configs
    passport.use(new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback"
        },
        async (accessToken, refreshToken, profile, done) => {

            const newUser = await new User({
                username: profile.emails[0].value,
                provider: "Google",
                providerId: profile.id,
                displayName: profile.displayName,
                profileImg: profile.photos[0].value,
                email: profile.emails[0].value,
                emailVerified: true,
            })

            try {
                //try to find if the google user exists
                let user = await User.findOne({providerId : profile.id});

                if (user){
                    done(null, user);
                }else{
                    user = await User.create(newUser);
                    done(null, user);
                }
            } catch (error) {
                console.log(error);
                return done(null, false, { message: error});
            }




        }
    ))

}