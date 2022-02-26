import config from '../config.json';
import { Request } from 'express';
import { IncomingMessage } from 'http';
import { InboundSocketMessage } from './interface/ws';

const minTokenLength = 10;

const tokens: string[] = Object.values(config?.tokens);

const verifyToken = async (token?: string): Promise<boolean> => {
    if (token?.length < minTokenLength) return false;

    if (token === config?.tokens?.testing) {
        console.warn('Testing token used!');
    }

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

export const veryifyWsMessage = async (data: InboundSocketMessage) => {
    return verifyToken(data?.auth?.authorization);
};
