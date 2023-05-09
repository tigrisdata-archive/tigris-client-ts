import { getDecoratorMetaStorage } from "../globals";

/**
 * TigrisCollection decorator is used to mark a class as a Collection's schema/data model.
 *
 * @param name - Name of collection
 */
export function TigrisCollection(name: string): ClassDecorator {
	return function (target) {
		getDecoratorMetaStorage().collections.set(name, {
			collectionName: name,
			target: target,
		});
	};
}
