import express from "express"
import { config as dotenvConfig } from "dotenv"
import cors from "cors"
import helmet from "helmet"
import mongoose from "mongoose"

import UserRouter from "./routes/user.js"
import SessionRouter from "./routes/session.js"

dotenvConfig()

export const db = await mongoose.connect(process.env.MONGO_URI, {})
export const app = express()

app.use(cors())
app.use(helmet())
app.use(express.json())

app.get("/", (req, res) => {
    res.json({
        status: "ok",
    })
})

app.use("/user", UserRouter)
app.use("/session", SessionRouter)

app.use((req, res, next) => {
    res.status(404).json({
        message: "Not Found",
    })
})

app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({
        message: "Internal Server Error",
    })
})

app.listen(process.env.PORT, () => {
    console.log(`Server listening on port ${process.env.PORT}`)
})