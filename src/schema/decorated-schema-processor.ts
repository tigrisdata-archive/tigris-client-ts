import { DecoratorMetaStorage } from "../decorators/metadata/decorator-meta-storage";
import { getDecoratorMetaStorage } from "../globals";
import { TigrisCollectionType, TigrisDataTypes, TigrisSchema } from "../types";

export type CollectionSchema<T extends TigrisCollectionType> = {
	name: string;
	schema: TigrisSchema<T>;
};

/** @internal */
export class DecoratedSchemaProcessor {
	private static _instance: DecoratedSchemaProcessor;
	readonly storage: DecoratorMetaStorage;

	private constructor() {
		this.storage = getDecoratorMetaStorage();
	}

	static get Instance(): DecoratedSchemaProcessor {
		if (!DecoratedSchemaProcessor._instance) {
			DecoratedSchemaProcessor._instance = new DecoratedSchemaProcessor();
		}
		return DecoratedSchemaProcessor._instance;
	}

	process(cls: new () => TigrisCollectionType): CollectionSchema<typeof cls> {
		const collection = this.storage.filterCollectionByTarget(cls);
		const schema = this.buildTigrisSchema(collection.target);
		this.addPrimaryKeys(schema, collection.target);
		return {
			name: collection.collectionName,
			schema: schema as TigrisSchema<typeof cls>,
		};
	}

	private buildTigrisSchema(from: Function): TigrisSchema<unknown> {
		const schema: TigrisSchema<unknown> = {};
		// get all top level fields matching this target
		for (const field of this.storage.filterFieldsByTarget(from)) {
			const key = field.name;
			schema[key] = { type: field.type };
			let arrayItems: Object, arrayDepth: number;

			switch (field.type) {
				case TigrisDataTypes.ARRAY:
					arrayItems =
						typeof field.embedType === "function"
							? { type: this.buildTigrisSchema(field.embedType as Function) }
							: { type: field.embedType as TigrisDataTypes };
					arrayDepth = field.arrayDepth && field.arrayDepth > 1 ? field.arrayDepth : 1;
					schema[key] = this.buildNestedArray(arrayItems, arrayDepth);
					break;
				case TigrisDataTypes.OBJECT:
					if (typeof field.embedType === "function") {
						const embedSchema = this.buildTigrisSchema(field.embedType as Function);
						// generate embedded schema as its a class
						if (Object.keys(embedSchema).length > 0) {
							schema[key] = { type: this.buildTigrisSchema(field.embedType as Function) };
						}
					}
					break;
				case TigrisDataTypes.BYTE_STRING:
				case TigrisDataTypes.STRING:
					if (field.schemaFieldOptions?.maxLength) {
						schema[key].maxLength = field.schemaFieldOptions.maxLength;
					}
					break;
			}
		}
		return schema;
	}

	private buildNestedArray(items, depth: number) {
		let head: Object, prev: Object, next: Object;
		while (depth > 0) {
			if (!head) {
				next = {};
				head = next;
			}
			next["type"] = TigrisDataTypes.ARRAY;
			next["items"] = {};
			prev = next;
			next = next["items"];
			depth -= 1;
		}
		prev["items"] = items;
		return head;
	}

	private addPrimaryKeys<T extends TigrisCollectionType>(
		targetSchema: TigrisSchema<T>,
		collectionClass: Function
	) {
		for (const pk of this.storage.filterPKsByTarget(collectionClass)) {
			targetSchema[pk.name] = {
				type: pk.type,
				primary_key: {
					order: pk.options?.order,
					autoGenerate: pk.options.autoGenerate === true,
				},
			};
		}
	}
}
