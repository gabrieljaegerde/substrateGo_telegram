export interface INftProps {
    block: number;
    collection: string;
    name: string;
    instance: string,
    transferable: number;
    sn: string;
    metadata?: string;
    owner?: string;
}