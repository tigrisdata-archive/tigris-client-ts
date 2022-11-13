import {
	canBeSchema, getProps,
	loadTigrisManifest,
	nerfGitBranchName,
	TigrisManifest
} from "../../utils/manifest-loader";
import { TigrisDataTypes } from "../../types";
import { TigrisFileNotFoundError, TigrisMoreThanOneSchemaDefined } from "../../error";

describe("Manifest loader", () => {
	const env = Object.assign({}, process.env);
	afterEach(() => {
		process.env = env;
	});

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
			{
				"dbName": "embedded",
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
				}]
			},
			{ "dbName": "empty", "collections": [] }
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

	type envProps = {
		context?: string,
		head?: string,
		vercel_env?: string,
		vercel_git_commit_ref: string
	}

	const propsTestCases = [
		{
			testName: "branch-deploy netlify preview env",
			envVars: {
				context: "branch-deploy",
				head: "hotfix/123"
			},
			expected: { dbNameSuffix: "_preview_hotfix_123_d7b15e9d" }
		},
		{
			testName: "deploy-preview netlify preview env",
			envVars: {
				context: "deploy-preview",
				head: "hotfix/123"
			},
			expected: { dbNameSuffix: "_preview_hotfix_123_d7b15e9d" }
		},
		{
			testName: "valid vercel preview env",
			envVars: {
				vercel_env: "preview",
				vercel_git_commit_ref: "hotfix/123"
			},
			expected: { dbNameSuffix: "_preview_hotfix_123_d7b15e9d" }
		},
		{
			testName: "netlify env missing git branch",
			envVars: {
				context: "branch-deploy"
			},
			expected: { dbNameSuffix: "" }
		},
		{
			testName: "vercel env empty git branch",
			envVars: {
				vercel_env: "preview",
				vercel_git_commit_ref: ""
			},
			expected: { dbNameSuffix: "" }
		},
		{
			testName: "No deploy env",
			envVars: {},
			expected: { dbNameSuffix: "" }
		},
	];

	test.each(propsTestCases)(
		'getProps() for $testName',
		({ testName, envVars, expected }) => {
			process.env.CONTEXT = envVars.context;
			process.env.HEAD = envVars.head;
			process.env.VERCEL_ENV = envVars.vercel_env;
			process.env.VERCEL_GIT_COMMIT_REF = envVars.vercel_git_commit_ref;
			expect(getProps()).toStrictEqual(expected);
		}
	);

	const nerfingTestCases = [
		["main/fork", "main_fork_6e3e0518"],
		["main-fork", "main_fork_56276341"],
		["main?fork", "main_fork_c7873468"],
		["sTaging21", "sTaging21_a9877c4a"],
		["hotfix/jira-23$4", "hotfix_jira_23_4_ddabe4ab"],
		["", "_e3b0c442"],
		["release", "release_a4d451ec"],
		["zero ops", "zero_ops_c42af5f1"],
		["under_score", "under_score_d8071166"]
	];

	test.each(nerfingTestCases)(
		"nerfs the name %p",
		(original, nerfed) => {
			expect(nerfGitBranchName(original)).toBe(nerfed);
		}
	);
});
