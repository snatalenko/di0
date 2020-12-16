import { Container } from "./Container";

export type TClassConstructor<T> = {
	new(c?: Container & any): T;
}

export type TFactory<T> = (c?: Container & any) => T;

export type TClassOrFactory<T> = TClassConstructor<T> | TFactory<T>;
