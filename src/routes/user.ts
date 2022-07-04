import express from "express"
import UserModel from "../models/UserModel.js"
import argon2 from "argon2"
import { ulid } from "ulid"
import { requireSession } from "../middleware/auth.js"
import { userFavoriteAddSchema, userModifySchema, userRegistrationSchema } from "./user.schemas.js"
import FavoriteModel from "../models/FavoriteModel.js"

const router = express.Router()

router.post("/register", async (req, res) => {
    const { error, value } = userRegistrationSchema.validate(req.body)
    if (error) {
        res.status(400).json({
            error: error.details[0].message
        })
        return
    }

    const { username, email, password } = value

    if (await UserModel.findOne({ username: value.username }))
        return res.status(400).json({
            error: "Username already exists"
        })

    if (await UserModel.findOne({ email: value.email }))
        return res.status(400).json({
            error: "Email already exists"
        })

    const hash = await argon2.hash(password)

    const id = ulid()

    const user = new UserModel({
        _id: id,
        displayName: req.body.username,
        username: username,
        email: email,
        hashedPassword: hash
    })

    const result = await user.save()

    const { hashedPassword, suspensionState, followers, verified, __v, ...rest } = (result as any)._doc
    res.json(rest)
})

router.get("/self", requireSession, async (req, res) => {
    const user = await UserModel.findById((req as any).session.userId)

    const { hashedPassword, suspensionState, followers, __v, ...restOfUser } = (user as any)._doc
    res.json(restOfUser)
})

router.patch("/self", requireSession, async (req, res) => {
    const user = await UserModel.findById((req as any).session.userId)
    const { error, value } = userModifySchema.validate(req.body)

    if (error) {
        res.status(400).json({
            error: error.details[0].message
        })
        return
    }

    if (typeof value.description === "string") {
        user.description = value.description
    }

    if (typeof value.displayName === "string") {
        user.displayName = value.displayName
    }

    await user.save()

    const { hashedPassword, suspensionState, followers, __v, ...restOfUser } = (user as any)._doc
    res.json(restOfUser)
})

router.post("/favorites", requireSession, async (req, res) => {
    const { error, value } = userFavoriteAddSchema.validate(req.body)

    if (error) {
        res.status(400).json({
            error: error.details[0].message
        })
        return
    }

    const existingFavorite = await FavoriteModel.findOne({
        url: value.url,
        author: (req as any).session.userId
    })
    if (existingFavorite) {
        res.status(400).json({
            error: "URL already favorited"
        })
        return
    }

    const favorite = new FavoriteModel({
        _id: ulid(),
        author: (req as any).session.userId,
        favoritedAt: Date.now(),
        url: value.url
    })

    const result = await favorite.save()

    res.json(result)
})

router.delete("/favorites/:id", requireSession, async (req, res) => {
    const existingFavorite = await FavoriteModel.findOne({
        _id: req.params.id,
        author: (req as any).session.userId
    })
    if (!existingFavorite) {
        res.status(404).json({
            error: "Not in favorites"
        })
        return
    }

    await existingFavorite.deleteOne()

    res.json({ success: true })
})

router.get("/favorites", requireSession, async (req, res) => {
    const favorites = await FavoriteModel.find({
        author: (req as any).session.userId,
    })

    res.json(favorites)
})

router.get("/:username", async (req, res) => {
    const user = await UserModel.findOne({ username: req.params.username })
    if (!user)
        return res.status(404).json({
            error: "User not found"
        })

    const { hashedPassword, suspensionState, followers, __v, email, ...restOfUser } = (user as any)._doc
    res.json(restOfUser)
})

export default router