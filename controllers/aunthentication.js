// backend/controllers/authentication.js
var express = require("express");
const User = require("./../models/User");
var router = express.Router();
const ErrorResponse = require("../utils/ErrorResponse");
const jwt = require("jsonwebtoken");

// 0 - Require bcrypt
const bcrypt = require("bcrypt");
// 1 - Specify how many salt rounds
const saltRounds = 10;

// List of admin/research analyst emails
const ADMIN_EMAILS = [
  "maryam@umbc.edu",
  "demo123@gmail.com",
  // Add other research analyst emails
];

// Helper function to determine organization tag based on username
exports.determineOrganizationTag = (username, isAdmin = false) => {
  if (!username) return "other";
  
  const usernameLower = username.toLowerCase();
  
  // Check if this is an admin/research analyst
  if (isAdmin || ADMIN_EMAILS.includes(usernameLower)) {
    return "admin";
  }
  
  // UMBC users
  if (usernameLower.endsWith("@umbc.edu")) {
    return "umbc";
  }
  
  // Everyone else (UCF and others)
  return "other";
};

// POST '/auth/signup'
exports.signUpController = (req, res, next) => {
  console.log("Req body backend:", req.body);
  const { username, password, full_name, practiceId } = req.body;

  console.log("The current Practice Id derived from body in backend signup controller, ", practiceId);

  if (username == undefined) {
    return res.status(200).json({ success: false });
  }

  if (username === "" || password === "" || full_name == "") {
    return res.status(401).json({
      success: false,
      errorMessage: "Username and password not found!",
    });
  }

  User.findOne({ username })
    .then((user) => {
      if (user) {
        res.status(401).json({
          successMessage: false,
          errorMessage: "Username already exists.",
        });
        return;
      }

      console.log("Hashing password...");
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(password, salt);

      // Check if this user should be an admin
      const isAdmin = ADMIN_EMAILS.includes(username.toLowerCase());
      
      // Determine domain tag
      const domain_tag = exports.determineOrganizationTag(username, isAdmin);

      const userObj = {
        username,
        password: hashedPassword,
        full_name,
        currentPracticeId: practiceId || null,
        domain_tag: domain_tag,
        admin: isAdmin,  // Set admin flag
      };

      console.log("Object being passed to User.create:", userObj);

      User.create(userObj)
        .then((newUserObj) => {
          let jwtSecretKey = process.env.SESSION_SECRET;
          let data = {
            user_id: newUserObj._id,
            email: newUserObj.username,
            full_name: newUserObj.full_name,
            username: newUserObj.username,
            domain_tag: newUserObj.domain_tag,
            admin: newUserObj.admin,
            date: new Date(),
          };

          const token = jwt.sign(data, jwtSecretKey);
          res.json({ success: true, token: token });
        })
        .catch((err) => {
          console.log(err);
          res.json({
            successMessage: false,
            errorMessage: err,
          });
        });
    })
    .catch((err) => console.log(err));
};

exports.updatePracticeId = async (req, res) => {
  const { userId, practiceId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, errorMessage: "User ID is required." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, errorMessage: "User not found." });
    }

    user.currentPracticeId = practiceId || null;
    await user.save();

    res.status(200).json({ success: true, message: "Practice ID updated successfully." });
  } catch (error) {
    console.error("Error updating practiceId:", error);
    res.status(500).json({ success: false, errorMessage: "Internal server error." });
  }
};

exports.getUserInfo = async (req, res, next) => {
  const user = await User.find({ _id: req.query.user_id });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  return res.status(200).json({
    success: true,
    user: {
      id: user[0]._id,
      username: user[0].username,
      email: user[0].email,
      full_name: user[0].full_name,
      currentPracticeId: user[0].currentPracticeId,
      domain_tag: user[0].domain_tag,  // Include domain tag
      admin: user[0].admin,  // Include admin status
    }
  });
};

// POST 'auth/login'
exports.loginController = async (req, res, next) => {
  const { username, password: enteredPassword, practiceId } = req.body;

  if (username === "" || enteredPassword === "") {
    return res.status(401).json({
      success: false,
      errorMessage: "Username and password not found!",
    });
  }

  console.log("username", username);
  const user_list = await User.find({ username: username });

  if (user_list.length == 0) {
    return res.status(401).json({
      success: false,
      errorMessage: "Username and password combination invalid!",
    });
  }

  let userData = user_list[0];
  const hashedPasswordFromDB = userData.password;

  const passwordCorrect = bcrypt.compareSync(
    enteredPassword,
    hashedPasswordFromDB
  );

  if (passwordCorrect) {
    console.log("Saving practiceId to the user:", practiceId);
    userData.currentPracticeId = practiceId;
    await userData.save();

    let jwtSecretKey = process.env.SESSION_SECRET;
    let data = {
      user_id: userData._id,
      email: userData.username,
      full_name: userData.full_name,
      username: userData.username,
      currentPracticeId: userData.currentPracticeId,
      domain_tag: userData.domain_tag,
      admin: userData.admin,
      date: new Date(),
    };

    const token = jwt.sign(data, jwtSecretKey);

    return res.json({ 
      success: true, 
      token: token, 
      username: data.username, 
      full_name: data.full_name, 
      user_id: data.user_id, 
      currentPracticeId: data.currentPracticeId,
      domain_tag: data.domain_tag,
      admin: data.admin,
    });
  } else {
    return res.status(401).json({
      success: false,
      errorMessage: "Username and password does not match!",
    });
  }
};

// POST 'auth/reset-password'
exports.resetPasswordController = async (req, res, next) => {
  const { identifier, new_password } = req.body;

  if (!identifier || !new_password) {
    return res.status(400).json({ success: false, message: 'Email/Username and new password are required.' });
  }

  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password successfully reset.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error, please try again later.' });
  }
};

exports.getPracticeIdController = async (req, res, next) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required to fetch practice ID.",
    });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      currentPracticeId: user.currentPracticeId || null,
    });
  } catch (error) {
    console.error("Error fetching practice ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch practice ID. Please try again later.",
    });
  }
};

// Check if user is logged in
exports.protected = (req, res, next) => {
  if (req.session.currentUser) {
    next();
  } else {
    res.render("login", {
      errorMessage: "Login required. Please login",
      successMessage: false,
    });
  }
};
