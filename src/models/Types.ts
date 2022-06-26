export type SuspensionState = {
    _id: string,
    expirationDate: Date,
}

export type User = {
    _id: string,
    displayName: string,
    username: string,
    email: string,
    hashedPassword: string,
    description: string,
    verified: boolean,
    suspensionState: SuspensionState | null,
    avatar: FileInformation | null,
    followers: string[],
}

export type FileInformation = {
    _id: string,
    fileName: string,
    extension: string,
    bucket: string,
    mimeType: string,
    uploadDate: Date,
    author: string,
    size: number,
    sha512: string,
}

export type Session = {
    _id: string,
    sessionName: string,
    token: string,
    userId: string,
}