const { Types } = require("mongoose");
const { fetchUserIdFromToken } = require("../middleware/auth_validate");
const BehaviourModel = require("../models/Behaviour");
const BEHAVIOUR_FIELDS = ["exam_id", 
  "pre_reflection.familiarity",
  "pre_reflection.frequency",
  "pre_reflection.competence",
  "pre_reflection.skills",
  // "pre_reflection.mobilization",
  // "pre_reflection.isolation",
  "pre_reflection.relevance",
];

exports.getUserBehaviour = async (req, res, next) => {
  const userId = await fetchUserIdFromToken(
    req.headers.authorization.split(" ")[1]
  );

  console.log("----User ID Value -----", userId)
  console.log("----Exam ID Value -----", req.query.exam_id)
  let examID = req.query.exam_id;

  //CHECK IF BEHAVIOUR
  const behaviour = await BehaviourModel.find({
    exam_id: examID,
    user_id: userId,
  });

  console.log(examID, userId, "DS");
  // if (behaviour.length == 0) {
  //   return res.status(400).json({
  //     success: false,
  //     message: "Reflection Required",
  //   });
  // }
  return res.status(200).json({ success: true, behaviour });
};

exports.saveCommentsDataSummary = async (req, res) => {
  try {
    const userId = await fetchUserIdFromToken(
      req.headers.authorization.split(" ")[1]
    );

    const { exam_id, comments_data_summary } = req.body;

    // Validate required fields
    if (!exam_id || !comments_data_summary) {
      return res
        .status(400)
        .json({ success: false, message: "Exam ID and comments are required." });
    }

    // Update or create the behaviour document
    const updatedBehaviour = await BehaviourModel.findOneAndUpdate(
      { exam_id, user_id: userId },
      { $set: { comments_data_summary } },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Comments data summary updated successfully",
      behaviour: updatedBehaviour,
    });
  } catch (error) {
    console.error("Error saving comments data summary:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.saveCommentsProblemContext = async (req, res) => {
  try {
    const userId = await fetchUserIdFromToken(
      req.headers.authorization.split(" ")[1]
    );

    const { exam_id, comments_problem_context } = req.body;

    // Validate required fields
    if (!exam_id || !comments_problem_context) {
      return res
        .status(400)
        .json({ success: false, message: "Exam ID and problem context are required." });
    }

    // Update or create the behaviour document
    const updatedBehaviour = await BehaviourModel.findOneAndUpdate(
      { exam_id, user_id: userId },
      { $set: { comments_problem_context } },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Problem context updated successfully",
      behaviour: updatedBehaviour,
    });
  } catch (error) {
    console.error("Error saving problem context:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


exports.createBehaviour = async (req, res, next) => {
  let body = req.body;
  const userId = await fetchUserIdFromToken(
    req.headers.authorization.split(" ")[1]
  );
  body.user_id = userId;

  for (let index = 0; index < BEHAVIOUR_FIELDS.length; index++) {
    const key = BEHAVIOUR_FIELDS[index];
    const keyParts = key.split(".");
    let value = body;

    for (let part of keyParts) {
      value = value[part];
      if (value === undefined) break;
    }

    if (value === undefined || value === "") {
      console.log(key);
      return res
        .status(400)
        .json({ success: false, body: `${key} not found, please enter it ` });
    }
  }

  const behaviour = await BehaviourModel.findOneAndUpdate(
    { exam_id: body.exam_id, user_id: body.user_id },
    { $set: body },
    { upsert: true, new: true }
  );

  //const behavoir = await BehaviourModel.create(body);
  res.status(200).json({ sucess: true, behaviour });
};


exports.updateBehaviour = async (req, res, next) => {
  try {
    // Extract the behaviour_id from the request body
    const { behaviour_id } = req.body;

    console.log("Value of is_task_submitted: ", req.body.is_task_submitted )

    if (!behaviour_id) {
      return res.status(400).json({ success: false, message: "behaviour_id is required" });
    }

    // Prepare the fields to update from the request body
    const updateFields = {
      post_reflection_difficulty: req.body.post_reflection_difficulty,
      post_reflection_interest: req.body.post_reflection_interest,
      post_reflection_helpfulness: req.body.post_reflection_helpfulness,
      // post_reflection_mobilization: req.body.post_reflection_mobilization,
      // post_reflection_isolation:    req.body.post_reflection_isolation,
      post_reflection_relevance:    req.body.post_reflection_relevance,
      post_reflection_proximity:    req.body.post_reflection_proximity,
      is_task_submitted: req.body.is_task_submitted,
      is_post_reflection_submitted: req.body.is_post_reflection_submitted,  // New field for post-reflection submission

    
    };

    // Remove undefined fields (if any field is not provided in the body)
    Object.keys(updateFields).forEach((key) => {
      if (updateFields[key] === undefined) {
        delete updateFields[key];
      }
    });

    // Update behaviour document based on behaviour_id
    const updatedBehaviour = await BehaviourModel.updateOne(
      { _id: new Types.ObjectId(behaviour_id) },  // Match by behaviour_id
      { $set: updateFields }  // Set the fields that need updating
    );

    console.log("Update Fields: ", updateFields);  // Check if is_task_submitted is present here
    console.log("Updated Behaviour Result:", updatedBehaviour);


    // Check if any document was modified
    if (updatedBehaviour.modifiedCount > 0) {
      const updatedBehaviourData = await BehaviourModel.findById(behaviour_id);
      return res.status(200).json({
        success: true,
        message: "Behaviour updated successfully",
        updatedBehaviour: updatedBehaviourData
      });
    } else {
      return res.status(400).json({ success: false, message: "No behaviour found or updated" });
    }
  } catch (error) {
    console.error("Error updating behaviour: ", error);
    return res.status(500).json({ success: false, message: "Server error", error });
  }
};


// Delete all behaviour entries for a user based on exam_id and user_id
exports.deleteUserBehaviour = async (req, res, next) => {
  try {
    const userId = await fetchUserIdFromToken(req.headers.authorization.split(" ")[1]);
    const examId = req.body.exam_id;

    // Check if exam_id is provided
    if (!examId) {
      return res.status(400).json({
        success: false,
        message: "exam_id is required",
      });
    }

    // Delete Behaviour entries for the user and exam
    await BehaviourModel.deleteMany({
      exam_id: new Types.ObjectId(examId),
      user_id: new Types.ObjectId(userId),
    });

    return res.status(200).json({
      success: true,
      message: "User behaviour deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user behaviour:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error,
    });
  }
};


exports.saveRunningNotes = async (req, res) => {
  console.log("Save Notes called from backend");
  try {
    // 1️⃣ Get & verify the JWT => userId
    const token  = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Missing Authorization header" });
    }
    const userId = await fetchUserIdFromToken(token);

    console.log("User Id found: ", userId)

    // 2️⃣ Pull exam_id & running_notes from the body
    const { exam_id, running_notes } = req.body;
    if (!exam_id) {
      return res
        .status(400)
        .json({ success: false, message: "exam_id is required" });
    }

    // 3️⃣ Find this user’s behaviour doc
    const updatedBehaviour = await BehaviourModel.findOneAndUpdate( 
     {
        // match on both exam and user
        exam_id: new Types.ObjectId(exam_id),
        user_id: new Types.ObjectId(userId),
      },
      {
        $set: { running_notes },
      },
      {
        new: true,    // return the updated doc
        upsert: true, // create if not found
      }
    );
        
    console.log("Current value of running notes: ", updatedBehaviour.running_notes);

    // 4️⃣ Reply
    return res.json({
      success: true,
      running_notes: updatedBehaviour.running_notes,
    });

  } catch (err) {
    console.error("Error in saveRunningNotes:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};


