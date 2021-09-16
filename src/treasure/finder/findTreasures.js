import { MenuTemplate, MenuMiddleware, createBackMainMenuButtons } from "telegraf-inline-menu"
import { botParams, getKeyboard } from "../../../config.js"
import TelegrafStatelessQuestion from "telegraf-stateless-question"
import _ from "lodash"
import { Markup } from "telegraf"
import { checkIfAlreadyCollected, howManyCollected } from "../treasureHelpers.js"

function distance(location1, location2, unit) {
    var radlat1 = Math.PI * location1.latitude / 180
    var radlat2 = Math.PI * location2.latitude / 180
    var theta = location1.longitude - location2.longitude
    var radtheta = Math.PI * theta / 180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
        dist = 1;
    }
    dist = Math.acos(dist)
    dist = dist * 180 / Math.PI
    dist = dist * 60 * 1.1515
    if (unit == "K") { dist = dist * 1.609344 }
    if (unit == "N") { dist = dist * 0.8684 }
    return dist
}

const findClosest = new TelegrafStatelessQuestion("fC", async ctx => {
    botParams.db.read()
    botParams.db.chain = _.chain(botParams.db.data)
    var treasures = botParams.db.chain.get("treasures").value()
    var message
    var nearest
    var nonCollected = treasures.filter(function(treasure) {
        return !checkIfAlreadyCollected(treasure.id, ctx.chat.id)
    })
    if (ctx.message.location) {
        nearest = nonCollected.reduce(function (prev, curr) {
            var prevDistance = distance(ctx.message.location, prev.location, "K"),
                currDistance = distance(ctx.message.location, curr.location, "K")
            return (prevDistance < currDistance) ? prev : curr
        })
        message = `The closest non-collected treasure is ` + 
            `${Math.round(distance(ctx.message.location, nearest.location, "K") * 100) / 100}km away.\n` +
            `This treasure has been collected by ${howManyCollected(nearest.id)} others so far.\n\n` +
            `Treasure '${nearest.name}' location:`
        await ctx.replyWithMarkdown(
            message,
            Markup.keyboard(getKeyboard(ctx)).resize()
        )
        await botParams.bot.telegram.sendLocation(ctx.chat.id, nearest.location.latitude, nearest.location.longitude)
    }
    else {
        message = "The location you sent me was invalid. " +
            "Please try again. Send me your location " +
            "the same way you would send your current location to your friends..."
        return findClosest.replyWithMarkdown(ctx, message)
    }
})

const findTreasures = new MenuTemplate("Would you like to see the closest treasure to you? Or rather see them all?")

findTreasures.interact("Find closest", "fClo", {
    do: async ctx => {
        var message = `Please send me your current location.`
        findClosest.replyWithMarkdown(ctx, message)
        return true
    },
    joinLastRow: true
})

findTreasures.url("See world map", "https://www.substratego.com", {
    joinLastRow: true
})

const findTreasuresMiddleware = new MenuMiddleware('fT/', findTreasures)

export {
    findTreasuresMiddleware,
    findClosest
}