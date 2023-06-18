export interface EventListenersInterface {
    open: Array<Function>;
    message: Array<Function>;
    error: Array<Function>;
    close: Array<Function>;
    [key: string]: Function[];
}
export interface PartialEventListenersInterface {
    open?: Array<Function>;
    message?: Array<Function>;
    error?: Array<Function>;
    close?: Array<Function>;
    [key: string]: Array<Function> | undefined;
}
