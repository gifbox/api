import mongoose from "mongoose"
import { SuspensionStateSchema } from "./StructureSchemas.js"

const UserSchema = new mongoose.Schema({
    _id: {
        type: String,
    },
    displayName: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 50,
    },
    username: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 50,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    hashedPassword: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
        maxlength: 2048,
        default: "",
    },
    verified: {
        type: Boolean,
        required: true,
        default: false,
    },
    suspensionState: {
        type: SuspensionStateSchema,
        required: false,
        default: null,
    },
    followers: {
        type: [String],
        required: false,
        default: [],
    }
})

const UserModel = mongoose.model("User", UserSchema)

export default UserModel