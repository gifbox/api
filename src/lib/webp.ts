import ffmpegPath from "ffmpeg-static"
import ffmpeg from "fluent-ffmpeg"
import temp from "temp"
import fs from "fs/promises"

temp.track()

export const gifToWebp = async (gif: Buffer) => {
    const tempDir = temp.mkdirSync()
    const tempFile = `${tempDir}/temp.gif`
    const tempWebp = `${tempDir}/temp.webp`

    await fs.writeFile(tempFile, gif)

    return new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempFile)
            .setFfmpegPath(ffmpegPath)
            .addOption([
                "-vcodec", "webp",
                "-loop", "0",
                "-pix_fmt", "yuv420p",
            ])
            .output(tempWebp)
            .on("end", async () => {
                const webp = await fs.readFile(tempWebp)
                temp.cleanupSync()
                resolve(webp)
            })
            .on("error", reject)
            .run()
    })
}