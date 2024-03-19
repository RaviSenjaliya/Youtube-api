import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  // const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  const videos = await Video.aggregate([
    {
      $match: {
        isPublished: true,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, duration = "0" } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if ([title, description, duration].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All field are requird");
  }

  const videoFileLocalPath = req.files?.videoFile[0]?.path;
  let thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!(videoFileLocalPath && thumbnailLocalPath)) {
    throw new ApiError(400, "videoFile and thumbnail path is requird");
  }
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!(videoFile && thumbnail)) {
    throw new ApiError(400, "videoFile and thumbnail is requird");
  }

  const uploadVideo = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    duration: Number((Math.round(videoFile.duration * 100) / 100).toFixed(2)),
    owner: req.user._id,
  });
  if (!uploadVideo) {
    throw new ApiError(
      500,
      "Something went wrong while uploading video, try again"
    );
  }
  return res
    .status(201)
    .json(new ApiResponse(200, uploadVideo, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId?.trim()) {
    throw new ApiError(400, "videoId is missing");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
              email: 1,
              avatar: 1,
            },
          },
        ],
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
        // object ma conver kare etale frontend ma easy re
        owner: {
          $first: "$owner",
        },
        likes: {
          $size: "$likes",
        },
      },
    },
  ]);

  if (!video.length) {
    throw new ApiError(400, "video not find!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { video: video[0] }, "Video fetched successfully")
    );
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  // Check if any field is empty
  if (!(title || description)) {
    throw new ApiError(400, "All fields are requird");
  }

  // check if Invalid videoId
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId!");
  }

  // ================{thumbnail update}=============================
  const oldthumbnail = await Video.findById(videoId).exec();

  if (!oldthumbnail) {
    throw new ApiError(400, "oldthumbnail is missing");
  }

  const thumbnailLocalFilePath = req.file?.path;

  if (!thumbnailLocalFilePath) {
    throw new ApiError(400, "thumbnailLocalFilePath is missing");
  }

  let thumbnail;
  if (thumbnailLocalFilePath) {
    await deleteOnCloudinary(oldthumbnail.thumbnail);
    thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);
  }

  if (!thumbnail.url) {
    throw new ApiError(400, "Error while uploading on thumbnail");
  }

  const updatethumbnail = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        thumbnail: thumbnail.url,
        title,
        description,
      },
    },
    { new: true }
  );
  return res
    .status(200)
    .json(new ApiResponse(200, updatethumbnail, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId!");
  }

  // Use await or .exec() to get the document
  const video = await Video.findById(videoId).exec();

  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  // Delete record from the database
  await Video.findByIdAndDelete(videoId);

  // Delete video & thumbnail from cloudinary
  if (video.videoFile) {
    await deleteOnCloudinary(video.videoFile, "video");
  }

  if (video.thumbnail) {
    await deleteOnCloudinary(video.thumbnail);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "can not find video");
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Toggle public status successfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
