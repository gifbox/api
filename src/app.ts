import express from "express"
import { config as dotenvConfig } from "dotenv"
import cors from "cors"
import helmet from "helmet"
import mongoose from "mongoose"

dotenvConfig()

export const db = await mongoose.connect(process.env.MONGO_URI, {})
export const app = express()

app.use(cors())
app.use(helmet())

app.get("/", (req, res) => {
    res.json({
        status: "ok",
    })
})

app.use((req, res, next) => {
    res.status(404).json({
        message: "Not Found",
    })
})

app.listen(process.env.PORT, () => {
    console.log(`Server listening on port ${process.env.PORT}`)
})