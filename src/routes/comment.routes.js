import express from "express"
import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware"
import { addComment, deleteComment, getVideoComments } from "../controllers/comment.controller"

const router = Router()

// secured routes
router.route("/comments/:videoId").get(verifyJWT, getVideoComments)
router.route("add-comment/:videoId").post(verifyJWT, addComment)
router.route("/delete-comment/:commentId").post(verifyJWT, deleteComment)