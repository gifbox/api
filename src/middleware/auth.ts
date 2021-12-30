import SessionModel from "../models/SessionModel.js"

export const requireSession = (req, res, next) => {
    if (!req.headers.authorization)
        return res.status(401).json({
            error: "Missing authorization header"
        })

    const [type, token] = req.headers.authorization.split(" ")
    switch (type) {
        case "Bearer":
            SessionModel.findOne({ token })
                .then(session => {
                    if (!session)
                        return res.status(401).json({
                            error: "Invalid token"
                        })

                    req.session = session
                    next()
                }).catch(error => {
                    res.status(500).json({
                        error: error.message
                    })
                })
            break
        default:
            res.status(401).json({
                error: "Invalid authorization header"
            })
    }
}