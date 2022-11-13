import path from "node:path";
import fs from "node:fs";
import { Log } from "./logger";
import { TigrisSchema } from "../types";
import { TigrisFileNotFoundError, TigrisMoreThanOneSchemaDefined } from "../error";
import * as crypto from "node:crypto";

const COLL_FILE_SUFFIX = ".ts";
const NETLIFY_PREVIEW_ENV = new Set<string>(["deploy-preview", "branch-deploy"]);
const VERCEL_PREVIEW_ENV = "preview";

type CollectionManifest = {
	collectionName: string;
	schemaName: string;
	schema: TigrisSchema<unknown>;
};

type DatabaseManifest = {
	dbName: string;
	collections: Array<CollectionManifest>;
};

type Props = {
	dbNameSuffix: string;
};

/**
 * Array of databases and collections in each database
 */
export type TigrisManifest = Array<DatabaseManifest>;

/**
 * Loads the databases and schema definitions from file system that can be used
 * to create databases and collections
 *
 * @return TigrisManifest
 */
export function loadTigrisManifest(schemasPath: string): TigrisManifest {
	const props = getProps();
	Log.event(`Scanning ${schemasPath} for Tigris schema definitions`);

	if (!fs.existsSync(schemasPath)) {
		Log.error(`Invalid path for Tigris schema: ${schemasPath}`);
		throw new TigrisFileNotFoundError(`Directory not found: ${schemasPath}`);
	}

	const tigrisFileManifest: TigrisManifest = new Array<DatabaseManifest>();

	// load manifest from file structure
	for (const schemaPathEntry of fs.readdirSync(schemasPath)) {
		const dbDirPath = path.join(schemasPath, schemaPathEntry);
		if (fs.lstatSync(dbDirPath).isDirectory()) {
			Log.info(`Found DB definition ${schemaPathEntry}`);
			const dbManifest: DatabaseManifest = {
				dbName: schemaPathEntry + props.dbNameSuffix,
				collections: new Array<CollectionManifest>(),
			};

			for (const dbPathEntry of fs.readdirSync(dbDirPath)) {
				if (dbPathEntry.endsWith(COLL_FILE_SUFFIX)) {
					const collFilePath = path.join(dbDirPath, dbPathEntry);
					if (fs.lstatSync(collFilePath).isFile()) {
						Log.info(`Found Schema file ${dbPathEntry} in ${schemaPathEntry}`);
						const collName = dbPathEntry.slice(
							0,
							Math.max(0, dbPathEntry.length - COLL_FILE_SUFFIX.length)
						);
						// eslint-disable-next-line @typescript-eslint/no-var-requires,unicorn/prefer-module
						const schemaFile = require(collFilePath);
						const detectedSchemas = new Map<string, TigrisSchema<unknown>>();
						// read schemas in that file
						for (const [key, value] of Object.entries(schemaFile)) {
							if (canBeSchema(value)) {
								detectedSchemas.set(key, value as TigrisSchema<unknown>);
							}
						}
						if (detectedSchemas.size > 1) {
							throw new TigrisMoreThanOneSchemaDefined(dbPathEntry, detectedSchemas.size);
						}
						for (const [name, def] of detectedSchemas) {
							dbManifest.collections.push({
								collectionName: collName,
								schema: def,
								schemaName: name,
							});
							Log.info(`Found schema definition: ${name}`);
						}
					}
				}
			}
			if (dbManifest.collections.length === 0) {
				Log.warn(`No valid schema definition found in ${schemaPathEntry}`);
			}
			tigrisFileManifest.push(dbManifest);
		}
	}

	Log.debug(`Generated Tigris Manifest: ${JSON.stringify(tigrisFileManifest)}`);
	return tigrisFileManifest;
}

/**
 * Validate if given input can be a valid {@link TigrisSchema} type. This is
 * not a comprehensive validation, it happens on server.
 *
 * @param maybeSchema
 */
export function canBeSchema(maybeSchema: unknown): boolean {
	if (maybeSchema === null || typeof maybeSchema !== "object") {
		return false;
	}
	for (const value of Object.values(maybeSchema)) {
		if (value === null || typeof value !== "object") {
			return false;
		}
		if (!Object.prototype.hasOwnProperty.call(value, "type")) {
			return false;
		}
	}
	return true;
}

/**
 * Generate `dbNameSuffix` based off the deploy environment
 */
export function getProps(): Props {
	let suffix = "";
	if (NETLIFY_PREVIEW_ENV.has(process.env.CONTEXT) && process.env.HEAD) {
		suffix = "_preview_" + nerfGitBranchName(process.env.HEAD);
	} else if (VERCEL_PREVIEW_ENV === process.env.VERCEL_ENV && process.env.VERCEL_GIT_COMMIT_REF) {
		suffix = "_preview_" + nerfGitBranchName(process.env.VERCEL_GIT_COMMIT_REF);
	}
	return { dbNameSuffix: suffix };
}

/**
 * Utility method to nerf a git branch name to a string acceptable as Tigris db Name
 *
 * @example "main/fork" becomes "main_fork_6e3e0518".
 * @param original - name of git branch
 */
export function nerfGitBranchName(original: string) {
	const hash = crypto.createHash("sha256").update(original).digest("hex").slice(0, 8);
	return original.replace(/[^\d\n.A-Za-z]/g, "_") + "_" + hash;
}
