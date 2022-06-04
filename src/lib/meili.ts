import MeiliSearch from "meilisearch"

export class MeiliInit {
    private meiliSearch: MeiliSearch

    constructor(meiliSearch: MeiliSearch) {
        this.meiliSearch = meiliSearch
    }

    async getExistingIndices() {
        const allIndexes = await this.meiliSearch.getIndexes()
        const indexNames = await Promise.all(allIndexes.map(async index => (await index.getRawInfo()).name))
        return indexNames
    }

    async ensureIndices() {
        const existingIndices = await this.getExistingIndices()
        if (!existingIndices.includes("posts")) {
            console.log("MeiliSearch: `posts` index not found, creating.")
            this.createPostsIndex()
        }
    }

    async createPostsIndex() {
        await this.meiliSearch.createIndex("posts", {
            primaryKey: "_id"
        })

        setTimeout(async () => {
            const createdIndex = await this.meiliSearch.getIndex("posts")
            await createdIndex.updateSettings({
                filterableAttributes: [
                    "private",
                    "createdAt",
                    "author",
                ],
                sortableAttributes: [
                    "createdAt"
                ],
                searchableAttributes: [
                    "author",
                    "tags",
                    "title"
                ]
            })
        }, 2000) // Assume we don't need more than 2 seconds to create the index
    }
}