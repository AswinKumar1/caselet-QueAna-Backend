// backend/models/User.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: String,
  full_name: String,
  password: String,
  admin: {
    type: Boolean,
    default: false,  // Fixed typo: "defaut" -> "default"
  },
  email: {
    type: String,
    required: false,
  },
  currentPracticeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'scheduledExam', 
    default: null 
  },
  domain_tag: {
    type: String,
    enum: ['umbc', 'other', 'admin'],  // Add 'admin' as option
    default: 'other'
  },
});

const User = mongoose.model("users", userSchema);
module.exports = User;
