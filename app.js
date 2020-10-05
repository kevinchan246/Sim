const express   = require("express");
const app       = express();
const mongoose  = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const methodOverride = require("method-override");
const flash = require("connect-flash-plus");
const favicon = require("serve-favicon");

//authentication imports
const passport = require("passport");
const session = require("express-session");
require("./config/passport")(passport);
const User = require("./models/user");

/*use mongoose to connect to the mongoDB*/
mongoose.connect('mongodb://localhost:27017/sim_blog', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
})
.then(() => console.log('Connected to DB!'))
.catch(error => console.log(error.message));
/*************************************************/


app.use('/public', express.static(path.join(__dirname, '/public')));
app.use(favicon(__dirname + "/public/images/Sim_Blog_Logo.png"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended : false}));
app.use(methodOverride("_method"));
app.use(flash());

//PASSPORT CONFIG
app.use(session({
    secret: "This is awsome",
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());


//flash messages configs
app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

//passport-google-oauth config


/* import routes */
const indexRoutes = require("./routes/index");
const blogRoutes = require("./routes/blogs");
const userRoutes = require("./routes/users");
const thirdPartyAuth = require("./routes/thirdPartyAuth");

app.use(indexRoutes);
app.use(blogRoutes);
app.use(userRoutes);
app.use(thirdPartyAuth);
/***********************/



const port = process.env.port || 8000;
app.listen(port, function(){
    console.log("Server Started at portal " + port + "...");
})