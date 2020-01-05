declare type TParameterObject = {
	[key: string]: any
};

declare type TClassConstructor<T> = {
	new(c?: Container & any): T;
}

declare type TFactory<T> = (c?: Container & any) => T;

declare type TClassOrFactory<T> = TClassConstructor<T> | TFactory<T>;
