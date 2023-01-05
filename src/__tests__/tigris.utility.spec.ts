import { Utility } from "../utility";
import {
	Case,
	FacetFieldOptions,
	FacetFields,
	FacetFieldsQuery,
	FacetQueryFieldType,
	MATCH_ALL_QUERY_STRING,
	Ordering,
	SearchQueryOptions,
	SortOrder,
} from "../search/types";

describe("utility tests", () => {
	it("base64encode", () => {
		expect(Utility._base64Encode("hello world")).toBe("aGVsbG8gd29ybGQ=");
		expect(Utility._base64Encode("tigris data")).toBe("dGlncmlzIGRhdGE=");
	});

	it("base64decode", () => {
		expect(Utility._base64Decode("aGVsbG8gd29ybGQ=")).toBe("hello world");
		expect(Utility._base64Decode("dGlncmlzIGRhdGE=")).toBe("tigris data");
	});

	it("generates default facet query options", () => {
		const generatedOptions = Utility.createFacetQueryOptions();
		expect(generatedOptions.size).toBe(10);
		expect(generatedOptions.type).toBe(FacetQueryFieldType.VALUE);
	});

	it("backfills missing facet query options", () => {
		const generatedOptions = Utility.createFacetQueryOptions({
			size: 55,
		});
		expect(generatedOptions.size).toBe(55);
		expect(generatedOptions.type).toBe(FacetQueryFieldType.VALUE);
	});

	it("serializes FacetFields to string", () => {
		const fields: FacetFields = ["field_1", "field_2"];
		const serialized: string = Utility.facetQueryToString(fields);
		expect(serialized).toBe(
			'{"field_1":{"size":10,"type":"value"},"field_2":{"size":10,"type":"value"}}'
		);
	});

	it("serializes FacetFieldOptions to string", () => {
		const fields: FacetFieldOptions = {
			field_1: Utility.createFacetQueryOptions(),
			field_2: { size: 10, type: FacetQueryFieldType.VALUE },
		};
		const serialized: string = Utility.facetQueryToString(fields);
		expect(serialized).toBe(
			'{"field_1":{"size":10,"type":"value"},"field_2":{"size":10,"type":"value"}}'
		);
	});

	it("equivalent serialization of FacetFieldsQuery", () => {
		const facetFields: FacetFieldsQuery = ["field_1", "field_2"];
		const fieldOptions: FacetFieldsQuery = {
			field_1: Utility.createFacetQueryOptions(),
			field_2: { size: 10, type: FacetQueryFieldType.VALUE },
		};
		const serializedFields = Utility.facetQueryToString(facetFields);
		expect(serializedFields).toBe(Utility.facetQueryToString(fieldOptions));
	});

	it("serializes empty sort order", () => {
		expect(Utility.sortOrderingToString([])).toBe("[]");
	});

	it("serializes sort orders to string", () => {
		const ordering: Ordering = [
			{ field: "field_1", order: SortOrder.ASC },
			{ field: "parent.field_2", order: SortOrder.DESC },
		];
		const expected = '[{"field_1":"$asc"},{"parent.field_2":"$desc"}]';
		expect(Utility.sortOrderingToString(ordering)).toBe(expected);
	});

	describe("createProtoSearchRequest", () => {
		const dbName = "my_test_db";
		const collectionName = "my_test_collection";

		it("populates projectName and collection name", () => {
			const emptyRequest = { q: "" };
			const generated = Utility.createProtoSearchRequest(dbName, collectionName, emptyRequest);
			expect(generated.getProject()).toBe(dbName);
			expect(generated.getCollection()).toBe(collectionName);
		});

		it("creates default match all query string", () => {
			const request = { q: undefined };
			const generated = Utility.createProtoSearchRequest(dbName, collectionName, request);
			expect(generated.getQ()).toBe(MATCH_ALL_QUERY_STRING);
		});

		it("sets collation options", () => {
			const emptyRequest = { q: "" };
			const options: SearchQueryOptions = {
				collation: {
					case: Case.CaseInsensitive,
				},
			};
			const generated = Utility.createProtoSearchRequest(
				dbName,
				collectionName,
				emptyRequest,
				options
			);
			expect(generated.getPage()).toBe(0);
			expect(generated.getPageSize()).toBe(0);
			expect(generated.getCollation().getCase()).toBe("ci");
		});
	});
});
