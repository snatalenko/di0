import { Container } from "./Container";

export type TClassConstructor<T> = {
	new(...args: any[]): T;
}

export type TFactory<T, TContainerInterface> =
	(containerArg: Container & TContainerInterface) => T;

export type TClassOrFactory<T, TContainerInterface> =
	TClassConstructor<T> |
	TFactory<T, TContainerInterface>;
