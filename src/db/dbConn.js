import mongoose from "mongoose";
import { DB_NAME } from "../constants";

const connectDB = async () => {
  try {
    const { connection } = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    console.log("db successfully connected, host : ", connection.host);
  } catch (error) {
    console.log("Mongodb connection failed", error);
    process.exit(1);
  }
};

export default connectDB;
