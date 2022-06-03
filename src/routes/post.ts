import express, { Request } from "express"
import UserModel from "../models/UserModel.js"
import { ulid } from "ulid"
import { optionalSession, requireSession } from "../middleware/auth.js"
import upload, { FileArray, UploadedFile } from "express-fileupload"
import slug from "slug"
import { nanoid } from "nanoid"
import crypto from "crypto"
import { gifToWebp } from "../lib/webp.js"
import { deleteFile, putFile } from "../lib/files.js"
import PostModel from "../models/PostModel.js"
import { postNewSchema, postSearchSchema } from "./post.schemas.js"

const router = express.Router()

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

    const { error, value } = postNewSchema.validate(req.body)
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

    const id = nanoid(11)

    const postObject = {
        _id: id,
        title: value.title,
        slug: slug(value.title, { lower: true }).substr(0, 40),
        author: user._id,
        tags: value["tags[]"].map(tag => slug(tag, { lower: true })),
        file: fileObject,
        private: false,
        favorites: [],
    }

    const post = new PostModel(postObject)
    await post.save()

    const author = await UserModel.findById(user._id, {
        __v: 0,
        hashedPassword: 0,
        suspensionState: 0,
        followers: 0,
        email: 0,
    })

    res.json({
        ...postObject,
        author,
        favorites: 0,
        favorited: false,
    })
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

router.get("/popular", optionalSession, async (req, res) => {
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

    for (let post of posts) {
        post.favorited = post.favorites.includes((req as any).session?.userId)
        post.favorites = post.favorites.length
        post.author = await UserModel.findById(post.author, {
            __v: 0,
            hashedPassword: 0,
            suspensionState: 0,
            followers: 0,
            email: 0,
        })
    }

    res.json(posts)
})

router.get("/info/:id", optionalSession, async (req, res) => {
    if (!req.params.id)
        return res.status(400).json({
            error: "No post id"
        })

    const post = await PostModel.findOne({ _id: req.params.id }, {
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

    if (!post)
        return res.status(400).json({
            error: "Post not found"
        })

    delete post._doc.private // Private is a reserved word, we cannot destructure it.
    post._doc.favorited = post._doc.favorites.includes((req as any).session?.userId ?? "")
    post._doc.favorites = post._doc.favorites.length
    post._doc.author = await UserModel.findById(post._doc.author, {
        __v: 0,
        hashedPassword: 0,
        suspensionState: 0,
        followers: 0,
        email: 0,
    })

    res.json({ ...post._doc })
})

router.get("/search", optionalSession, async (req, res) => {
    const { error, value } = postSearchSchema.validate(req.query)
    if (error)
        return res.status(400).json({
            error: error.details[0].message
        })

    const { limit, query, skip } = value

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
    for (let post of posts) {
        delete post._doc.private
        post._doc.favorited = post._doc.favorites.includes((req as any).session?.userId ?? "")
        post._doc.favorites = post._doc.favorites.length
        post._doc.author = await UserModel.findById(post._doc.author, {
            __v: 0,
            hashedPassword: 0,
            suspensionState: 0,
            followers: 0,
            email: 0,
        })
    }

    res.json(posts)
})

export default router