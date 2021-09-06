import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { editMessage } from "./editMessage.js"
import { editNameTreasure } from "./editNameTreasure.js"
import { editNFT } from "../../nft/editNFT.js"
import _ from "lodash"
import { listCreatedMiddleware } from "./listCreated.js"
import QRCode from "qrcode"
import { Markup } from "telegraf"
import fetch from 'node-fetch'

const editTreasureMenu = new MenuTemplate(async ctx => {
    botParams.db.read()
    botParams.db.chain = _.chain(botParams.db.data)
    var treasureDb = botParams.db.chain.get("treasures").find({ id: ctx.session.treasureId, creator: ctx.chat.id }).value()
    var info = `Created on: ${treasureDb.timestamp}. `
    info += treasureDb.name ? `\nName: ${treasureDb.name}` : ""
    if (treasureDb.active) {
        info += `\nStatus: \u2705 (Treasure shown publicly)`
    }
    else {
        info += `\nStatus: \uD83D\uDEAB (Treasure NOT shown publicly)`
    }
    info += `\nMessage to treasure finders: ${treasureDb.message}`
    return info
})

editTreasureMenu.interact("Edit Message", "eM", {
    do: async ctx => {
        //await deleteMenuFromContext(ctx)
        var message = `Please send me the new message.`
        editMessage.replyWithMarkdown(ctx, message)
        return true
    },
    joinLastRow: true
})

editTreasureMenu.interact("Edit name", "eN", {
    do: async ctx => {
        //await deleteMenuFromContext(ctx)
        var message = `Please send me the new name.`
        editNameTreasure.replyWithMarkdown(ctx, message)
        return true
    },
    joinLastRow: true
})

editTreasureMenu.interact("\uD83D\uDDBC Edit NFT", "eNF", {
    do: async ctx => {
        //await deleteMenuFromContext(ctx)
        var message = `Please send me the new NFT file.`
        editNFT.replyWithMarkdown(ctx, message)
        return true
    },
    joinLastRow: false
})

editTreasureMenu.manualRow(createBackMainMenuButtons())

export {
    editTreasureMenu
}