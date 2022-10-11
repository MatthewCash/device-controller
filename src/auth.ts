import config from '../config.json';
import { Request } from 'express';
import { IncomingMessage } from 'http';
import { setTimeout } from 'timers/promises';

import { InboundSocketMessage } from './interface/ws';

const minTokenLength = 10;

const tokens: string[] = config?.tokens;
const throttledIps = new Map<string, Date>();

const verifyToken = async (
    token: string,
    ipAddress?: string
): Promise<boolean> => {
    if (throttledIps.get(ipAddress)?.getTime() + 1000 > Date.now()) {
        await setTimeout(1000); // Should help prevent clients from spamming requests
        return false;
    }

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

    return verifyToken(token);
};

export const verifyWsConnection = async (
    req: IncomingMessage
): Promise<boolean> => {
    let token: string;

    token ??= req?.headers?.authorization;

    return verifyToken(token);
};

export const veryifyWsMessage = async (data: InboundSocketMessage) => {
    return verifyToken(data?.auth?.authorization);
};
