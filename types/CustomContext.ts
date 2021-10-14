import { SessionData } from './SessionData';
import { Api, Context, LazySessionFlavor } from "grammy";
import { FileFlavor, FileApiFlavor } from "@grammyjs/files";

export type CustomContext = Context
    & LazySessionFlavor<SessionData>
    & FileFlavor<Context>
    & FileApiFlavor<Api>;



