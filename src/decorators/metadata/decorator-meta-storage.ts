import { CollectionMetadata } from "./collection-metadata";
import { FieldMetadata } from "./field-metadata";
import { PrimaryKeyMetadata } from "./primary-key-metadata";
import { IndexMetadata } from "./index-metadata";
import { IndexFieldMetadata } from "./index-field-metadata";

/**
 * Temporary storage for storing metadata processed by decorators. Classes can
 * be loaded in any order, schema generation cannot start until all class metadata
 * is available.
 *
 * @internal
 */
export class DecoratorMetaStorage {
	readonly collections: Map<string, CollectionMetadata> = new Map();
	readonly indexes: Array<IndexMetadata> = new Array<IndexMetadata>();
	readonly fields: Array<FieldMetadata> = new Array<FieldMetadata>();
	readonly indexFields: Array<IndexFieldMetadata> = new Array<IndexFieldMetadata>();
	readonly primaryKeys: Array<PrimaryKeyMetadata> = new Array<PrimaryKeyMetadata>();

	getCollectionByTarget(target: Function): CollectionMetadata {
		for (const collection of this.collections.values()) {
			if (collection.target === target) {
				return collection;
			}
		}
	}

	getIndexByTarget(target: Function): IndexMetadata {
		for (const index of this.indexes.values()) {
			if (index.target === target) {
				return index;
			}
		}
	}

	getFieldsByTarget(target: Function): Array<FieldMetadata> {
		return this.fields.filter(function (field) {
			return field.target === target;
		});
	}

	getIndexFieldsByTarget(target: Function): Array<IndexFieldMetadata> {
		return this.indexFields.filter(function (field) {
			return field.target === target;
		});
	}

	getPKsByTarget(target: Function): Array<PrimaryKeyMetadata> {
		return this.primaryKeys.filter(function (pk) {
			return pk.target === target;
		});
	}
}
