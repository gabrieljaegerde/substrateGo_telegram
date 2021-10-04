import mongoose from "mongoose"

export interface ILocation {
    latitude: string,
    longitude: string
}

const Schema = mongoose.Schema
export const LocationSchema = new Schema({
    latitude: {
        type: String,
        required: true
    },
    longitude: {
        type: String,
        required: true
    }
});
export default mongoose.model('location', LocationSchema);