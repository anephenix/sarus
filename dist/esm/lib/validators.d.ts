import type { GenericFunction } from "./types.js";
export interface EventListenersInterface {
    open: GenericFunction[];
    message: GenericFunction[];
    error: GenericFunction[];
    close: GenericFunction[];
    [key: string]: GenericFunction[];
}
export interface PartialEventListenersInterface {
    open?: GenericFunction[];
    message?: GenericFunction[];
    error?: GenericFunction[];
    close?: GenericFunction[];
    [key: string]: GenericFunction[] | undefined;
}
