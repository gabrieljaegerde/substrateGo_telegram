import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons, deleteMenuFromContext } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import { editDescription } from "./editDescription.js"
import { editNameTreasure } from "./editNameTreasure.js"
import { editFile } from "./editFile.js"
import _ from "lodash"
import { listCreatedMiddleware } from "./listCreated.js"
import QRCode from "qrcode"
import { Markup } from "telegraf"
import fetch from 'node-fetch'
import Treasure, { ITreasure } from "../../models/treasure.js"
import Reward, { IReward } from "../../models/reward.js"

const editTreasureMenu = new MenuTemplate(async (ctx: any) => {
    botParams.db.read()
    botParams.db.chain = _.chain(botParams.db.data)
    var treasure: ITreasure = await Treasure.findOne({ _id: ctx.session.treasureId, creator: ctx.chat.id })
    var info = `Created on: ${treasure.date_of_entry.toDateString()}. `
    info += treasure.name ? `\nName: ${treasure.name}` : ""
    if (treasure.active) {
        info += `\nStatus: \u2705 (Treasure shown publicly)`
    }
    else {
        info += `\nStatus: \uD83D\uDEAB (Treasure NOT shown publicly)`
    }
    info += `\nMessage to treasure finders: ${treasure.description}`
    var allRewards: Array<IReward> = await Reward.find({ treasure_id: ctx.session.treasureId, collected: true })
    if (allRewards) {
        info += `Treasure has been collected ${allRewards.length} time(s).`
    }
    else {
        info += `This treasure has not been collected yet`
    }
    return info
})

editTreasureMenu.interact("Edit Message", "eM", {
    do: async (ctx: any) => {
        //await deleteMenuFromContext(ctx)
        var message = `Please send me the new message.`
        editDescription.replyWithMarkdown(ctx, message)
        return true
    },
    joinLastRow: true
})

editTreasureMenu.interact("Edit name", "eN", {
    do: async (ctx: any) => {
        //await deleteMenuFromContext(ctx)
        var message = `Please send me the new name.`
        editNameTreasure.replyWithMarkdown(ctx, message)
        return true
    },
    joinLastRow: true
})

editTreasureMenu.interact("\uD83D\uDDBC Edit NFT", "eNF", {
    do: async (ctx: any) => {
        //await deleteMenuFromContext(ctx)
        var message = `Please send me the new NFT file.`
        editFile.replyWithMarkdown(ctx, message)
        return true
    },
    joinLastRow: false
})

editTreasureMenu.manualRow(createBackMainMenuButtons())

export {
    editTreasureMenu
}