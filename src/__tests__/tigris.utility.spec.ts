import { Utility } from "../utility";
import {
	Case,
	FacetFieldOptions,
	FacetFields,
	FacetFieldsQuery,
	FacetQueryFieldType,
	MATCH_ALL_QUERY_STRING,
	SearchQueryOptions,
} from "../search";
import { SortOrder } from "../types";

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

	it.each<[string, SortOrder, string]>([
		["undefined", undefined, "[]"],
		[
			"multiple sort fields",
			[
				{ field: "field_1", order: "$asc" },
				{ field: "parent.field_2", order: "$desc" },
			],
			'[{"field_1":"$asc"},{"parent.field_2":"$desc"}]',
		],
		["single sort field", { field: "field_3", order: "$desc" }, '[{"field_3":"$desc"}]'],
		["empty array", [], "[]"],
	])("_sortOrderingToString() with '%s'", (testName, input, expected) => {
		expect(Utility._sortOrderingToString(input)).toBe(expected);
	});

	describe("createProtoSearchRequest", () => {
		const dbName = "my_test_db";
		const branch = "my_test_branch";
		const collectionName = "my_test_collection";

		it("populates projectName and collection name", () => {
			const emptyRequest = { q: "" };
			const generated = Utility.createProtoSearchRequest(
				dbName,
				branch,
				collectionName,
				emptyRequest
			);
			expect(generated.getProject()).toBe(dbName);
			expect(generated.getBranch()).toBe(branch);
			expect(generated.getCollection()).toBe(collectionName);
		});

		it("creates default match all query string", () => {
			const request = { q: undefined };
			const generated = Utility.createProtoSearchRequest(dbName, branch, collectionName, request);
			expect(generated.getQ()).toBe(MATCH_ALL_QUERY_STRING);
		});

		it("sets collation options", () => {
			const options: SearchQueryOptions = {
				collation: {
					case: Case.CaseInsensitive,
				},
			};
			const emptyRequest = { q: "", options: options };
			const generated = Utility.createProtoSearchRequest(
				dbName,
				branch,
				collectionName,
				emptyRequest
			);
			expect(generated.getPage()).toBe(0);
			expect(generated.getPageSize()).toBe(0);
			expect(generated.getCollation().getCase()).toBe("ci");
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
});
