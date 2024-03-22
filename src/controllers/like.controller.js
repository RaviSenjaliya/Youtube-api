import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const filter = {
    //aa video upar aa bhai e like kari chhe jo to if ha to tene delete karo ne false batavo else create karo ne true batavo
    video: videoId,
    likedBy: req.user?._id,
  };

  const liked = await Like.findOne(filter);

  if (liked) {
    await Like.deleteOne(filter);
    res.json(new ApiResponse(200, { isLiked: false }));
  } else {
    await Like.create(filter);
    res.json(new ApiResponse(200, { isLiked: true }));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  const filter = {
    comment: commentId,
    likedBy: req.user?._id,
  };

  const liked = await Like.findOne(filter);

  if (liked) {
    await Like.deleteOne(filter);
    res.json(new ApiResponse(200, { isLiked: false }));
  } else {
    await Like.create(filter);
    res.json(new ApiResponse(200, { isLiked: true }));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweetId");
  }
  const filter = {
    tweet: tweetId,
    likedBy: req.user?._id,
  };

  const liked = await Like.findOne(filter);

  if (liked) {
    await Like.deleteOne(filter);
    res.json(new ApiResponse(200, { isLiked: false }));
  } else {
    await Like.create(filter);
    res.json(new ApiResponse(200, { isLiked: true }));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const videos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
        video: {
          $exists: true,
        },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $project: {
              title: 1,
              videoFile: 1,
              thumbnail: 1,
              Views: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        videos: {
          $first: "$videos",
        },
      },
    },
    {
      $project: {
        videos: 1,
        _id: 0,
      },
    },
    {
      $replaceRoot: { newRoot: "$videos" },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videos, videosCount: videos.length },
        "Get liked videos success"
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
