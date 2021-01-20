import { Document, model, Schema } from 'mongoose';

declare interface SmartThingsDeviceData extends Document {
    installedAppId: string;
    locationId: string;
    authToken: string;
    refreshToken: string;
    clientId: string;
    clientSecret: string;
    config: any;
}

const schema = new Schema(
    {
        installedAppId: {
            type: String
        },
        locationId: {
            type: String
        },
        authToken: {
            type: String
        },
        refreshToken: {
            type: String
        },
        clientId: {
            type: String
        },
        clientSecret: {
            type: String
        },
        config: {
            type: Object
        }
    },
    {
        timestamps: true
    }
);

export const SmartThingsDevice = model<SmartThingsDeviceData>(
    'SmartThingsDevice',
    schema
);
