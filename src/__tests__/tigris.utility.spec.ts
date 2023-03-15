import { Utility } from "../utility";
import { Order, SelectorFilterOperator, SortOrder } from "../types";
import {
	Case,
	FacetFieldOptions,
	FacetFields,
	FacetFieldsQuery,
	FacetQueryFieldType,
	MATCH_ALL_QUERY_STRING,
	SearchQuery,
	SearchQueryOptions,
} from "../search";
import { SearchRequest as ProtoSearchRequest } from "../proto/server/v1/api_pb";
import { TigrisCollection } from "../decorators/tigris-collection";
import { PrimaryKey } from "../decorators/tigris-primary-key";
import { Field } from "../decorators/tigris-field";

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
		const fields: FacetFields<Student> = ["balance", "address.city"];
		const serialized: string = Utility.facetQueryToString(fields);
		expect(serialized).toBe(
			'{"balance":{"size":10,"type":"value"},"address.city":{"size":10,"type":"value"}}'
		);
	});

	it("serializes FacetFieldOptions to string", () => {
		const fields: FacetFieldOptions<Student> = {
			name: Utility.createFacetQueryOptions(),
			"address.street": { size: 10, type: FacetQueryFieldType.VALUE },
		};
		const serialized: string = Utility.facetQueryToString(fields);
		expect(serialized).toBe(
			'{"name":{"size":10,"type":"value"},"address.street":{"size":10,"type":"value"}}'
		);
	});

	it("equivalent serialization of FacetFieldsQuery", () => {
		const facetFields: FacetFieldsQuery<Student> = ["name", "address.street"];
		const facetWithOptions: FacetFieldsQuery<Student> = {
			name: Utility.createFacetQueryOptions(),
			"address.street": { size: 10, type: FacetQueryFieldType.VALUE },
		};
		const serializedFields = Utility.facetQueryToString(facetFields);
		expect(serializedFields).toBe(Utility.facetQueryToString(facetWithOptions));
	});

	it.each<[string, SortOrder<Student>, string]>([
		["undefined", undefined, "[]"],
		[
			"multiple sort fields",
			[
				{ field: "name", order: Order.ASC },
				{ field: "address.street", order: Order.DESC },
			],
			'[{"name":"$asc"},{"address.street":"$desc"}]',
		],
		[
			"single sort field",
			{ field: "address.city", order: Order.DESC },
			'[{"address.city":"$desc"}]',
		],
		["empty array", [], "[]"],
	])("_sortOrderingToString() with '%s'", (testName, input, expected: string) => {
		expect(Utility._sortOrderingToString(input)).toBe(expected);
	});

	describe("createProtoSearchRequest", () => {
		let request: ProtoSearchRequest;
		beforeEach(() => {
			request = new ProtoSearchRequest();
		});

		it("creates default match all search request", () => {
			const query = {};
			Utility.protoSearchRequestFromQuery(query, request);
			expect(request.getQ()).toBe(MATCH_ALL_QUERY_STRING);
			expect(request.getSearchFieldsList()).toEqual([]);
			expect(request.getFilter()).toBe("");
			expect(request.getFacet()).toBe("");
			expect(request.getSort()).toBe("");
			expect(request.getIncludeFieldsList()).toEqual([]);
			expect(request.getExcludeFieldsList()).toEqual([]);
			expect(request.getPage()).toBe(0);
			expect(request.getPageSize()).toBe(0);
			expect(request.getCollation()).toBeUndefined();
		});

		it("sets searchFields", () => {
			const query: SearchQuery<Student> = { searchFields: ["name", "address.street"] };
			Utility.protoSearchRequestFromQuery(query, request);

			expect(request.getSearchFieldsList()).toEqual(["name", "address.street"]);
		});

		it("sets filter", () => {
			const query: SearchQuery<Student> = {
				filter: { op: SelectorFilterOperator.GT, fields: { balance: 25 } },
			};
			Utility.protoSearchRequestFromQuery(query, request);

			expect(request.getFilter()).toEqual(Utility.stringToUint8Array('{"balance":{"$gt":25}}'));
		});

		it("sets facets", () => {
			const query: SearchQuery<Student> = {
				facets: ["address.city"],
			};
			Utility.protoSearchRequestFromQuery(query, request);

			expect(request.getFacet()).toEqual(
				Utility.stringToUint8Array('{"address.city":{"size":10,"type":"value"}}')
			);
		});

		it("sets sort order", () => {
			const query: SearchQuery<Student> = {
				sort: { field: "balance", order: Order.DESC },
			};
			Utility.protoSearchRequestFromQuery(query, request);

			expect(request.getSort()).toEqual(Utility.stringToUint8Array('[{"balance":"$desc"}]'));
		});

		it("sets includeFields", () => {
			const query: SearchQuery<Student> = { includeFields: ["name", "address.street"] };
			Utility.protoSearchRequestFromQuery(query, request);

			expect(request.getIncludeFieldsList()).toEqual(["name", "address.street"]);
		});

		it("sets excludeFields", () => {
			const query: SearchQuery<Student> = { excludeFields: ["name", "address.street"] };
			Utility.protoSearchRequestFromQuery(query, request);

			expect(request.getExcludeFieldsList()).toEqual(["name", "address.street"]);
		});

		it("sets hitsPerPage", () => {
			const query: SearchQuery<Student> = { hitsPerPage: 57 };
			Utility.protoSearchRequestFromQuery(query, request);

			expect(request.getPageSize()).toEqual(57);
		});

		it("sets page", () => {
			Utility.protoSearchRequestFromQuery({}, request, 3);

			expect(request.getPage()).toEqual(3);
		});

		it("sets collation options", () => {
			const options: SearchQueryOptions = {
				collation: {
					case: Case.CaseInsensitive,
				},
			};
			const optionsQuery = { q: "", options: options };
			Utility.protoSearchRequestFromQuery(optionsQuery, request);

			expect(request.getPage()).toBe(0);
			expect(request.getPageSize()).toBe(0);
			expect(request.getCollation().getCase()).toBe("ci");
		});
	});

	const nerfingTestCases = [
		["main/fork", "main_fork"],
		["main-fork", "main-fork"],
		["main?fork", "main?fork"],
		["sTaging21", "sTaging21"],
		["hotfix/jira-23$4", "hotfix_jira-23$4"],
		["", ""],
		["release", "release"],
		["zero ops", "zero_ops"],
		["under_score", "under_score"],
		["bot/fork1.2#server/main_beta new", "bot_fork1.2_server_main_beta_new"],
	];

	test.each(nerfingTestCases)("nerfs the name - '%s'", (original, nerfed) => {
		expect(Utility.nerfGitBranchName(original)).toBe(nerfed);
	});

	describe("character encoding", () => {
		it("read back data into utf-8", () => {
			expect(Utility._base64Decode("4KSo4KSu4KS44KWN4KSk4KWH")).toBe("नमस्ते");
			expect(Utility._base64Decode("0L/RgNC40LLQtdGC")).toBe("привет");
			expect(Utility._base64Decode("44GT44KT44Gr44Gh44Gv")).toBe("こんにちは");
			expect(Utility._base64Decode("7JWI64WV7ZWY7IS47JqU")).toBe("안녕하세요");
			expect(Utility._base64Decode("8J+Zjw==")).toBe("🙏");
			expect(Utility._base64Decode("8J+YgQ==")).toBe("😁");
		});
	});

	describe("get branch name from environment", () => {
		const OLD_ENV = Object.assign({}, process.env);

		beforeEach(() => {
			jest.resetModules();
		});

		afterEach(() => {
			process.env = OLD_ENV;
		});

		it.each([
			["preview_${GIT_BRANCH}", "GIT_BRANCH", "feature_1", "preview_feature_1"],
			["staging", undefined, undefined, "staging"],
			["integration_${MY_VAR}_auto", undefined, undefined, undefined],
			["integration_${MY_VAR}_auto", "NOT_SET", "feature_2", undefined],
			["${MY_GIT_BRANCH}", "MY_GIT_BRANCH", "jira/1234", "jira_1234"],
			["${MY_GIT_BRANCH", "MY_GIT_BRANCH", "jira/1234", "${MY_GIT_BRANCH"],
			[undefined, undefined, undefined, undefined],
		])("envVar - '%s'", (branchEnvValue, templateEnvKey, templateEnvValue, expected) => {
			process.env["TIGRIS_DB_BRANCH"] = branchEnvValue;
			if (templateEnvKey) {
				process.env[templateEnvKey] = templateEnvValue;
			}
			expect(Utility.branchNameFromEnv()).toEqual(expected);
		});

		it.each([
			["any_given_branch", "any_given_branch"],
			["", ""],
			[undefined, undefined],
		])("given branch - '%s'", (givenBranch, expected) => {
			const actual = Utility.branchNameFromEnv(givenBranch);
			expect(actual).toBe(expected);
		});
	});
});

class Address {
	@Field()
	street: string;

	@Field()
	city: string;
}

@TigrisCollection("students")
class Student {
	@PrimaryKey({ order: 1 })
	id: string;

	@Field()
	name: string;

	@Field()
	balance: number;

	@Field()
	address: Address;
}
