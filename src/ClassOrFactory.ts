import type { Container } from "./Container";

export type ClassConstructor<T> = {
	new(...args: any[]): T;
}

export type Factory<T, TContainerInterface> =
	(containerArg: Container & TContainerInterface) => T;

export type ClassOrFactory<T, TContainerInterface> =
	ClassConstructor<T> |
	Factory<T, TContainerInterface>;
