import { SessionData } from './SessionData'
import { Api, Bot, Context, lazySession, LazySessionFlavor, GrammyError, HttpError } from "grammy"
import { hydrateFiles, FileFlavor, FileApiFlavor } from "@grammyjs/files";

export type CustomContext = Context & LazySessionFlavor<SessionData> & FileFlavor<Context> & FileApiFlavor<Api>;



