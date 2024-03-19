import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Jwt from "jsonwebtoken";

// middlewares jayre lakho tyare (( next )) ave j
//  req.cookies? male chhe kem ke apde app.js ma middleware set karyu chhe ===> app.use(cookieParser()); // secure user na browser ma cookie nu CRUD perform karva

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    //1.2.
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }
    //3.
    const decodedToken = Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); // je model file ma token ne incode karyu tu te aya decode karyu

    // incode kartivakhte
    /* {
        _id: this._id,
        email: this.email,
        userName: this.userName,
        fullName: this.fullName,
      } 
      aa vastu hati tema 
      to decode kari ne te vastu no access karyo aya 
     1. aa badhu karva mate pela ape je cookie ma token set karyu tu tyathi lavya
     2. te cookies mathi token kadhyu
     3. token kadhi ne decode karyu 
     4. temathi niche _id na refrence lay ne user find karyo
  
  
     aa badhu khali te janva ke kayo user logout thai chhe te mate 
      */

    //4.
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }
    req.user = user; // req ma navo object {} add karyo user name tema upar thi je user na data avya te set karavya
    next();
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "invelid access Token from middleware"
    );
  }
});
