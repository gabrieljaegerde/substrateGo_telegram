import _ from "lodash"
import { botParams } from "../../config.js"
import { balanceToString } from "../../tools/typeParser.js"
import Jimp from "jimp"
import jsQR from "jsqr"
import QrCode from "qrcode-reader"

async function scan(url) {
  try {
    var image = await Jimp.read(url)
    var qr = new QrCode()
    const value = await new Promise((resolve, reject) => {
      qr.callback = (err, v) => err != null ? reject(err) : resolve(v);
      qr.decode(image.bitmap);
    })
    return value.result
  }
  catch (err) {
    return err
  }
}

async function decorateQr(url) {
  try {
    var canvas = await Jimp.read("sticker.png")
    await canvas.resize(300, Jimp.AUTO)
    console.log("canvas: ", canvas)
    var qr = await Jimp.read(url)
    var logo = await Jimp.read(`${botParams.settings.network.name}.png`)
    logo.resize(100, Jimp.AUTO);
    const font = await Jimp.loadFont(Jimp.FONT_SANS_12_BLACK)
    canvas.composite( qr, 60, 95 )
    canvas.composite( logo, 5, 270 )
    let buffer = await canvas.getBufferAsync(Jimp.MIME_PNG)
    return buffer
  }
  catch (err) {
    return err
  }
}

function checkQr(result) {
  const re = `/^https:\/\/t.me\/${botParams.settings.botUsername}\?start=[a-zA-Z0-9]{${botParams.settings.codeLength}}$/`

}

export {
  scan,
  decorateQr
}
