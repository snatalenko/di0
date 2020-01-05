declare type TParameterObject = { [key: string]: any };

declare type TClassConstructor<T> = {
	new(c?: Container & TParameterObject): T;
}

declare type TFactory<T> = (c?: Container & TParameterObject) => T;

declare type TClassOrFactory<T> = TClassConstructor<T> | TFactory<T>;
