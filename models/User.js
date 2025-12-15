const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: String,
  full_name: String,
  password: String,
  admin: {
    type: Boolean,
    defaut: false,
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
  domain_tag: {  // Add domain tag
    type: String,
    enum: ['umbc', 'other'],
    default: 'other'
  },
});

const User = mongoose.model("users", userSchema);

module.exports = User;