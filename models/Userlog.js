// models/Userlog.js

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userLogSchema = new Schema(
  {
    exam_id: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    question_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Question',
      default: null,      
      required: false     
    },
    question_no: {
      type: Number,
      default: null,
    },
    page: {
      type: String,
    },
    user_id: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "Search",
        "Button Clicked",
        "Click",
        "Submit",
        "Start",
        "Stop",
        "Login",
        "Pre-Reflection",
        "Post-Reflection",
        "Answer Post-Reflection Prompt",
        "Post-Reflection-Per-Question",
        "Confidence",
        "Answer Option",
        "Comment",
        "Answered confidence question",
        "Answered Question",
        "Navigating from",
        "Navigated to",
        "Answer Reflection Prompt",
        "Logout",
        "Final Score",
        "Retake test",
        "Question Score",                                       
        "SearchTextEntered",                              
        "SearchButtonPressed",
      ],
    },
    action: {
      type: String,
    },
    field_name: { 
      type: String,
      default: null,
    },
    field_value: { 
      type: String,
      maxlength: 2000,
      default: null,
    },
    answer_id: {
      type: mongoose.Types.ObjectId,
      ref: 'Answer',
      default: null,
    },

    // Original client/server timestamp (kept for backward compatibility)
    timestamp: {
      type: Date,
    },

    // New field: precise UTC time captured by backend
    eventTimeUtc: {
      type: Date,
      default: () => new Date(), // always UTC by JS Date spec
    },

    // New field: relative time in seconds from exam start
    // (computed in controller before saving)
    relativeTimeSec: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Optional: index for fast time-based queries
userLogSchema.index({ eventTimeUtc: 1 });

const UserlogModel = mongoose.model("user_log", userLogSchema);
module.exports = UserlogModel;
