import express, { Request } from "express"
import { parse } from "path"
import { fileExists, getFile } from "../lib/files.js"
import PostModel from "../models/PostModel.js"

const router = express.Router()

router.get("/posts/:file", async (req, res) => {
    const filename = req.params.file

    const exists = await fileExists(filename, "posts")
    if (!exists)
        return res.status(404).json({
            error: "File not found"
        })

    const postWithFile = await PostModel.findOne({
        "file.fileName": filename
    })
    if (!postWithFile)
        return res.status(404).json({
            error: "File not attached to post — it may have been deleted"
        })

    const fileData = postWithFile.file
    const file = await getFile(fileData.fileName, "posts")

    res.set("Content-Type", fileData.mimeType)
    res.set("Content-Length", String(file.length))
    res.set("Content-Disposition", `inline; filename="${fileData.fileName}"`)
    res.set("Cache-Control", "public, max-age=31536000")
    res.set("Expires", new Date(Date.now() + 31536000).toUTCString())
    res.set("Last-Modified", fileData.uploadDate.toUTCString())
    res.set("ETag", fileData.sha512)

    res.send(file)
})

export default router