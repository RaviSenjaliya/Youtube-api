import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import Jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generetAccessToken();
    const refreshToken = user.generetRefreshToken();
    //refresh token ne database ma save karava mate jethi user pase thi varam var pass no puchhvo pade

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went Wrong while generating token");
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  const { userName, fullName, password, email } = req.body;
  //1.data existe
  // console.log(email);

  //2.validation
  if (
    [userName, fullName, password, email].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All field are requird");
  }

  //3.user existed
  const existeduser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existeduser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  //4.chek image or coverImg
  const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file path is requird");
  }

  //5. avatar and coverimg upload in to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is requird");
  }

  //6. data base ma badhu add karavo
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  //8.7. user create thayo ke nay check karo and pass and refresh token remove karo
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  //9. return karavo response ne
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
  //1. user data from database
  const { email, userName, password } = req.body;
  //2. username and email login
  if (!(userName || email)) {
    throw new ApiError(400, "username or email is required");
  }
  //3. user exist or note
  const user = await User.findOne({ $or: [{ email }, { userName }] });
  if (!user) {
    throw new ApiError(404, "User dose not exist");
  }
  //4.pass check je model ma  isPasswordCorrect() method banavi teni pase thi
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invelid User Credentials");
  }
  //5 token upar sapret
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  //6.send cookies ==> token

  const loggedInUser = await User.findById(user._id).select(
    "-refreshToken -password"
  );
  const options = {
    // server mathi j change thai browser mathi na thai shake seen kari shake
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options) // key , value , option
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

export const logoutUser = asyncHandler(async (req, res) => {
  //problem ==> apde user pase thi kay pan form bharavi to as req ma data malishake ena upar thi id malishake pan logout m ato kay form bharavanu nathi etale id pan malvani nathi te mate badhu mathakut kari ke chhe kayo user em tena mate middleware banavyu
  //apde middlewarma user name set karyo object jema id set kari ti to bus te aya req.user._id thi get kari lidhu ne refreshtoken ne undefind karinakhyu
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    // server mathi j change thai browser mathi na thai shake seen kari shake
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  // 1. cookie mathi token lidhu
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized Request");
  }
  //2.decode karyu jethi temathi Id mali shake ke kaya user ne mare session vadharvano chhe te mate
  //apde jyare refreshToken ne incode karyu tu tyare khali _id no j use karyo to etale aya decode karya pachhi apne id mali jase
  //id na base upar thi user fined karshu >> khali id shodhva mate apde decode karyo
  try {
    const decodedToken = Jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    //3. _id upar thi user gotyo
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invelid refresh Token");
    }
    //match na kare je decode karyo te and model ma refreshtoken chhe te to nichenu
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used");
    }
    // 4. token pachhu genrate karavyu uapr thi
    const { accessToken, newrefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    const options = {
      // server mathi j change thai browser mathi na thai shake seen kari shake
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newrefreshToken },
          "Access token Refeshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invelid refresh token");
  }
});

export const changeCurrentpassword = asyncHandler(async (req, res) => {
  //pass change karva mate user ni id to joye ne te id finde karva apde je auth middleware ma user set karyo to temathi id lay lidhi
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword); // check karyu ke je user avyo teno pass sacho chhe ke nay to pass update karva devi ne

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invelid old password");
  }
  //if all ok then user.pass ma new pass ne update karavi dyo
  user.password = newPassword;
  await user.save({ validateBeforeSave: false }); //update kari ne database ma save to karavu pade ne

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Change successfully"));
});

export const getCurrentuser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetch successfully "));
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!(fullName || email)) {
    throw new ApiError(400, "All fields are requird");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,

    {
      $set: {
        fullName, // fullName:fullName banne baju same hoy etale 1 lakho to pan chale
        email,
      },
    },
    { new: true }
  ).select("-password ");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

export const updateUserAvatar = asyncHandler(async (req, res) => {
  // user je file upload kare te avatarLocalPath ma save thai
  //te path ne uploadOnCloudinary(avatarLocalPath) upload karvano
  //temathi url genrate thai te url MDB ma set karavi URL not all object

  const oldavatar = await User.findById(req.user?._id).exec();
  if (!oldavatar) {
    throw new ApiError(400, "oldavatar File is missing");
  }

  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File is missing");
  }
  await deleteOnCloudinary(oldavatar.avatar);
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password ");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

export const updateUserCoverImage = asyncHandler(async (req, res) => {
  const oldcoverImage = await User.findById(req.user?._id).exec();
  if (!oldcoverImage) {
    throw new ApiError(400, "oldcoverImage File is missing");
  }

  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage File is missing");
  }
  await deleteOnCloudinary(oldcoverImage.coverImage);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on coverImage");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password ");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

export const getUserChannelProfile = asyncHandler(async (req, res) => {
  //url mathi male ke kayo user chhe em etale req.params lidhu
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "userName is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        userName: username?.toLowerCase(),
      },
    },
    {
      //mane kon kon subscribe kare chhe te

      $lookup: {
        from: "subscriptions", // database ma badhi fiel lowercase and pachhal 's' lagi jase
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        // me kone kone subscribe karya te
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        //aditional field add kare
        subscribersCounts: {
          //aditional field add kare

          $cond: {
            if: { $isArray: "$subscribers" },
            then: { $size: "$subscribers" },
            else: 0, // or any default value you prefer
          },
        },
        channelssubscribedToCount: {
          $cond: {
            if: { $isArray: "$subscribedTo" },
            then: { $size: "$subscribedTo" },
            else: 0, // or any default value you prefer
          },
        },
        issubscribed: {
          $cond: {
            // user chhe teni profile ma subscribe nu button show karavu ke nay em
            // jo te is sathe match karto hoy to te subscribe chhe apdi chanel ma to tene na batavo em
            if: { $in: [req.user?._id, "$subscribers._id"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        userName: 1,
        subscribersCounts: 1,
        channelssubscribedToCount: 1,
        issubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(400, "channel dose not exists");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "UserChennal Fetched successfully"));
});

export const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id), // in agrigation diract id identify na karishake mongoos etale tena formate ma lakhvu pade
      },
    },
    {
      $lookup: {
        from: "videos", // small and s lagavu
        localField: "watchHistory",
        foreignField: "_id",
        as: "WatchHistory",
        pipeline: [
          {
            $lookup: {
              // video no owner pan 1 user j hase ne to bus te janva tenu name , username, and avatar 3 j vastu batase
              from: "users", // small and s lagavu
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            // upar je owner name ni bane te [] foramate ma ave to bus frontend vala ne tarat malijay data te mate $addFields ma thodu first upar je chhe te j api do em kidhu
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].WatchHistory,
        "WatchHistory Fetched successfully"
      )
    );
});
