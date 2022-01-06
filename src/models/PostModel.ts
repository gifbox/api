import mongoose from "mongoose"
import { FileInformationSchema } from "./StructureSchemas.js"

const PostSchema = new mongoose.Schema({
    _id: {
        type: String,
    },
    title: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 512,
        index: "text",
    },
    slug: {
        type: String,
        required: true,
    },
    author: {
        type: String,
        required: true,
    },
    tags: {
        type: [String],
        required: true,
        minlength: 3,
        index: true,
    },
    file: {
        type: FileInformationSchema,
        required: true,
    },
    private: {
        type: Boolean,
        required: true,
        default: false,
    },
    favorites: {
        type: [String],
        required: true,
        default: [],
    },
})

const PostModel = mongoose.model("Post", PostSchema)

export default PostModel