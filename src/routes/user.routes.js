import express from "express"
import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = express.Router()

router.route("/register").post(registerUser)
// router.post("/register", (req, res) => {
//     registerUser
// })

export default router