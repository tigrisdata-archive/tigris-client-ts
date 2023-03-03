import { CollectionMetadata } from "./collection-metadata";
import { FieldMetadata } from "./field-metadata";
import { PrimaryKeyMetadata } from "./primary-key-metadata";
import { SearchIndexMetadata } from "./search-index-metadata";
import { SearchFieldMetadata } from "./search-field-metadata";

/**
 * Temporary storage for storing metadata processed by decorators. Classes can
 * be loaded in any order, schema generation cannot start until all class metadata
 * is available.
 *
 * @internal
 */
export class DecoratorMetaStorage {
	readonly collections: Map<string, CollectionMetadata> = new Map();
	readonly collectionFields: Array<FieldMetadata> = new Array<FieldMetadata>();
	readonly primaryKeys: Array<PrimaryKeyMetadata> = new Array<PrimaryKeyMetadata>();
	readonly indexes: Array<SearchIndexMetadata> = new Array<SearchIndexMetadata>();
	readonly searchFields: Array<SearchFieldMetadata> = new Array<SearchFieldMetadata>();

	getCollectionByTarget(target: Function): CollectionMetadata {
		for (const collection of this.collections.values()) {
			if (collection.target === target) {
				return collection;
			}
		}
	}

	getIndexByTarget(target: Function): SearchIndexMetadata {
		for (const index of this.indexes.values()) {
			if (index.target === target) {
				return index;
			}
		}
	}

	getCollectionFieldsByTarget(target: Function): Array<FieldMetadata> {
		return this.collectionFields.filter(function (field) {
			return field.target === target;
		});
	}

	getSearchFieldsByTarget(target: Function): Array<SearchFieldMetadata> {
		return this.searchFields.filter(function (field) {
			return field.target === target;
		});
	}

	getPKsByTarget(target: Function): Array<PrimaryKeyMetadata> {
		return this.primaryKeys.filter(function (pk) {
			return pk.target === target;
		});
	}
}
