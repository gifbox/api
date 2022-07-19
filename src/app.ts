///<reference path="../index.d.ts"/>
import express from "express"
import { config as dotenvConfig } from "dotenv"
import cors from "cors"
import helmet from "helmet"
import mongoose from "mongoose"
import { MeiliSearch } from "meilisearch"
import { AnalyticsClient } from "./analytics/client.js"

dotenvConfig()

import UserRouter from "./routes/user.js"
import SessionRouter from "./routes/session.js"
import PostRouter from "./routes/post.js"
import FileRouter from "./routes/file.js"

export const db = await mongoose.connect(process.env.MONGO_URI, process.env.MONGO_USE_CREDENTIALS === "true" ? {
    auth: {
        username: process.env.MONGO_USERNAME,
        password: process.env.MONGO_PASSWORD
    }
} : {})

export const meilisearch = new MeiliSearch({
    host: process.env.MEILISEARCH_HOST,
    apiKey: process.env.MEILISEARCH_MASTERKEY
})

export const analytics = new AnalyticsClient()

export const app = express()

app.use(express.json())
app.use((err, req, res, next) => {
    if (err) {
        res.status(400).json({
            error: err.message ?? "Incomprehensible request body",
        })
    }
})

app.use(cors())
app.use(helmet({
    crossOriginResourcePolicy: false
}))

app.get("/", (req, res) => {
    res.json({
        status: "ok",
    })
})

app.use("/user", UserRouter)
app.use("/session", SessionRouter)
app.use("/post", PostRouter)
app.use("/file", FileRouter)

app.use((req, res, next) => {
    res.status(404).json({
        error: "Not Found",
    })
})

app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({
        error: "Internal Server Error",
    })
})

import { ensureBuckets } from "./lib/files.js"
import { MeiliInit } from "./lib/meili.js"

app.listen(process.env.PORT, async () => {
    console.log(`Server listening on port ${process.env.PORT}`)

    await ensureBuckets()

    const meiliInit = new MeiliInit(meilisearch)
    await meiliInit.ensureIndices()
})