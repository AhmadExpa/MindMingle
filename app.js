const path = require("path"); // Import the path module for handling file paths
const express = require("express"); // Import the Express.js framework
const upload = require("./config/multerConfig"); // require to use multer default
const bcrypt = require("bcrypt"); // Import bcrypt for password hashing
const app = express(); // Create an Express application
const port = 3000; // Define the port number for the server
const usermodel = require("./models/user"); // Import the user model
const postmodel = require("./models/post"); // Import the post model
const cookieParser = require("cookie-parser"); // Import cookie-parser for parsing cookies
const jwt = require("jsonwebtoken"); // Import JSON Web Token for token generation and verification
const { title } = require("process");
const secret = "$$$"; // Define a secret key for JWT

// Set the view engine to EJS for rendering templates
app.set("view engine", "ejs");

// Serve static files from the "src" directory
// app.use(express.static(path.join(__dirname, "src")));
app.use("/src", express.static(path.join(__dirname, "src")));

// Parse URL-encoded bodies and JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Use cookie-parser middleware
app.use(cookieParser());

// Render the home page
app.get("/", function (req, res) {
  res.render("index", { message: "" });
});

// Render the signup page
app.get("/signup", function (req, res) {
  res.render("signup", { error: "" });
});

// Handle user signup
app.post("/signup", async function (req, res) {
  const { name, username, email, password, dob } = req.body;
  // Check if the username or email already exists in the database
  const usernameInvalid = await usermodel.findOne({ username: username });
  const emailInvalid = await usermodel.findOne({ email: email });
  const age = ageCalculate(dob);
  // Check if age is less than 10 or if username/email is invalid
  if (age < 10 || usernameInvalid || emailInvalid) {
    res.render("signup", { error: "Something went wrong" });
  } else {
    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    // Create a new user in the database
    const user = await usermodel.create({
      name,
      username,
      email,
      password: hashPassword,
      age: age,
    });
    // setting up the cookie
    setAuthCookie(res, user);
    console.log(user._id);
    // render upload profile page
    res.render("profile", {
      message: "Account has been created. Please Login !",
    });
  }
});

// Handle user login
app.post("/login", async function (req, res) {
  const email = req.body.email;
  const password = req.body.password;

  // Find the user by email
  const user = await usermodel.findOne({ email: email });
  if (!user) {
    res.render("404");
  } else {
    // Compare the provided password with the hashed password in the database
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      // Generate a JWT and set it as a cookie
      setAuthCookie(res, user);
      res.redirect("/home");
    } else {
      res.render("404");
    }
  }
});

// Render the home page if the user is logged in
app.get("/home", isLoggedIn, async function (req, res) {
  const user = await usermodel.findOne({ _id: req.user._id }).populate("posts");
  res.render("home", { user: user });
});

// Handle user logout
app.get("/logout", function (req, res) {
  res.cookie("uid", "", { maxAge: 0 }); // Clear the "uid" cookie
  res.redirect("/");
});
// Handle posting messages
app.post("/post", isLoggedIn, async function (req, res) {
  const user = await usermodel.findOne({ _id: req.user._id });
  console.log(req.body);
  const title = req.body.title;
  const content = req.body.message;
  const post = await postmodel.create({
    title: title,
    content: content,
    user: user._id,
  });
  user.posts.push(post._id);
  await user.save();
  res.redirect("/home");
});
// handle like button
app.get("/like/:postID/:page", isLoggedIn, async function (req, res) {
  const post = await postmodel
    .findOne({ _id: req.params.postID })
    .populate("user");
  if (post.likes.indexOf(req.user._id) === -1) {
    post.likes.push(req.user._id);
  } else {
    post.likes.splice(post.likes.indexOf(req.user._id), 1);
  }
  const page = req.params.page;
  await post.save();
  res.redirect(`/${page}`);
});
// handle edit button
app.get("/edit/:postID", isLoggedIn, async function (req, res) {
  const post = await postmodel.findOne({ _id: req.params.postID });
  res.render("edit", { post: post });
});
// handle update post
app.post("/updatepost/:postID", isLoggedIn, async function (req, res) {
  const post = await postmodel.findOneAndUpdate(
    { _id: req.params.postID },
    { title: req.body.title, content: req.body.message },
    { new: true } // Return the updated document
  );
  res.redirect("/home");
});
// handle profile image
app.post(
  "/upload",
  isLoggedIn,
  upload.single("avatar"),
  async function (req, res) {
    const user = await usermodel.findOne({ _id: req.user._id });
    if (req.file && user) {
      user.profile = req.file.filename;
      await user.save();
      console.log("Profile updated:", user.profile); // Debug log for saved profile
      res.redirect("/home");
    } else {
      res.status(404).render("404");
    }
  }
);
// handle news feed
app.get("/newsfeed", isLoggedIn, async (req, res) => {
  const posts = await postmodel.find().populate("user");
  const user = await usermodel.findOne({ _id: req.user._id });
  // res.send(posts);
  res.render("newsfeed", { user: user, posts });
});

// FUNCTIONS -------------
// age validation function
function ageCalculate(dob) {
  dobDate = new Date(dob);
  const today = new Date();
  // Calculate the user's age
  let age = today.getFullYear() - dobDate.getFullYear();
  const monthDiff = today.getMonth() - dobDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dobDate.getDate())
  ) {
    age--;
  }
  return age;
}
// Middleware to check if the user is logged in
function isLoggedIn(req, res, next) {
  const token = req.cookies.uid; // Corrected from req.cookie to req.cookies
  if (!token) {
    return res.status(404).render("404");
  }
  // Verify the JWT
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.log("Authentication Error UID");
      return res.status(404).render("404");
    }
    req.user = decoded; // Attach the decoded user information to the request object
    next(); // Proceed to the next middleware or route handler
  });
}
// Function to set the authentication cookie
function setAuthCookie(res, user) {
  const token = jwt.sign(
    {
      email: user.email,
      _id: user._id,
      username: user.username,
      name: user.name,
    },
    secret
  );

  res.cookie("uid", token);
}
// Start the server
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
