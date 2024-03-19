import dotenv from "dotenv";
dotenv.config({ path: "./env" }); // env file ma je hoy te app start thai te pela j populate thai jay etale app cresh na thai te mate
import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB() // db connection pachhi tene listen pan karavu pade and async hatu db so te then and catch pass kare j je handle karvana
  .then(() => {
    // app listen karvama error ave to handle karava mate
    app.on("error", (err) => {
      console.log("error :", err);
      throw err;
    });

    //   ------------------------------------------------

    app.listen(process.env.PORT || 8080, () => {
      console.log(`🟢 server is runing at port ${process.env.PORT}`);
    }); // listen thai etale serever sharu kevay
  })
  .catch((err) => console.log("🔴 mongodb connection faild....", err));
