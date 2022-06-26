import mongoose from "mongoose"

export interface Favorite {
    _id: string
    url: string
    author: string
    favoritedAt: number
}

const FavoriteSchema = new mongoose.Schema<Favorite>({
    _id: {
        type: String,
    },
    url: {
        type: String,
        required: true,
    },
    author: {
        type: String,
        required: true,
    },
    favoritedAt: {
        type: Number,
        required: true,
    }
})

const FavoriteModel = mongoose.model("Favorite", FavoriteSchema)

export default FavoriteModel