import Joi from "joi"

export interface UserRegistrationBody {
    username: string
    email: string
    password: string
}

export const userRegistrationSchema = Joi.object<UserRegistrationBody>({
    username: Joi.string().alphanum().min(3).max(50).lowercase().not("self").required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
})

export interface UserModifyBody {
    displayName?: string
    description?: string
}

export const userModifySchema = Joi.object<UserModifyBody>({
    displayName: Joi.string().max(50).trim().optional(),
    description: Joi.string().allow("").max(2048).trim().optional()
})