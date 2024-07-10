import { asyncHandler } from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"

const registerUser = asyncHandler( async (req, res) => {
    //get the email from req body
    //validation: empty, white spaces, email
    //check if the user with that email/username exists
    //if it exists, then exit with status code 409
    //check for images, and upload them to cloudinary using utility cloudinary.js
    //create a new User object in mongodb with the details from req body
    //remove password and refresh token from the response 
    //check for user creation and return the res
    
    const { email, username, fullName, password } = req.body
    
    if ( [email, username, fullName, password].some( (field) => field?.trim() === "") ) {
        throw new apiError(400, "All fields are mandatory!")
    }

    //validating email
    if(!/\S+@\S+\.\S+/.test(email))
        throw new apiError(400, "Email not valid!")

    //console.log(email)

    const userExists = User.findOne({ $or: [{email}, {username}] })
    //console.log(userExists);

    if(userExists)
        throw new apiError(409, "User already exists!")

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0].path

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
        username: username.toLowercase(),
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

export { registerUser }