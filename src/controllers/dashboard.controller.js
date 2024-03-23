import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total video s, total likes etc.
  const userId = req.user?._id;

  const video = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id", // write any name
        foreignField: "video",
        as: "likes",
      },
    },

    {
      $group: {
        _id: "$owner", // Group by 'owner' field
        totalLikes: {
          $sum: 1, // Count the likes for each group
        },
        totalViews: {
          $sum: "$Views", // Sum up the 'Views' field
        },
        totalVideos: {
          $sum: 1,
        },
      },
    },
    {
      $project: {
        _id: 0, // Exclude '_id' field from the output
        userId: "$_id", // Rename '_id' to 'userId'
        totalLikes: 1,
        totalViews: 1,
        totalVideos: 1,
      },
    },
  ]);

  const totalSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: userId,
        subscriberCount: {
          $sum: 1,
        },
      },
    },
  ]);

  const channelStats = {
    totalSubscribers: totalSubscribers[0]?.subscriberCount || 0,
    totalLikes: video[0]?.totalLikes || 0,
    totalViews: video[0]?.totalViews || 0,
    totalVideos: video[0]?.totalVideos || 0,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelStats, "channel stats fetched successfully.!")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel

  const video = await Video.aggregate([
    {
      $match: {
        owner: req.user?._id,
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likeCount: {
          $size: "$likes",
        },
      },
    },
    {
      $project: {
        likes: 0,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "All Videos Fetched Successfully..!"));
});

export { getChannelStats, getChannelVideos };
