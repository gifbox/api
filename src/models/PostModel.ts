import mongoose from "mongoose"
import { FileInformationSchema } from "./StructureSchemas.js"
import { FileInformation } from "./Types.js"

export interface Post {
    _id: string
    title: string
    slug: string
    author: string
    tags: string[]
    file: FileInformation
    private: boolean
    createdAt: number
}

const PostSchema = new mongoose.Schema<Post>({
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
    createdAt: {
        type: Number,
        required: true
    }
})

const PostModel = mongoose.model("Post", PostSchema)

export default PostModel