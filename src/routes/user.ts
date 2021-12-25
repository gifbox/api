import express from "express"
import Joi from "joi"
import UserModel from "../models/UserModel.js"
import argon2 from "argon2"
import { ulid } from "ulid"

const router = express.Router()

const registrationSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(50).required(),
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
        username: req.body.username,
        email: req.body.email,
        hashedPassword: hash
    })

    const result = await user.save()
    const { hashedPassword, suspensionState, followers, verified, __v, ...rest } = result._doc

    res.json(rest)
})

export default router