import { getDecoratorMetaStorage } from "../globals";
import { SearchIndexOptions } from "../types";

/**
 * TigrisSearchIndex decorator is used to mark a class as a schema/data model for Search Index.
 *
 * @param name - Name of Index
 * @param options - Search index options
 */
export function TigrisSearchIndex(name: string, options?: SearchIndexOptions): ClassDecorator {
	return function (target) {
		getDecoratorMetaStorage().indexes.push({
			indexName: name,
			target: target,
			options: options,
		});
	};
}
