import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
// adding middleares to our applications
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// importing routes
import healthcheckRouter from "./routes/healthcheck.routes";
import userRouter from "./routes/user.routes";
import tweetRouter from "./routes/tweet.routes";

// using routes
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/tweet", tweetRouter);

export default app;
