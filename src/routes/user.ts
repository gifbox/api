import express from "express"
import UserModel from "../models/UserModel.js"
import argon2 from "argon2"
import { ulid } from "ulid"
import { requireSession } from "../middleware/auth.js"
import { userModifySchema, userRegistrationSchema } from "./user.schemas.js"

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

    const { hashedPassword, suspensionState, followers, verified, __v, ...rest } = result._doc
    res.json(rest)
})

router.get("/self", requireSession, async (req, res) => {
    const user = await UserModel.findById((req as any).session.userId)

    const { hashedPassword, suspensionState, followers, __v, ...restOfUser } = user._doc
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

    const { hashedPassword, suspensionState, followers, __v, ...restOfUser } = user._doc
    res.json(restOfUser)
})

router.get("/:username", async (req, res) => {
    const user = await UserModel.findOne({ username: req.params.username })
    if (!user)
        return res.status(404).json({
            error: "User not found"
        })

    const { hashedPassword, suspensionState, followers, __v, email, ...restOfUser } = user._doc
    res.json(restOfUser)
})

export default router