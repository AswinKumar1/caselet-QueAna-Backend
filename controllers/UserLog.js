const { fetchUserIdFromToken } = require("../middleware/auth_validate");
const UserlogModel = require("../models/Userlog");

const LOG_FIELD = ["exam_id", "type", "action", "page"];

exports.fetcLogsOfUser = async (req, res, next) => {
  try {
    const search = await UserlogModel.find();
    res.status(200).json({ success: true, search });
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ success: false, message: "Error fetching logs" });
  }
};

// Helper function to calculate relative time using user's first "Start" log
async function computeRelativeTime(exam_id, user_id, eventTimeUtc) {
  try {
    console.log("computeRelativeTime called with:");
    console.log("exam_id:", exam_id);
    console.log("user_id:", user_id);
    
    // Find the FIRST "Start" log for this user and exam
    const firstStartLog = await UserlogModel.findOne({
      exam_id: exam_id,
      user_id: user_id,
      type: "Start"
    })
    .sort({ eventTimeUtc: -1 })  // Earliest first
    .lean();
    
    console.log("Found Start log:", firstStartLog);
    
    if (!firstStartLog || !firstStartLog.eventTimeUtc) {
      console.log(`No "Start" log found for user ${user_id} and exam ${exam_id}`);
      return null;
    }
    
    const examStartTime = new Date(firstStartLog.eventTimeUtc);
    const diffMs = eventTimeUtc.getTime() - examStartTime.getTime();
    const relativeSec = diffMs / 1000;
    
    console.log(`Relative time calculated: ${relativeSec} seconds from exam start`);
    return relativeSec;
    
  } catch (err) {
    console.error("Error computing relative time:", err);
    return null;
  }
}

exports.createLog = async (req, res, next) => {
  try {
    console.log("LOG CREATE STARTED");
    
    const body = { ...req.body };
    
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Missing Authorization header" });
    }
    body.user_id = await fetchUserIdFromToken(token);
    
    const nowUtc = new Date();
    body.eventTimeUtc = nowUtc;
    body.timestamp = nowUtc;

    if (body.field_value !== null && body.field_value !== undefined) {
      if (typeof body.field_value === 'object') {
        // If it's an object, stringify it
        body.field_value = JSON.stringify(body.field_value);
      } else if (typeof body.field_value !== 'string') {
        // If it's a number or boolean, convert to string
        body.field_value = String(body.field_value);
      }
      
      // Truncate if too long (prevent DB errors)
      if (body.field_value.length > 1000) {
        console.log(`runcating field_value from ${body.field_value.length} to 1000 chars`);
        body.field_value = body.field_value.substring(0, 1000) + '...';
      }
    }
    
    // Compute relative time from exam start
    body.relativeTimeSec = await computeRelativeTime(
      body.exam_id, 
      body.user_id,
      nowUtc
    );
    
    // Special case: if this IS the "Start" log, relative time should be 0
    if (body.type === "Start") {
      body.relativeTimeSec = 0;
    }
    
    // Validate required fields
    for (const key of LOG_FIELD) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) {
        console.error(`Missing required field: ${key}`);
        return res.status(400).json({ success: false, message: `${key} is required` });
      }
    }

    if (!body.question_id) body.question_id = null;
    if (!body.question_no) body.question_no = null;
    if (!body.field_name) body.field_name = null;
    if (!body.field_value) body.field_value = null;
    if (!body.answer_id) body.answer_id = null;
    
    console.log("Creating log entry:", {
      type: body.type,
      action: body.action,
      field_name: body.field_name,
      field_value: body.field_value?.substring(0, 50) // Log first 50 chars only
    });

    const entry = await UserlogModel.create(body);
    console.log(`Log created successfully with ID: ${entry._id}`);
    return res.status(200).json({ success: true, entry });
    
  } catch (err) {
    console.error("Error in createLog:", err);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Stack:", err.stack);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.logRunningNotesEdit = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Missing Authorization token" });
    }
    
    const userId = await fetchUserIdFromToken(token);
    const {
      exam_id,
      question_id,
      question_no,
      notes,
      previousNotes,
      timestamp,
      page,
    } = req.body;
    
    if (!exam_id) {
      return res.status(400).json({ success: false, message: "exam_id is required" });
    }
    
    const nowUtc = new Date();
    
    const relativeTimeSec = await computeRelativeTime(
      exam_id, 
      userId,
      nowUtc
    );

    const fieldValueObj = { notes, previousNotes };
    const fieldValueStr = JSON.stringify(fieldValueObj);
    
    const logEntry = await UserlogModel.create({
      user_id: userId,
      exam_id: exam_id,
      question_id: question_id,
      question_no: question_no,
      type: "Notes Entered",
      action: "User typed comments in the Notes box",
      field_name: "notes",
      field_value: fieldValueStr,
      page: page || req.path,
      timestamp: timestamp ? new Date(timestamp) : nowUtc,
      eventTimeUtc: nowUtc,
      relativeTimeSec: relativeTimeSec,
    });
    
    return res.status(200).json({ success: true, logEntry });
    
  } catch (err) {
    console.error("Error in logRunningNotesEdit:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
