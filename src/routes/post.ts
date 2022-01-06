import express, { Request } from "express"
import Joi from "joi"
import UserModel from "../models/UserModel.js"
import { ulid } from "ulid"
import { requireSession } from "../middleware/auth.js"
import upload, { FileArray, UploadedFile } from "express-fileupload"
import slug from "slug"
import { nanoid } from "nanoid"
import crypto from "crypto"
import { gifToWebp } from "../lib/webp.js"
import { putFile } from "../lib/files.js"
import PostModel from "../models/PostModel.js"

const router = express.Router()

const newSchema = Joi.object({
    title: Joi.string().min(3).max(512).required(),
    "tags[]": Joi.array().items(Joi.string().min(3).max(50)).required(),
})

router.post("/new", requireSession, upload({
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB — The image will be converted into webp and GIFs are very large.
    }
}), async (req: Request & { files: FileArray & { file: UploadedFile } }, res) => {
    const file = req.files.file

    if (!file)
        return res.status(400).json({
            error: "No file uploaded"
        })

    if (file.mimetype !== "image/gif")
        return res.status(400).json({
            error: "Only GIFs are supported"
        })

    const { error } = newSchema.validate(req.body)
    if (error)
        return res.status(400).json({
            error: error.details[0].message
        })

    const session = (req as any).session
    const user = await UserModel.findById(session.userId)

    const webp = await gifToWebp(file.data)

    const fileName = `${nanoid(32)}.webp`
    const fileObject = {
        _id: ulid(),
        fileName: fileName,
        originalFileName: file.name,
        extension: "webp",
        bucket: "posts",
        mimeType: file.mimetype,
        uploadDate: new Date(),
        author: user.username,
        size: file.size,
        sha512: crypto.createHash("sha512").update(webp).digest("hex"),
    }

    await putFile(webp, fileName, "posts")

    const id = ulid()

    const postObject = {
        _id: id,
        title: req.body.title,
        slug: slug(req.body.title, { lower: true }).substr(0, 50),
        author: user.username,
        tags: req.body["tags[]"].map(tag => slug(tag, { lower: true })),
        file: fileObject,
        private: false,
        favorites: [],
    }

    const post = new PostModel(postObject)
    await post.save()

    res.json(post)
})

export default router