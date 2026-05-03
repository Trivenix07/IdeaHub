if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app =express();
app.set("view engine", "ejs");
const path = require("path");
app.set("views",path.join(__dirname, "/views"));
const methodOverride = require("method-override");
const bcrypt = require("bcrypt");
const userModel = require('./models/user');
const postModel = require('./models/post');
const Notification = require("./models/Notification");
const cookieParser = require('cookie-parser');
const jwt = require("jsonwebtoken");
app.use(methodOverride("_method"));
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`app is listening at port ${port}`);
});
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Atlas Connected "))
.catch(err => console.log(err));






// PROFILE GET 
app.get("/profile", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({email: req.user.email}).populate("posts");

 let notifications = await Notification.find({
  receiver: req.user.userid,
  status: "pending"              
})
.sort({ createdAt: -1 })         
.populate("sender")
.populate("post");
  res.render("profile", { user, notifications });
});
// like get 
app.get("/like/:id", isLoggedIn, async (req, res) => {
    try {
        let post = await postModel.findOne({ _id: req.params.id });
        
        // Same logic: toggle like
        let index = post.likes.indexOf(req.user.userid);
        if (index === -1) {
            post.likes.push(req.user.userid);
        } else {
            post.likes.splice(index, 1);
        }

        await post.save();

        // Ye line browser ko bolti hai ki purana data mat dikhao
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        
        // Redirect back to exactly where the user came from
        res.redirect(req.get('referer') || '/'); 
        
    } catch (err) {
        console.log(err);
        res.redirect("/");
    }
});



// edit get
app.get("/edit/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  res.render("edit.ejs",{post});
  
});
//update route 
app.post("/update/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate(
        { _id: req.params.id },
        { content: req.body.content }
    );

    res.redirect("/profile");
});
// DELETE ROUTE
app.get("/delete/:id", isLoggedIn, async (req, res) => {
    // 1. Post ko delete karo
    let deletedPost = await postModel.findOneAndDelete({ _id: req.params.id });

    // 2. User ke posts array se bhi usse nikal do (Optional but good practice)
    let user = await userModel.findOne({ email: req.user.email });
    user.posts.splice(user.posts.indexOf(req.params.id), 1);
    await user.save();

    // 3. Wapas profile pe bhej do
    res.redirect("/profile");
});
// post request for post route 
app.post("/post", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({email: req.user.email});
  let {content} = req.body;

  let post = await postModel.create({
    user: user._id,
    content
  });

  user.posts.push(post._id);
  await user.save();
   res.redirect("/profile");
});
// new main home page.
// Landing Page Route
app.get("/", async (req, res) => {
    let posts = await postModel.find().populate("user");

    let loggedInUser = null;
    let notifications = [];

    if (req.cookies.token) {
        try {
            loggedInUser = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

            
            notifications = await Notification.find({
                sender: loggedInUser.userid
            });

        } catch(err) {
            loggedInUser = null;
        }
    }

    res.render("index", { posts, loggedInUser, notifications });
});

// register page get
app.get("/register",(req,res)=>{
    res.render("register.ejs");
})
// post request on register

app.post('/register', async (req, res) => {
    let { email, password, username, name, age } = req.body;

    let user = await userModel.findOne({ email });
    if (user) return res.status(400).send("User already registered");

    bcrypt.genSalt(10, (err, salt) => {
        if (err) return res.send("Error generating salt");

        bcrypt.hash(password, salt, async (err, hash) => {
            if (err) return res.send("Error hashing password");

            // ✅ overwrite user with newly created user
            user = await userModel.create({
                username,
                email,
                age,
                name,
                password: hash
            });

            // ✅ now user is valid
            let token = jwt.sign(
                { email: email, userid: user._id },
              process.env.JWT_SECRET
            );

            res.cookie("token", token);
            res.redirect("/profile");
        });
    });
});

app.get('/login', (req, res) => {
    res.render("login.ejs");
});
// post request on login
app.post('/login', async (req, res) => {
    let { email, password  } = req.body;

    let user = await userModel.findOne({ email });
    if (!user) return res.status(500).redirect("/login");

    bcrypt.compare(password, user.password , (err,result)=>{
        if(result) {
            
              let token = jwt.sign(
                { email: email, userid: user._id },
               process.env.JWT_SECRET
            );

            res.cookie("token", token);
            res.status(200).redirect("/profile");
        }else res.redirect("/login");
    })
});
// logout route 
app.get("/logout",(req,res)=>{
    res.cookie("token", "");
    res.redirect("/login");
})


// islogged in middleware
function isLoggedIn(req, res, next){
    if(!req.cookies.token) return res.render("login.ejs");
    
    try {
        let data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        req.user = data;
    } catch (err) {
        return res.send("Invalid token");
    }

    next();
}

//collab 
app.get("/collab/:postId", isLoggedIn, async (req, res) => {
    const post = await postModel.findById(req.params.postId).populate("user");

    // check if already requested
    const existing = await Notification.findOne({
        sender: req.user.userid,
        receiver: post.user._id,
        post: post._id
    });

    if (!existing) {
        await Notification.create({
            sender: req.user.userid,
            receiver: post.user._id,
            post: post._id,
            status: "pending"
        });
    }

    
    res.redirect(req.get("referer") || "/");
});
//  to view collab request.
// to view collab request.
app.get("/requests", isLoggedIn, async (req, res) => {

    const notifications = await Notification.find({
        receiver: req.user.userid
    })
    .sort({ createdAt: -1 })   
    .populate("sender")        
    .populate("post");

    res.render("requests", { notifications });

});



// accept collab request route 
app.get("/accept/:id", isLoggedIn, async (req, res) => {
    await Notification.findByIdAndUpdate(req.params.id, {
        status: "accepted"
    });

    res.redirect("/profile");
});

// reject collab request route  
app.get("/reject/:id", isLoggedIn, async (req, res) => {
    await Notification.findByIdAndDelete(req.params.id);

    res.redirect("/profile");  
});
