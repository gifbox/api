import express, { Request } from "express"
import UserModel from "../models/UserModel.js"
import { ulid } from "ulid"
import { optionalSession, requireSession } from "../middleware/auth.js"
import upload, { FileArray, UploadedFile } from "express-fileupload"
import slug from "slug"
import { nanoid } from "nanoid"
import crypto from "crypto"
import { fileTypeFromBuffer } from "file-type"
import { gifToWebp } from "../lib/webp.js"
import { deleteFile, putFile } from "../lib/files.js"
import PostModel, { Post } from "../models/PostModel.js"
import { postNewSchema, postSearchSchema } from "./post.schemas.js"
import { analytics, meilisearch } from "../app.js"

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

    const fileType = await fileTypeFromBuffer(file.data)

    if (!["image/gif", "image/png", "image/jpeg", "image/webp"].includes(fileType?.mime))
        return res.status(400).json({
            error: "Only GIFs and common image formats are supported"
        })

    const { error, value } = postNewSchema.validate(req.body)
    if (error)
        return res.status(400).json({
            error: error.details[0].message
        })

    const session = req.session
    const user = await UserModel.findById(session.userId)

    let webp: Buffer
    try {
        webp = await gifToWebp(file.data)
    } catch (e) {
        return res.status(400).json({
            error: "Could not process given file, it is possibly not a GIF"
        })
    }

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
        createdAt: Date.now()
    }

    const post = new PostModel(postObject)
    await post.save()

    const postIndex = await meilisearch.getIndex("posts")
    await postIndex.addDocuments([postObject], { primaryKey: "_id" })

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

    const postIndex = await meilisearch.getIndex("posts")
    postIndex.deleteDocument(req.params.id)

    res.json({
        success: true,
    })
})

router.get("/popular", optionalSession, async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
    const skip = req.query.skip ? parseInt(req.query.skip as string) : 0

    if (limit > 100)
        return res.status(400).json({
            error: "Limit must be less than 100"
        })

    const posts = await PostModel.aggregate([
        {
            $match: {
                private: false,
            }
        },
        {
            $sort: {
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
                }
            }
        }
    ])

    for (let post of posts) {
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
    }) as any // cast: temporary

    if (!post)
        return res.status(400).json({
            error: "Post not found"
        })

    delete post._doc.private
    post._doc.author = await UserModel.findById(post._doc.author, {
        __v: 0,
        hashedPassword: 0,
        suspensionState: 0,
        followers: 0,
        email: 0,
    })
    post._doc.views = await analytics.fetchPostViews(req.params.id)

    await analytics.incrementPostViews(req.params.id)

    res.json({ ...post._doc })
})

router.get("/search", optionalSession, async (req, res) => {
    const { error, value } = postSearchSchema.validate(req.query)
    if (error)
        return res.status(400).json({
            error: error.details[0].message
        })

    const { limit, query, skip } = value

    const postIndex = await meilisearch.getIndex("posts")
    const posts = await postIndex.search<Post>(query, {
        sort: [
            "createdAt:desc"
        ],
        filter: [
            "private = false"
        ],
        offset: skip,
        limit: limit
    })

    const hits: (Post)[] = [...posts.hits]

    // Remove the field "private" from the posts
    for (let hit of hits) {
        delete hit.private
        hit.author = await UserModel.findById(hit.author, {
            __v: 0,
            hashedPassword: 0,
            suspensionState: 0,
            followers: 0,
            email: 0,
        })
    }

    res.json({
        hits: posts.hits,
        tookMs: posts.processingTimeMs,
        numHits: posts.nbHits,
        numHitsApprox: !posts.exhaustiveNbHits
    })
})

export default router