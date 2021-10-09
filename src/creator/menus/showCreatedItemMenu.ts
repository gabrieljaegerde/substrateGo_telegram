import { MenuTemplate, createBackMainMenuButtons, MenuMiddleware } from "grammy-inline-menu"
import { editTreasureMenu } from "./editTreasureMenu.js"
import { showTreasureMenu } from "./showTreasureMenu.js"
import Treasure, { ITreasure } from "../../models/treasure.js"
import Reward, { IReward } from "../../models/reward.js"
import { CustomContext } from "../../../types/CustomContext.js"

export const renderInfo = async (ctx: CustomContext, treasureId: string): Promise<string> => {
    const session = await ctx.session
    const treasure: ITreasure = await Treasure.findOne({ _id: treasureId, creator: ctx.chat.id })
    session.treasureId = treasureId
    let info = treasure.name ? `\n_Name_: *${treasure.name}*` : ""
    info += `\n_Created on_: *${treasure.createdAt.toDateString()}*`
    if (treasure.active) {
        info += `\n_Status_: *\u2705 (Treasure shown publicly)*`
    }
    else {
        info += `\n_Status_: *\uD83D\uDEAB (Treasure NOT shown publicly)*`
    }
    info += `\n_Description_: *${treasure.description}*`
    info += `\n_Hint_: *${treasure.hint}*\n\n`
    const allRewards: Array<IReward> = await Reward.find({ treasureId: session.treasureId, collected: true })
    if (allRewards.length > 0) {
        info += `_Treasure has been collected_ *${allRewards.length}* _time(s)._`
    }
    else {
        info += `_This treasure has not been collected yet._`
    }
    //info += `\nLocation Coordinates: \n   lat: ${treasure.location.latitude}\n   long: ${treasure.location.longitude}`
    return info
}

export const showCreatedItem = new MenuTemplate(async (ctx: CustomContext) => {
    const treasureId = ctx.match[1]
    const text = await renderInfo(ctx, treasureId)
    return { text, parse_mode: "Markdown" }
})

showCreatedItem.submenu("Edit Treasure", "et", editTreasureMenu)

showCreatedItem.submenu("Show Treasure Details", "std", showTreasureMenu)

showCreatedItem.toggle(async (ctx) => {
    const session = await ctx.session
    const treasure: ITreasure = await Treasure.findOne({ _id: session.treasureId, creator: ctx.chat.id })
    return treasure.active ? "Activated" : "Deactivated"
},
    'a',
    {
        set: async (ctx, choice) => {
            const treasureId = ctx.match[1]
            const treasure: ITreasure = await Treasure.findOne({ _id: treasureId, creator: ctx.chat.id })
            treasure.active = choice
            await treasure.save()
            return true
        },
        isSet: async (ctx) => {
            const treasureId = ctx.match[1]
            const treasure: ITreasure = await Treasure.findOne({ _id: treasureId, creator: ctx.chat.id })
            return treasure.active === true
        }
    })

showCreatedItem.manualRow(createBackMainMenuButtons())

