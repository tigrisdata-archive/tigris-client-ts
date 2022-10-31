import path from "node:path";
import fs from "node:fs";
import { Log } from "./logger";
import { TigrisSchema } from "../types";
import { TigrisFileNotFoundError } from "../error";

const COLL_FILE_SUFFIX = ".ts";

type CollectionManifest = {
	collectionName: string;
	schemaName: string;
	schema: TigrisSchema<unknown>;
};

type DatabaseManifest = {
	dbName: string;
	collections: Array<CollectionManifest>;
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
	Log.event(`Scanning ${schemasPath} for Tigris schema definitions`);

	if (!fs.existsSync(schemasPath)) {
		Log.error(`Invalid path for Tigris schema: ${schemasPath}`);
		throw new TigrisFileNotFoundError(
			`Directory not found: ${schemasPath}. Provide a complete path.`
		);
	}

	const tigrisFileManifest: TigrisManifest = new Array<DatabaseManifest>();

	// load manifest from file structure
	for (const schemaPathEntry of fs.readdirSync(schemasPath)) {
		const dbDirPath = path.join(schemasPath, schemaPathEntry);
		if (fs.lstatSync(dbDirPath).isDirectory()) {
			Log.info(`Found DB definition ${schemaPathEntry}`);
			const dbManifest: DatabaseManifest = {
				dbName: schemaPathEntry,
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
						for (const [key, value] of Object.entries(schemaFile)) {
							if (canBeSchema(value)) {
								dbManifest.collections.push({
									collectionName: collName,
									schema: value as TigrisSchema<unknown>,
									schemaName: key,
								});
								Log.info(`Found schema definition: ${key}`);
								break;
							}
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
