import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    throw new ApiError(400, "All field are required!");
  }
  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new ApiError(400, "create playlist failed");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully.!"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }
  const playlist = await Playlist.aggregate([
    {
      $match: { owner: new mongoose.Types.ObjectId(userId.trim()) },
    },
    {
      $addFields: {
        originalVideosCount: { $size: "$videos" }, // Add a temporary field to store the original count of videos
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $project: {
              thumbnail: 1,
              title: 1,
              Views: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        totalViews: {
          $sum: "$videos.Views",
        },
        totalVideos: "$originalVideosCount", // Use the original count of videos
      },
    },
    {
      $project: {
        originalVideosCount: 0, // Remove the temporary field from the final output
      },
    },
  ]);

  if (!playlist) {
    throw new ApiError(400, "playlist not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "User playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId?.trim() || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "playlistId is required or invalid");
  }

  let playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId.trim()),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $project: {
              thumbnail: 1,
              title: 1,
              duration: 1,
              views: 1,
              videoOwner: 1,
            },
          },
        ],
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
              fullName: 1,
              userName: 1,
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

  if (playlist.length > 0) {
    playlist = playlist[0];
  } else {
    throw new ApiError(404, "Playlist not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, playlist, "Get single playlist success"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }

  const playlist = await Playlist.findById(playlistId);
  const video = await Video.findById(videoId);

  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }

  if (!video) {
    throw new ApiError(400, "Video not found");
  }
  const existingIndex = playlist.videos.findIndex(
    (id) => id.toString() === videoId
  );

  if (existingIndex !== -1) {
    playlist.videos[existingIndex] = video._id;
  } else {
    playlist.videos.push(video._id);
  }

  const updatedPlaylist = await playlist.save();

  if (!updatedPlaylist) {
    throw new ApiError(400, "Failed to add video to playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video added to playlist successfully"
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }

  const playlist = await Playlist.findById(playlistId);
  const video = await Video.findById(videoId);

  if (!playlist) {
    throw new ApiError(400, "Playlist not found");
  }

  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  const index = playlist.videos.indexOf(videoId);

  if (index !== -1) {
    playlist.videos.splice(index, 1);
  } else {
    throw new ApiError(400, "Video is not in the playlist");
  }

  await playlist.save();

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { playlist: playlist },
        "Video removed from playlist successfully"
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }

  const playlist = await Playlist.findByIdAndDelete(playlistId);
  if (!playlist) {
    throw new ApiError(400, "playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "playlist Deleted successfully.!"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }

  const playlistUpdated = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    { new: true }
  );

  if (!playlistUpdated) {
    throw new ApiError(400, "failed to update playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlistUpdated, "playlist updated successfully.!")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
