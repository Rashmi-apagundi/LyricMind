import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    console.error(`   ⚠️  Make sure your IP is whitelisted in MongoDB Atlas:`);
    console.error(`   ⚠️  https://cloud.mongodb.com → Network Access → Add IP Address`);
    // Do NOT exit — let the server stay running so other routes still work
  }
};

export default connectDB;
