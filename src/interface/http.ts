import express from 'express';
import { verifyHttpRequest } from '../auth';
import { parseCommands } from './parser';

const httpServer = express();

httpServer.use(express.json());

export const startHttpServer = () => {
    const host = process.env.HTTP_HOST || '0.0.0.0';
    const port = Number(process.env.HTTP_PORT) || 8080;

    httpServer.listen(port, host);

    console.log(`[Ready] HTTP Server Listening on http://${host}:${port}`);
};

httpServer.post('*', async (req, res) => {
    const authorized = await verifyHttpRequest(req);

    if (!authorized) return res.status(401).send('Unauthorized');

    parseCommands(req.body);

    res.status(200).send(
        'Request Processed. No success/failure/error response is implemented currently'
    );
});
