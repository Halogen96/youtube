import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videoFile: {
        type: String,       //cloud url
        required: true
    },
    thumbnail: {
        type: String,       //cloud url
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    duration: {
        type: Number,           //cloud url
        required: true
    },
    views: {
        type: Number,           //cloud url
        required: true,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true,
        required: true
    }
}, {timestamps: true})

//enables to write aggregation-level queries
videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)