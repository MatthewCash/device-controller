import config from './config.json';
import { Request } from 'express';
import { IncomingMessage } from 'http';
import { RawData } from 'ws';

const minTokenLength = 10;

const tokens: string[] = Object.values(config.tokens);

const verifyToken = async (token?: string): Promise<boolean> => {
    if (token?.length < minTokenLength) return false;

    return tokens.includes(token);
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

export const veryifyWsMessage = async (message: RawData) => {
    let data;

    try {
        data = JSON.parse(message.toString());
    } catch {
        throw new Error('Invalid JSON');
    }

    return verifyToken(data?.authorization);
};
