import Joi from "joi"

export interface SessionCreateSchema {
    email: string
    password: string
    sessionName: string
}

export const sessionCreateSchema = Joi.object<SessionCreateSchema>({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    sessionName: Joi.string().min(3).max(50).required(),
})

export interface SessionModifySchema {
    name: string
}

export const sessionModifySchema = Joi.object<SessionModifySchema>({
    name: Joi.string().min(3).max(50).trim().optional(),
})