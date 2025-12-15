const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config(); // Load environment variables

// Helper function to determine domain tag
const determineOrganizationTag = (username) => {
  if (!username) return "other";
  
  const usernameLower = username.toLowerCase();
  if (usernameLower.endsWith("@umbc.edu")) {
    return "umbc";
  }
  return "other";
};

// Migration function
const migrateDomainTags = async () => {
  try {
    // Connect to MongoDB using the same connection string as your app
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);

    // Update each user
    let updatedCount = 0;
    for (const user of users) {
      const domain_tag = determineOrganizationTag(user.username);
      user.domain_tag = domain_tag;
      await user.save();
      updatedCount++;
      console.log(`Updated user: ${user.username} -> domain_tag: ${domain_tag}`);
    }

    console.log(`\nMigration complete! Updated ${updatedCount} users.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  }
};

// Run the migration
migrateDomainTags();