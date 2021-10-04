import { MenuTemplate, createBackMainMenuButtons } from "telegraf-inline-menu"
import { botParams } from "../../../config.js"
import _ from "lodash"
import { editTreasureMenu } from "./editTreasureMenu.js"
import { showTreasureMenu } from "./showTreasureMenu.js"
import Treasure, { ITreasure } from "../../models/treasure.js"
import Reward, { IReward } from "../../models/reward.js"

const showCreatedItem = new MenuTemplate(async (ctx: any) => {
    const treasureId = ctx.match[1]
    var treasure: ITreasure = await Treasure.findOne({ _id: treasureId, creator: ctx.chat.id })
    ctx.session.treasureId = treasureId
    var info = `Created on: ${treasure.date_of_entry.toDateString()}. `
    info += treasure.name ? `\nName: ${treasure.name}` : ""
    if (treasure.active) {
        info += `\nStatus: \u2705 (Treasure shown publicly)`
    }
    else {
        info += `\nStatus: \uD83D\uDEAB (Treasure NOT shown publicly)`
    }
    info += `\nMessage to treasure finders: ${treasure.description}\n\n`
    var allRewards: Array<IReward> = await Reward.find({ treasure_id: ctx.session.treasureId, collected: true })
    if (allRewards) {
        info += `Treasure has been collected ${allRewards.length} time(s).`
    }
    else {
        info += `This treasure has not been collected yet`
    }
    //info += `\nLocation Coordinates: \n   lat: ${treasure.location.latitude}\n   long: ${treasure.location.longitude}`
    return info
})

showCreatedItem.submenu("Edit Treasure", "et", editTreasureMenu)

showCreatedItem.submenu("Show Treasure Details", "std", showTreasureMenu)

showCreatedItem.toggle(async (ctx) => {
    let treasure: ITreasure = await Treasure.findOne({ _id: ctx.session.treasureId, creator: ctx.chat.id })
    return treasure.active ? "Activated" : "Deactivated"
},
    'a',
    {
        set: async (ctx, choice) => {
            const treasureId = ctx.match[1]
            let treasure: ITreasure = await Treasure.findOne({ _id: treasureId, creator: ctx.chat.id })
            treasure.active = choice
            await treasure.save()
            return true
        },
        isSet: async (ctx) => {
            const treasureId = ctx.match[1]
            let treasure: ITreasure = await Treasure.findOne({ _id: treasureId, creator: ctx.chat.id })
            return treasure.active === true
        }
    })

showCreatedItem.manualRow(createBackMainMenuButtons())

export {
    showCreatedItem
}
