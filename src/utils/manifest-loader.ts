import path from "node:path";
import fs from "node:fs";
import { Log } from "./logger";
import { TigrisSchema } from "../types";
import { TigrisFileNotFoundError, TigrisMoreThanOneSchemaDefined } from "../error";

const COLL_FILE_SUFFIX = ".ts";

type CollectionManifest = {
	collectionName: string;
	schemaName: string;
	schema: TigrisSchema<unknown>;
};

/**
 * Array of collections in the database
 */
export type DatabaseManifest = {
	collections: Array<CollectionManifest>;
};

/**
 * Loads the databases and schema definitions from file system that can be used
 * to create databases and collections
 *
 * @return TigrisManifest
 */
export function loadTigrisManifest(schemasPath: string): DatabaseManifest {
	Log.event(`Scanning ${schemasPath} for Tigris schema definitions`);

	if (!fs.existsSync(schemasPath)) {
		Log.error(`Invalid path for Tigris schema: ${schemasPath}`);
		throw new TigrisFileNotFoundError(`Directory not found: ${schemasPath}`);
	}

	const dbManifest: DatabaseManifest = {
		collections: new Array<CollectionManifest>(),
	};

	// load manifest from file structure
	for (const colsFileName of fs.readdirSync(schemasPath)) {
		const collFilePath = path.join(schemasPath, colsFileName);
		if (collFilePath.endsWith(COLL_FILE_SUFFIX) && fs.lstatSync(collFilePath).isFile()) {
			Log.info(`Found Schema file ${colsFileName} in ${schemasPath}`);
			const collName = colsFileName.slice(
				0,
				Math.max(0, colsFileName.length - COLL_FILE_SUFFIX.length)
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
				throw new TigrisMoreThanOneSchemaDefined(collFilePath, detectedSchemas.size);
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

	if (dbManifest.collections.length === 0) {
		Log.warn(`No valid schema definition found in ${schemasPath}`);
	}

	Log.debug(`Generated DB Manifest: ${JSON.stringify(dbManifest)}`);
	return dbManifest;
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
