import Joi from "joi"

export interface PostNewSchema {
    title: string
    "tags[]": string[]
}

export const postNewSchema = Joi.object<PostNewSchema>({
    title: Joi.string().min(3).max(512).required(),
    "tags[]": Joi.array().items(Joi.string().min(3).max(50)).required(),
})

export interface PostSearchSchema {
    query: string
    skip: number
    limit: number
}

export const postSearchSchema = Joi.object<PostSearchSchema>({
    query: Joi.string().max(512).required(),
    skip: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(100).default(10),
}).options({
    allowUnknown: true
})