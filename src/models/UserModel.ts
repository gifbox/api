import mongoose from "mongoose"
import { SuspensionStateSchema } from "./StructureSchemas"

const UserSchema = new mongoose.Schema({
    displayName: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 50,
    },
    _id: {
        type: String,
        required: true,
        unique: true,
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
    following: {
        type: [String],
        required: false,
        default: [],
    }
})

const UserModel = mongoose.model("User", UserSchema)

export default UserModel