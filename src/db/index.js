import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"; // database nu name

//data base sathe connection karo etale async await no use karvo and try catch lagavo j
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI // DB ni URL je .env ma chhe te and / database nu name shu rakhvu chhe te
    );
    console.log(`😁 mongodb connected....`);
  } catch (error) {
    console.log("db connection Faild ==> ", error);
  }
};

export default connectDB;
