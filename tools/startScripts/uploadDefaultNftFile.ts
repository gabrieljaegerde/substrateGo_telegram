import { pinSingleFile } from "../pinataUtils.js";
import fs from 'fs';

export const uploadDefaultNftFile = async () => {
  try {
    const dir = "/assets";
    const path = "defaultNFTFile.png";
    const imageFile = await fs.promises.readFile(`${process.cwd()}${dir}/${path}`);
    const fileCid = await pinSingleFile(imageFile, `DefaultFile`, "defaultNFTFile.png");
    console.log("defaultCid", fileCid);
  } catch (error: any) {
    console.error(error);
  }
};