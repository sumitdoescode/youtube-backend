import { connect } from "mongoose";

const MONGODB_URL = process.env.MONGODB_URI as string;
const DB_NAME = process.env.DB_NAME as string;

if (!MONGODB_URL) {
    throw new Error("Please provide MONGODB_URI in the environment variables");
}

if (!DB_NAME) {
    throw new Error("Please provide DB_NAME in the environment variables");
}

export async function connectDB() {
    try {
        const { connection } = await connect(MONGODB_URL, { dbName: DB_NAME });
        console.log("MongoDB connected", connection.host);
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}
