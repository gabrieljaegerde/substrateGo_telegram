import { NFTMetadata } from 'rmrk-tools/dist/classes/nft';
import pLimit from 'p-limit';
import { Readable } from 'stream';
import fs from 'fs';
// @ts-ignore
import pinataSDK, { PinataOptions, PinataPinOptions } from '@pinata/sdk';
import { sleep } from './utils.js';
import { botParams } from '../config.js';

const defaultOptions: Partial<PinataPinOptions> = {
    pinataOptions: {
        cidVersion: 1,
    },
};

const fsPromises = fs.promises;
export type StreamPinata = Readable & {
    path?: string;
};

const limit = pLimit(1);

const pinFileStreamToIpfs = async (file: StreamPinata, name?: string) => {
    const options = { ...defaultOptions, pinataMetadata: { name } };
    const result = await botParams.pinata.pinFileToIPFS(file, options);
    return result.IpfsHash;
};

export const uploadAndPinIpfsMetadata = async (metadataFields: NFTMetadata): Promise<string> => {
    const options = {
        ...defaultOptions,
        pinataMetadata: { name: metadataFields.name },
    };
    try {
        const metadata = { ...metadataFields };
        const metadataHashResult = await botParams.pinata.pinJSONToIPFS(metadata, options);
        return `ipfs://ipfs/${metadataHashResult.IpfsHash}`;
    } catch (error) {
        return '';
    }
};

export const pinSingleMetadataFromDir = async (
    dir: string,
    path: string,
    name: string,
    metadataBase: Partial<NFTMetadata>,
) => {
    try {
        const imageFile = await fsPromises.readFile(`${process.cwd()}${dir}/${path}`);
        if (!imageFile) {
            throw new Error('No image file');
        }

        const stream: StreamPinata = Readable.from(imageFile);
        stream.path = path;

        const imageCid = await pinFileStreamToIpfs(stream, name);
        console.log(`NFT ${path} IMAGE CID: `, imageCid);
        const metadata: NFTMetadata = { ...metadataBase, name, image: `ipfs://ipfs/${imageCid}` };
        const metadataCid = await uploadAndPinIpfsMetadata(metadata);
        await sleep(500);
        console.log(`NFT ${name} METADATA: `, metadataCid);
        return metadataCid;
    } catch (error) {
        console.log(error);
        console.log(JSON.stringify(error));
        return '';
    }
};

export const pinSingleMetadata = async (
    buffer: Buffer,
    name: string,
    metadataBase: Partial<NFTMetadata>,
) => {
    try {
        if (!buffer) {
            throw new Error('No image file');
        }        
        const stream: StreamPinata = Readable.from(buffer);
        stream.path = "treasure_file.png";
        const imageCid = await pinFileStreamToIpfs(stream, name);
        console.log(`NFT ${name} IMAGE CID: `, imageCid);
        const metadata: NFTMetadata = { ...metadataBase, name, image: `ipfs://ipfs/${imageCid}` };
        const metadataCid = await uploadAndPinIpfsMetadata(metadata);
        await sleep(500);
        console.log(`NFT ${name} METADATA: `, metadataCid);
        return metadataCid;
    } catch (error) {
        console.log(error);
        console.log(JSON.stringify(error));
        return '';
    }
};

export const pinSingleMetadataWithoutFile = async (
    imageCid: string,
    name: string,
    metadataBase: Partial<NFTMetadata>,
) => {
    try {
        const metadata: NFTMetadata = { ...metadataBase, name, image: `ipfs://ipfs/${imageCid}` };
        const metadataCid = await uploadAndPinIpfsMetadata(metadata);
        await sleep(500);
        console.log(`NFT ${name} METADATA: `, metadataCid);
        return metadataCid;
    } catch (error) {
        console.log(error);
        console.log(JSON.stringify(error));
        return '';
    }
};

export const pinSingleFile = async (
    buffer: Buffer,
    name: string,
) => {
    try {
        if (!buffer) {
            throw new Error('No image file');
        }        
        const stream: StreamPinata = Readable.from(buffer);
        stream.path = "treasure_file.png";
        const imageCid = await pinFileStreamToIpfs(stream, name);
        console.log(`NFT ${name} IMAGE CID: `, imageCid);
        return imageCid;
    } catch (error) {
        console.log(error);
        console.log(JSON.stringify(error));
        return '';
    }
};