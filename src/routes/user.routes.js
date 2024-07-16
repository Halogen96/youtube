import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js"
import { 
    changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelDetails, 
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    refreshAccessToken,
    registerUser, 
    updateAccountDetails, 
    updateAvatar, 
    updateCoverImage 
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

// routes
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)


// secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser) 
router.route("/update-account").patch(verifyJWT, updateAccountDetails)

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)
router.route("/update-cover-image").post(verifyJWT, upload.single("coverImage"), updateCoverImage)

router.route("/channel/:username").get(verifyJWT, getUserChannelDetails)

router.route("/watch-history").get(verifyJWT, getWatchHistory)

export default router