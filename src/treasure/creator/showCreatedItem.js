import { MenuTemplate, createBackMainMenuButtons } from "telegraf-inline-menu"
import { botParams } from "../../../config.js"
import _ from "lodash"
import { editTreasureMenu } from "./editTreasureMenu.js"
import { showTreasureMenu } from "./showTreasureMenu.js"


const showCreatedItem = new MenuTemplate(async ctx => {
    const qrId = ctx.match[1]
    botParams.db.read()
    botParams.db.chain = _.chain(botParams.db.data)
    var treasureDb = botParams.db.chain.get("qrs").find({ id: qrId, creator: ctx.chat.id }).value()
    ctx.session.treasureId = qrId
    var info = `Created on: ${treasureDb.timestamp}. `
    info += treasureDb.name ? `\nName: ${treasureDb.name}` : ""
    if (treasureDb.active) {
        info += `\nStatus: \u2705 (Treasure shown publicly)`
    }
    else {
        info += `\nStatus: \uD83D\uDEAB (Treasure NOT shown publicly)`
    }
    info += `\nMessage to treasure finders: ${treasureDb.message}`
    //info += `\nLocation Coordinates: \n   lat: ${treasureDb.location.latitude}\n   long: ${treasureDb.location.longitude}`
    return info
})

showCreatedItem.submenu("Edit Treasure", "eT", editTreasureMenu)

showCreatedItem.submenu("Show Treasure Details", "sTD", showTreasureMenu)

/*
showCreatedItem.interact("Edit Treasure", "eT", {
    do: ctx => {
        ctx.session.editMode = true
        ctx.session.showMode = false
        return true
    },
    joinLastRow: false,
    hide: ctx => {
        return ctx.session.editMode === true
    }
})

showCreatedItem.interact("Show Treasure Details", "sTD", {
    do: ctx => {
        ctx.session.editMode = false
        ctx.session.showMode = true
        return true
    },
    joinLastRow: false,
    hide: ctx => {
        return ctx.session.showMode === true
    }
})*/

showCreatedItem.toggle(ctx => {
    botParams.db.read()
    botParams.db.chain = _.chain(botParams.db.data)
    let treasureDb = botParams.db.chain.get("qrs").find({ id: ctx.session.treasureId, creator: ctx.chat.id }).value()
    return treasureDb.active ? "Activated" : "Deactivated"
},
    'a',
    {
        set: (ctx, choice) => {
            const qrId = ctx.match[1]
            botParams.db.read()
            botParams.db.chain = _.chain(botParams.db.data)
            botParams.db.chain.get("qrs").find({ id: qrId, creator: ctx.chat.id }).assign({ active: choice }).value()
            botParams.db.write()
            return true
        },
        isSet: ctx => {
            const qrId = ctx.match[1]
            botParams.db.read()
            botParams.db.chain = _.chain(botParams.db.data)
            let treasureDb = botParams.db.chain.get("qrs").find({ id: qrId, creator: ctx.chat.id }).value()
            return treasureDb.active === true
        }
    })

showCreatedItem.manualRow(createBackMainMenuButtons())

export {
    showCreatedItem
}
