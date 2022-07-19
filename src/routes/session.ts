import express from "express"
import UserModel from "../models/UserModel.js"
import SessionModel from "../models/SessionModel.js"
import argon2 from "argon2"
import { ulid } from "ulid"
import { User } from "../models/Types.js"
import { nanoid } from "nanoid"
import { requireSession } from "../middleware/auth.js"
import { sessionCreateSchema, sessionModifySchema } from "./session.schemas.js"

const router = express.Router()

router.post("/create", async (req, res) => {
    const { error, value } = sessionCreateSchema.validate(req.body)
    if (error)
        return res.status(400).json({
            error: error.details[0].message
        })

    const { email, password, sessionName } = value

    const user = await UserModel.findOne({ email }) as User
    if (!user)
        return res.status(400).json({
            error: "Invalid email or password"
        })

    const passwordMatches = await argon2.verify(user.hashedPassword, password)
    if (!passwordMatches)
        return res.status(400).json({
            error: "Invalid email or password"
        })

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
    const sessions = await SessionModel.find({ userId: req.session.userId }, { __v: 0, token: 0, userId: 0 })
    res.json(sessions)
})

router.get("/current", requireSession, async (req, res) => {
    const session = await SessionModel.findOne({ _id: req.session._id }, { __v: 0 })
    res.json(session)
})

router.delete("/:id", requireSession, async (req, res) => {
    const session = await SessionModel.findOne({
        _id: req.params.id,
        userId: req.session.userId
    })
    if (!session)
        return res.status(400).json({
            error: "Invalid session"
        })

    await session.remove()

    res.json({
        success: true,
    })
})

router.patch("/:id", requireSession, async (req, res) => {
    const { error, value } = sessionModifySchema.validate(req.body)
    if (error)
        return res.status(400).json({
            error: error.details[0].message
        })

    const session = await SessionModel.findOne({
        _id: req.params.id,
        userId: req.session.userId
    })

    if (!session)
        return res.status(400).json({
            error: "Invalid session"
        })

    if (typeof value.name === "string") {
        session.sessionName = value.name
    }

    await session.save()

    res.json({
        success: true,
    })
})

export default router