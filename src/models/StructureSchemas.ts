import { Schema } from "mongoose"

export const SuspensionStateSchema = new Schema({
    _id: {
        type: String,
        required: true,
        unique: true,
    },
    expirationDate: {
        type: Date,
        required: false,
    }
})

export const FileInformationSchema = new Schema({
    _id: {
        type: String,
        required: true,
        unique: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    extension: {
        type: String,
        required: true,
    },
    bucket: {
        type: String,
        required: true,
    },
    mimeType: {
        type: String,
        required: true,
    },
    uploadDate: {
        type: Date,
        required: true,
    },
    author: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
    },
    sha512: {
        type: String,
        required: true,
    },
})