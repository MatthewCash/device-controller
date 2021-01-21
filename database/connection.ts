import { connect } from 'mongoose';

export const connectDatabase = async () => {
    await connect('mongodb://127.0.0.1/device-controller', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log('Database Connected!');
};
