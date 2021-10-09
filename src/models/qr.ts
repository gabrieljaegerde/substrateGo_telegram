import mongoose, { Document } from "mongoose"

export interface IQr extends Document {
    code: string;
    creator: number;
}

const Schema = mongoose.Schema
const QrSchema = new Schema(
    {
        code: {
            type: String,
            required: true
        },
        creator: {
            type: Number,
            required: true
        }
    },
    { timestamps: true }
);
export default mongoose.model<IQr>('qr', QrSchema);