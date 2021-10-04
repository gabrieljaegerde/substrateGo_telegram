import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { generateQr } from "../../qr/generateQr.js"
import { uploadTreasure } from "./addTreasure.js"
import { createTreasureGuideMiddleware } from "./createTreasureGuide.js"

const createTreasure = new MenuTemplate(async (ctx: any) => {
    ctx.session.treasure = null
    console.log("ctx3", ctx)
    var info = "Creating a Treasure involves 3 steps." +
        "\n\nStep 1: Generate a QR Code for your treasure by clicking on 'Generate QR'" +
        "\n\nStep 2: Print out the generated QR Code" +
        "\n\nStep 3: Once you know where you want to 'hide' your treasure, add it to the world treasure map by clicking on 'Add Treasure'"
    return info
})

createTreasure.interact("1. Generate QR", "gq", {
    do: async (ctx: any) => {
        await deleteMenuFromContext(ctx)
        generateQr(ctx)
        return true
    },
    joinLastRow: true
})

createTreasure.interact("2. Add Treasure", "at", {
    do: async (ctx: any) => {
        console.log("ctx2", ctx)
        await deleteMenuFromContext(ctx)
        ctx.session.guideStep = 1
        ctx.session.guideMessage = await createTreasureGuideMiddleware.replyToContext(ctx)
        var reply = `Please send me a picture of the QR Code you wish to add.`
        console.log("ctx", ctx)
        uploadTreasure.replyWithMarkdown(ctx, reply)
        return false
    },
    joinLastRow: true
})

const createTreasureMiddleware = new MenuMiddleware('ct/', createTreasure)

export {
    createTreasureMiddleware
}
