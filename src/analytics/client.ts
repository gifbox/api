import IORedis from "ioredis"

export class AnalyticsClient {
    public redis: IORedis

    constructor() {
        this.redis = new IORedis({
            host: process.env.REDIS_HOST ?? "127.0.0.1",
            port: Number(process.env.REDIS_PORT) || 6379,
            username: process.env.REDIS_USERNAME,
            password: process.env.REDIS_PASSWORD,
        })
    }

    async incrementPostViews(id: string) {
        await this.redis.incr(`posts:${id}:views`)
    }

    async fetchPostViews(id: string) {
        const views = parseInt(await this.redis.get(`posts:${id}:views`))
        return !isNaN(views) ? views : 0
    }
}