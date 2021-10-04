import mongoose, {Document} from "mongoose"

export interface IQr extends Document{
    code: string,
    creator: number,
    date_of_entry: Date
}

const Schema = mongoose.Schema
const QrSchema = new Schema({
    code: {
        type: String,
        required: true
    },
    creator: {
        type: Number,
        required: true
    },
    date_of_entry: {
        type: Date,
        default: Date.now()
    }
});
export default mongoose.model<IQr>('qr', QrSchema);