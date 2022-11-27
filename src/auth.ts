import { Request } from 'express';
import { IncomingMessage } from 'http';
import { setTimeout } from 'timers/promises';

import {
    DeviceControllerSocketClient,
    InboundSocketMessage
} from './interface/ws';
import { getConfig } from './config';

const minTokenLength = 10;

const throttledIps = new Map<string, Date>();

const verifyToken = async (
    token: string,
    ipAddress?: string
): Promise<boolean> => {
    if (throttledIps.get(ipAddress)?.getTime() + 1000 > Date.now()) {
        await setTimeout(1000); // Should help prevent clients from spamming requests
        return false;
    }

    const tokens = (await getConfig()).tokens;

    if (token?.length < minTokenLength || !tokens.includes(token)) {
        throttledIps.set(ipAddress, new Date());
        return false;
    }

    if (token.startsWith('testing')) {
        console.warn('Testing token used!');
    }

    return true;
};

export const verifyHttpRequest = async (req: Request): Promise<boolean> => {
    let token: string;

    token ??= req?.headers?.authorization;
    token ??= req?.body?.authorization;

    const ipAddress = (req.headers['x-real-ip'] as string) || req.ip;

    return verifyToken(token, ipAddress);
};

export const verifyWsConnection = async (
    req: IncomingMessage
): Promise<boolean> => {
    let token: string;

    token ??= req?.headers?.authorization;

    const ipAddress =
        (req.headers['x-real-ip'] as string) || req.socket.remoteAddress;

    return verifyToken(token, ipAddress);
};

export const verifyWsMessage = async (
    data: InboundSocketMessage,
    client: DeviceControllerSocketClient
) => {
    return verifyToken(data?.auth?.authorization, client.ipAddress);
};
