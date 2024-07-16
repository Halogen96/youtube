import { Comment } from "../models/comment.models.js"
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler( async (req, res) => {
    const { videoId } = req.params

    const comments = await Comment.aggregate([
        // pipeline 1: fetch ONLY the comments from the given video ID
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        // pipeline 2: get the username, fullName and the avatar for all the comments
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        // pipelines 3: desconstuct the array given by lookup
        {
            $unwind: "$owner"
        },
        // pipeline 4: return the fields we want
        {
            $project: {
                content: 1,
                createdAt: 1,
                "owner.username": 1,
                "owner.fullName": 1,
                "owner.avatar": 1
            }
        },
        // pipeline 5: sort the comments in descending order of creation time
        {
            $sort: {
                createdAt: -1
            }
        }
    ])

    res.status(200)
    .json( new apiResponse(200, comments, "Comments fetched successfully!"))
})

const addComment = asyncHandler( async (req, res) => {

    const content = req.body
    const videoId = req.params

    if(!content || !videoId) {
        throw new apiError(400, "Content or Video ID missing!")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    const createdComment = await Comment.findById(comment._id)

    if(!createdComment) {
        throw new apiError(500, "Failed to add a comment!")
    }

    res
    .status(201)
    .json(new apiResponse(201, createdComment, "Comment added successfully!"))
})

const deleteComment = asyncHandler( async (req, res) => {
    const {commentId} = req.params
    
    if (!commentId) {
        throw new apiError(400, "Comment ID is required!")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new apiError(404, "Comment not found!")
    }

    if(comment.owner.toString() !== req.user._id.toString()) {
        throw new apiError(403, "You are not authorized to delete the comment!")
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId)

    if (!deletedComment) {
        throw new apiError(500, "Failed to delete the comment!")
    }

    res
    .status(200)
    .json(new apiResponse(200, {}, "Comment deleted successfully!"))
})

export {
    getVideoComments,
    addComment,
    deleteComment
}