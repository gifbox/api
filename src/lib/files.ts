import minio from "minio"
import dotenv from "dotenv"

dotenv.config()

export const minioClient = new minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: Number(process.env.MINIO_PORT),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
})

const makeBucket = async (bucketName: string) => {
    try {
        await minioClient.makeBucket(bucketName, process.env.MINIO_REGION)
        console.log(`Initialized previously non-existant bucket ${bucketName} on Minio/S3`)
    } catch (err) {
        if (err.code === "BucketAlreadyOwnedByYou") {
            console.log(`Bucket ${bucketName} already exists on Minio/S3, but creation was attempted. This is a bug.`)
        } else {
            console.error(err)
        }
    }
}

export const ensureBuckets = async () => {
    try {
        const exists = await minioClient.bucketExists("gifbox")
        if (!exists) {
            await makeBucket("gifbox")
        }
    } catch (error) {
        if (error.code === "NoSuchBucket") {
            await makeBucket("gifbox")
        }
    }
}

export const putFile = (buffer: Buffer, filename: string, type: string) => {
    return new Promise<void>((resolve, reject) => {
        minioClient.putObject("gifbox", `${type}/${filename}`, buffer, (error) => {
            if (error) {
                reject(error)
            } else {
                resolve()
            }
        })
    })
}