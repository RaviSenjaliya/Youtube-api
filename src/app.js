import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
//CORE and cookieparser app banya pachhi configer thai

const app = express();

app.use(
  cors({
    // cros origin mathi app ne alow karvamate
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" })); // json data ni limit set kari ke server ma atlo json no data avse
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // url through data limit and extend thi nested hoy to tene alow karva
app.use(express.static("public")); // image favicon and email image badhu hu public folder ma rakhva mate
app.use(cookieParser()); // secure user na browser ma cookie nu CRUD perform karva

// ----------------------------------------------------

//routes import
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import commentRouter from "./routes/comment.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import likeRouter from "./routes/like.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/dashboard", dashboardRouter);

export { app };
