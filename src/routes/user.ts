import express from "express"
import Joi from "joi"
import UserModel from "../models/UserModel.js"
import argon2 from "argon2"
import { ulid } from "ulid"
import { requireSession } from "../middleware/auth.js"

const router = express.Router()

const registrationSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(50).not("self").required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
})

router.post("/register", async (req, res) => {
    const { error } = registrationSchema.validate(req.body)
    if (error) {
        res.status(400).json({
            error: error.details[0].message
        })
        return
    }

    if (await UserModel.findOne({ username: req.body.username }))
        return res.status(400).json({
            error: "Username already exists"
        })

    if (await UserModel.findOne({ email: req.body.email }))
        return res.status(400).json({
            error: "Email already exists"
        })

    const hash = await argon2.hash(req.body.password)

    const id = ulid()

    const user = new UserModel({
        _id: id,
        displayName: req.body.username,
        username: req.body.username.toLowerCase(),
        email: req.body.email,
        hashedPassword: hash
    })

    const result = await user.save()
    const { hashedPassword, suspensionState, followers, verified, __v, ...rest } = result._doc

    res.json(rest)
})

router.get("/self", requireSession, async (req, res) => {
    const user = await UserModel.findById((req as any).session.userId)
    if (!user)
        return res.status(404).json({
            error: "User not found — this should never happen"
        })

    const { hashedPassword, suspensionState, followers, __v, ...rest } = user._doc

    res.json(rest)
})

router.get("/:username", async (req, res) => {
    const user = await UserModel.findOne({ username: req.params.username })
    if (!user)
        return res.status(404).json({
            error: "User not found"
        })

    const { hashedPassword, suspensionState, followers, __v, email, ...rest } = user._doc
    res.json(rest)
})

export default router