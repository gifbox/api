import express from "express"
import Joi from "joi"
import UserModel from "../models/UserModel.js"
import SessionModel from "../models/SessionModel.js"
import argon2 from "argon2"
import { ulid } from "ulid"
import { User } from "../models/Types.js"
import { nanoid } from "nanoid"
import { requireSession } from "../middleware/auth.js"

const router = express.Router()

const createSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    sessionName: Joi.string().min(3).max(50).required(),
})

router.post("/create", async (req, res) => {
    const { error } = createSchema.validate(req.body)
    if (error)
        return res.status(400).json({
            error: error.details[0].message
        })

    const user = await UserModel.findOne({ email: req.body.email }) as User
    if (!user)
        return res.status(400).json({
            error: "Invalid email or password"
        })

    const passwordMatches = await argon2.verify(user.hashedPassword, req.body.password)
    if (!passwordMatches)
        return res.status(400).json({
            error: "Invalid email or password"
        })

    const sessionName = req.body.sessionName
    const token = nanoid(64)

    const session = new SessionModel({
        _id: ulid(),
        sessionName,
        token,
        userId: user._id,
    })

    await session.save()

    res.json({
        sessionName,
        token,
    })
})

router.get("/sessions", requireSession, async (req, res) => {
    const sessions = await SessionModel.find({ userId: (req as any).session.userId }, { __v: 0, token: 0, userId: 0 })
    res.json(sessions)
})


router.get("/current", requireSession, async (req, res) => {
    const session = await SessionModel.findOne({ _id: (req as any).session._id }, { __v: 0 })
    res.json(session)
})

const deleteSchema = Joi.object({
    session: Joi.string().required(),
})

router.post("/logout", requireSession, async (req, res) => {
    const { error } = deleteSchema.validate(req.body)
    if (error)
        return res.status(400).json({
            error: error.details[0].message
        })

    const session = await SessionModel.findOne({ _id: req.body.session })
    if (!session)
        return res.status(400).json({
            error: "Invalid session"
        })

    await session.remove()

    res.json({
        success: true,
    })
})

const renameSchema = Joi.object({
    session: Joi.string().required(),
    sessionName: Joi.string().min(3).max(50).required(),
})

router.post("/rename", requireSession, async (req, res) => {
    const { error } = renameSchema.validate(req.body)
    if (error)
        return res.status(400).json({
            error: error.details[0].message
        })

    const session = await SessionModel.findOne({ _id: req.body.session })
    if (!session)
        return res.status(400).json({
            error: "Invalid session"
        })

    session.sessionName = req.body.sessionName
    await session.save()

    res.json({
        success: true,
    })
})

export default router