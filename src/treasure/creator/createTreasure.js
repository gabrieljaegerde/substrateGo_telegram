import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { generateQr } from "../../qr/generateQr.js"
import { addTreasure } from "./addTreasure.js"

const createTreasure = new MenuTemplate(async ctx => {
    ctx.session.qr = null
    var info = "Creating a Treasure involves 3 steps." +
        "\n\nStep 1: Generate a QR Code for your treasure by clicking on 'Generate QR'" +
        "\n\nStep 2: Print out the generated QR Code" + 
        "\n\nStep 3: Once you know where you want to 'hide' your treasure, add it to the world treasure map by clicking on 'Add Treasure'"
    return info
})

createTreasure.interact("1. Generate QR", "gQ", {
    do: async ctx => {
        await deleteMenuFromContext(ctx)
        generateQr(ctx)
        return true
    },
    joinLastRow: true
})

createTreasure.interact("2. Add Treasure", "aT", {
    do: async ctx => {
        await deleteMenuFromContext(ctx)
        addTreasure(ctx)
        return true
    },
    joinLastRow: true
})

const createTreasureMiddleware = new MenuMiddleware('cT/', createTreasure)

export {
    createTreasureMiddleware
}
