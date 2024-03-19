import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "videoId is required or invalid");
  }
  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              userName: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, comments, "Get video comments success"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "videoId is required or invalid");
  }

  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Comment text is required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found to comment");
  }

  const comment = await Comment.create({
    content,
    video: video._id,
    owner: req.user?._id,
  });

  if (!comment) {
    throw new ApiError(500, "Something went wrong while posting comment");
  }

  res
    .status(201)
    .json(new ApiResponse(201, comment, "Add comment to video success"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "commentId is required or invalid");
  }

  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Comment text is required to update comment");
  }

  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );
  res.status(200).json(new ApiResponse(200, comment, "Comment update success"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "commentId is required or invalid");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "comment not found");
  }

  if (comment.owner?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(401, "You cannot delete this comment");
  }

  await Comment.findByIdAndDelete(commentId);

  res.status(200).json(new ApiResponse(200, {}, "Comment delete success"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
