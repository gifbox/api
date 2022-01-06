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
import { deleteFile, putFile } from "../lib/files.js"
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
        mimeType: "image/webp",
        uploadDate: new Date(),
        author: user._id,
        size: file.size,
        sha512: crypto.createHash("sha512").update(webp).digest("hex"),
    }

    await putFile(webp, fileName, "posts")

    const id = ulid()

    const postObject = {
        _id: id,
        title: req.body.title,
        slug: slug(req.body.title, { lower: true }).substr(0, 50),
        author: user._id,
        tags: req.body["tags[]"].map(tag => slug(tag, { lower: true })),
        file: fileObject,
        private: false,
        favorites: [],
    }

    const post = new PostModel(postObject)
    await post.save()

    res.json(post)
})

router.delete("/:id", requireSession, async (req, res) => {
    if (!req.params.id)
        return res.status(400).json({
            error: "No post id"
        })

    const session = (req as any).session
    const user = await UserModel.findById(session.userId)

    const post = await PostModel.findById(req.params.id)
    if (!post)
        return res.status(400).json({
            error: "Post not found"
        })

    if (post.author !== user._id)
        return res.status(400).json({
            error: "You are not the author of this post"
        })

    await deleteFile(post.file.fileName, "posts")
    await post.remove()

    res.json({
        success: true,
    })
})

router.get("/popular", async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0

    if (limit > 50)
        return res.status(400).json({
            error: "Limit must be less than 50"
        })

    // Retrieve the posts, sorted by the number of favorites and uploaded date. Limit the number of posts to the specified limit. Skip the specified number of posts.
    const posts = await PostModel.aggregate([
        {
            $match: {
                private: false,
            }
        },
        {
            $sort: {
                favorites: -1,
                uploadDate: -1,
            },
        },
        {
            $skip: skip,
        },
        {
            $limit: limit,
        },
        {
            $project: {
                title: 1,
                slug: 1,
                author: 1,
                tags: 1,
                file: {
                    fileName: 1,
                    size: 1,
                },
                favorites: 1
            }
        }
    ])

    posts.forEach(post => {
        post.favorites = post.favorites.length
    })

    res.json(posts)
})

router.get("/:id", async (req, res) => {
    if (!req.params.id)
        return res.status(400).json({
            error: "No post id"
        })

    const { favorites, ...post } = await PostModel.findOne({ _id: req.params.id }, {
        __v: 0,
        private: 0,
        file: {
            originalFileName: 0,
            _id: 0,
            uploadDate: 0,
            author: 0,
            extension: 0,
            mimeType: 0,
            bucket: 0,
            sha512: 0
        }
    })

    delete post._doc.private // Private is a reserved word, we cannot destructure it.
    post._doc.favorites = favorites.length

    if (!post)
        return res.status(400).json({
            error: "Post not found"
        })

    res.json({ ...post._doc })
})

const searchSchema = Joi.object({
    query: Joi.string().max(512).required(),
    skip: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(100).default(10),
})

router.post("/search", async (req, res) => {
    const { error, value } = searchSchema.validate(req.body)
    if (error)
        return res.status(400).json({
            error: error.details[0].message
        })

    const query = value.query
    const skip = value.skip
    const limit = value.limit

    const posts = await PostModel.find({
        $text: {
            $search: query,
        },
        private: false,
    }, {
        __v: 0,
        private: 0,
        file: {
            originalFileName: 0,
            _id: 0,
            uploadDate: 0,
            author: 0,
            extension: 0,
            mimeType: 0,
            bucket: 0,
            sha512: 0
        }
    }).skip(skip).limit(limit).sort({
        score: {
            $meta: "textScore",
        },
    }).exec()

    // Remove the field "private" from the posts and replace favorites with the number of favorites
    posts.forEach(post => {
        delete post._doc.private
        post._doc.favorites = post._doc.favorites.length
    })

    res.json(posts)
})

export default router