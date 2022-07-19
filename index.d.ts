import type { Session } from "./src/models/Types.js"

declare global {
    namespace Express {
        interface Request {
            session?: Session | undefined;
        }
    }
}