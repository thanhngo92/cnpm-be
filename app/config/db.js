import mongoose from "mongoose";

const connectDB = async (uri) => {
  try {
    if (!uri) {
      throw new Error("MONGODB_URI is missing");
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
