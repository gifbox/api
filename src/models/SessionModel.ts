import mongoose from "mongoose"

const SessionSchema = new mongoose.Schema({
    _id: {
        type: String,
    },
    sessionName: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 50,
    },
    token: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    }
})

const SessionModel = mongoose.model("Session", SessionSchema)

export default SessionModel