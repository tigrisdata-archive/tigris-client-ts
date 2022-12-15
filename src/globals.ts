import { DecoratorMetaStorage } from "./decorators/metadata/decorator-meta-storage";

export function getDecoratorMetaStorage(): DecoratorMetaStorage {
	if (!global.annotationCache) {
		global.annotationCache = new DecoratorMetaStorage();
	}

	return global.annotationCache;
}
