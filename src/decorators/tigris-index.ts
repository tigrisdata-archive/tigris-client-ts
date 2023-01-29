import { getDecoratorMetaStorage } from "../globals";

export function TigrisIndex(name: string): ClassDecorator {
	return function (target) {
		getDecoratorMetaStorage().indices.push({
			indexName: name,
			target: target,
		});
	};
}
