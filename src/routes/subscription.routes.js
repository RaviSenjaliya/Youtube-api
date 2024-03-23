import { Router } from "express";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/c/:channelId").post(toggleSubscription);
router.route("/channel-subscribers/:channelId").get(getUserChannelSubscribers);
router.route("/subscribed-channels/:channelId").get(getSubscribedChannels);

export default router;
