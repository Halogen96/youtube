import { asyncHandler } from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"
import { mongoose } from "mongoose"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId) 
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken } 

    } catch (error) {
        throw new apiError(500, "Something went wrong while generating access and refresh token!")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    //get the email from req body
    //validation: empty, white spaces, email
    //check if the user with that email/username exists
    //if it exists, then exit with status code 409
    //check for images, and upload them to cloudinary using utility cloudinary.js
    //create a new User object in mongodb with the details from req body
    //remove password and refresh token from the response 
    //check for user creation and return the res

    //console.log(req.body);

    const { email, username, fullName, password } = req.body
    
    if ( [email, username, fullName, password].some( (field) => field?.trim() === "") ) {
        throw new apiError(400, "All fields are mandatory!")
    }

    //validating email
    if(!/\S+@\S+\.\S+/.test(email))
        throw new apiError(400, "Email not valid!")

    const userExists = await User.findOne({ $or: [{email}, {username}] })

    if(userExists)
        throw new apiError(409, "User already exists!")

    // avatar is mandatory while coverImage is not
    const avatarLocalPath = req.files?.avatar[0]?.path
    //const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    //console.log(req.files);
    //console.log("precloudinary: " + avatarLocalPath);

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar is mandatory!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new apiError(400, "Avatar is mandatory!")
    }

    //entry in db
    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser) {
        throw new apiError(500, "Something went wrong while registering a new user!")
    }

    return res.status(201).json(
        new apiResponse(200, createdUser, "User registered succesfully!")
    )
})

const loginUser = asyncHandler( async (req, res) => {
    //take the email/username and password from the req.body
    //check if the email/username exists in the db
    //check if the password matches 
    //validate the access and the refresh token of the user
    
    //const { email, username, password } = req.body
    const { email, username, password } = req.body

    if(!username && !email) {
        throw new apiError(400, "Username or email is needed!")
    }
    
    const user = await User.findOne({ $or: [{username}, {email}] })

    if(!user) {
        throw new apiError(404, "User does not exist!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new apiResponse(401, "Wrong password!")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in succesfully!"
        )
    )
})

const logoutUser = asyncHandler( async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined 
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new apiResponse(200, {}, "User logged out succesfully!")
    )
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new apiError(401, "Unautharized request!")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new apiError(401, "Unautharized request!")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new apiError(400, "Refresh token is used or expired!")
        }
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)
    
        //update the accessToken field in the cookie and send the response
        res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new apiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken}, 
                "Access token renewed successfully!")
        )

    } catch (error) {
        throw new apiError(401, error?.message || "Something went wrong while renewing tokens!")
    }
})

const getCurrentUser = asyncHandler( async (req, res) => {
    res
    .status(200)
    .json(new apiResponse(200, req.user, "Current user fetched successfully!"))
})

const changeCurrentPassword = asyncHandler( async (req, res) => {

    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req?.user._id)

    //check if the oldPassword matches the user.password
    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isOldPasswordCorrect) {
        throw new apiError(400, "Old password is incorrect!")
    }

    //if it does, change the user.password to newPassword
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    res
    .status(200)
    .json(new apiResponse(200, {}, "Password changed succesfully!"))
})

const updateAccountDetails = asyncHandler( async (req, res) => {
    const { fullName, email, username } = req.user

    if(!fullName || !username || !email) {
        throw new apiError(400, "All fields are required!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email,
                username
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new apiResponse(200, user, "User details updated successfully!"))
})

const updateAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.files?.avatar[0].path

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar is needed!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new apiError(400, "Error while uploading avatar!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    res.status(200)
    .json(new apiResponse(200, user, "Avatar udpated successfully!"))
})

const updateCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.files?.coverImage[0].path

    if (!coverImageLocalPath) {
        throw new apiError(400, "Cover image is needed!")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new apiError(400, "Error while uploading cover image!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    res.status(200)
    .json(new apiResponse(200, user, "Cover image udpated successfully!"))
})

const getUserChannelDetails = asyncHandler( async (req, res) => {
    const username = req.params

    if (!username.trim()) {
        throw new apiError(400, "Username is missing!")
    }

    //we want to combine the user subscription and user models 

    const channel = await User.aggregate([
        // pipeline 1: get the user with specified username
        {
            $match: username?.toLowerCase()
        },
        // pipeline 2: get the subscribers documents
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        // pipeline 3: get the channels subscribed to documents
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        // pipeline 4: add the new feilds: number of subscriber, subscriptions and whether subscribed or not
        {
            $addFields: {
                subsribersCount: {
                    $size: "$subscribers"
                },
                subsribedToCount: {
                    $size: "$subscribedTo"  
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        // pipeline 4: project the fields
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subsribedToCount: 1,
                subsribersCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if(!channel?.length) {
        throw new apiError(404, "Channel not found!")
    }

    res
    .status(200)
    .json(new apiResponse(200, channel[0], "User channel fetched successfully!"))
})

// when we do req.user._id it gives us a string and not the mongodb object id
// but when we use the findById method of mongoose, mongoose auto converts the string to an objectId
// but aggregation pipeline is not handeled by mongoose, handled directly by mongodb
// so when we pass the id in $match field, we have to pass an objectId

// we have to write a subpipeline when joining videos and users
// this is because in the owner feild of the videos schema, there is a objectId reference
const getWatchHistory = asyncHandler( async (req, res) => {
    
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [{
                    $lookup: {
                        from:  "users",
                        localField: "owner",
                        foreignField: "_id",
                        aS: "owner",
                        pipeline: [
                            {
                                $project: {
                                    fullName: 1,
                                    username: 1,
                                    avatar: 1
                                }
                            }
                        ]
                    }
                }],
            }
        },
        {
            $project: {
                watchHistory: 1
            }
        }
    ])

    res
    .status(200)
    .json(
        new apiResponse(200, user[0].watchHistory, "User watch history fetched successfully!" )
    )
})

export { 
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelDetails,
    getWatchHistory
}