import { MenuTemplate, createBackMainMenuButtons } from "grammy-inline-menu"
import { editDescription } from "../editDescription.js"
import { editNameTreasure } from "../editNameTreasure.js"
import { editFile } from "../editFile.js"
import { renderInfo } from "./showCreatedItemMenu.js"
import { editHint } from "../editHint.js"
import { CustomContext } from "../../../types/CustomContext.js"

const editTreasureMenu = new MenuTemplate(async (ctx: CustomContext) => {
    const session = await ctx.session
    const text = await renderInfo(ctx, session.treasureId)
    return { text, parse_mode: "Markdown" }
})

editTreasureMenu.interact("Edit Description", "ed", {
    do: async (ctx: CustomContext) => {
        //await deleteMenuFromContext(ctx)
        const message = `Please send me the new description.`
        editDescription.replyWithMarkdown(ctx, message)
        return true
    },
    joinLastRow: true
})

editTreasureMenu.interact("Edit name", "en", {
    do: async (ctx: CustomContext) => {
        //await deleteMenuFromContext(ctx)
        const message = `Please send me the new name.`
        editNameTreasure.replyWithMarkdown(ctx, message)
        return true
    },
    joinLastRow: true
})

editTreasureMenu.interact("\uD83D\uDDBC Edit NFT", "enf", {
    do: async (ctx: CustomContext) => {
        //await deleteMenuFromContext(ctx)
        const message = `Please send me the new NFT file.\n\n` +
            `_Warning! Any file uploaded will be stored on the blockchain ` +
            `and_ *CANNOT* _be removed. Please ensure you don't upload any private ` +
            `files._`
        editFile.replyWithMarkdown(ctx, message)
        return true
    },
    joinLastRow: false
})

editTreasureMenu.interact("Edit Hint", "eh", {
    do: async (ctx: CustomContext) => {
        //await deleteMenuFromContext(ctx)
        const message = `Please send me the new hint message.`
        editHint.replyWithMarkdown(ctx, message)
        return true
    },
    joinLastRow: false
})

editTreasureMenu.manualRow(createBackMainMenuButtons())

export {
    editTreasureMenu
}