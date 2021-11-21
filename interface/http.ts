import express from 'express';
import { parseMessage } from './parser';

const httpServer = express();

httpServer.use(express.json());

export const startHttpServer = () => {
    const host = process.env.HOST || '0.0.0.0';
    const port = Number(process.env.PORT) || 3000;

    httpServer.listen(port, host);

    console.log(`[Ready] HTTP Server Listening on http://${host}:${port}`);
};

httpServer.post('*', (req, res) => {
    const data = req.body;

    parseMessage(data);
});
