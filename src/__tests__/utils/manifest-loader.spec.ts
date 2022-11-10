import { canBeSchema, loadTigrisManifest, TigrisManifest } from "../../utils/manifest-loader";
import { TigrisDataTypes } from "../../types";
import { TigrisFileNotFoundError, TigrisMoreThanOneSchemaDefined } from "../../error";

describe("Manifest loader", () => {

	it("generates manifest from file system", () => {
		const schemaPath = process.cwd() + "/src/__tests__/data/models";
		const manifest: TigrisManifest = loadTigrisManifest(schemaPath);
		expect(manifest).toHaveLength(3);

		const expected: TigrisManifest = [{
			"dbName": "catalog",
			"collections": [{
				"collectionName": "products",
				"schema": {
					"id": { "type": "int32", "primary_key": { "order": 1, "autoGenerate": true } },
					"title": { "type": "string" },
					"description": { "type": "string" },
					"price": { "type": "number" }
				},
				"schemaName": "ProductSchema"
			}]
		},
			{	"dbName": "embedded",
				"collections": [{
					"collectionName": "users",
					"schemaName": "userSchema",
					"schema": {
						"created": { "type": "date-time" },
						"email": { "type": "string" },
						"identities": {
							"type": "array",
							"items": {
								"type": {
									"connection": { "type": "string" },
									"isSocial": { "type": "boolean" },
									"provider": { "type": "string" },
									"user_id": { "type": "string" }
								}
							}
						},
						"name": { "type": "string" },
						"picture": { "type": "string" },
						"stats": {
							"type": {
								"loginsCount": { "type": "int64" }
							}
						},
						"updated": { "type": "date-time" },
						"user_id": { "type": "string", "primary_key": { "order": 1 } }
					}
				}]},
			{ "dbName": "empty", "collections": [] },
			];
		expect(manifest).toStrictEqual(expected);
	});

	it("throws error for invalid path", () => {
		const schemaPath = "/src/__tests__/data/models";
		expect(() => loadTigrisManifest(schemaPath)).toThrow(TigrisFileNotFoundError);
	});

	it("throws error for multiple schema exports", () => {
		const schemaPath = process.cwd() + "/src/__tests__/data/invalidModels";
		expect(() => loadTigrisManifest(schemaPath)).toThrow(TigrisMoreThanOneSchemaDefined);
	});

	const validSchemaDefinitions = [
		{ key: { type: "value" } },
		{
			id: {
				type: TigrisDataTypes.INT32,
				primary_key: {
					order: 1,
					autoGenerate: true
				}
			},
			active: { type: TigrisDataTypes.BOOLEAN }
		}
	];
	test.each(validSchemaDefinitions)(
		"identifies valid schema definition %p",
		(definition) => {
			expect(canBeSchema(definition)).toBeTruthy();
		}
	);

	const invalidSchemaDefinitions = [
		{ key: "value" },
		12,
		{
			id: {
				type: TigrisDataTypes.INT32,
				primary_key: {
					order: 1,
					autoGenerate: true
				}
			},
			active: false
		},
		{
			id: {
				key: "value"
			}
		},
		{ type: "string" },
		undefined,
		null
	];

	test.each(invalidSchemaDefinitions)(
		"identifies invalid schema definition %p",
		(definition) => {
			expect(canBeSchema(definition)).toBeFalsy();
		}
	);
});
