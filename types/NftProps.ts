import { IProperties } from "rmrk-tools/dist/tools/types";

export interface INftProps {
    block: number;
    collection: string;
    symbol: string;
    transferable: number;
    sn: string;
    metadata?: string;
    owner?: string;
    properties?: IProperties;
}