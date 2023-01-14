import appRootPath from "app-root-path";
import * as dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { Log } from "./logger";

/**
 * Uses dotenv() to initialize `.env` config files based on the **NODE_ENV**
 * environment variable in order -:
 * 1. `.env.${NODE_ENV}.local`
 * 2. `.env.local`
 * 3. `.env.${NODE_ENV}`
 * 4. `.env`
 *
 * @example If `NODE_ENV = production`
 * ```
 * export NODE_ENV=production
 *
 * // will load following 4 config files in order:
 * .env.production.local
 * .env.local
 * .env.production
 * .env
 * ```
 */
export function initializeEnvironment() {
	const envFiles = getEnvFiles(appRootPath.toString());
	for (const f of envFiles) {
		dotenv.config({ path: f });
	}
}

function getEnvFiles(dir: string) {
	const nodeEnv = process.env.NODE_ENV;
	const dotEnvFiles: Array<string> = [];
	switch (nodeEnv) {
		case "test":
			dotEnvFiles.push(`.env.${nodeEnv}.local`);
			break;
		case "development":
		case "production":
			dotEnvFiles.push(`.env.${nodeEnv}.local`, ".env.local");
			break;
	}
	dotEnvFiles.push(`.env.${nodeEnv}`, ".env");

	const envFilePaths = [];
	for (const envFile of dotEnvFiles) {
		const envFilePath = path.join(dir, envFile);
		try {
			const stats = fs.statSync(envFilePath);

			// make sure to only attempt to read files
			if (!stats.isFile()) {
				continue;
			}

			envFilePaths.push(envFilePath);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (error: any) {
			if (error.code !== "ENOENT") {
				Log.error(`Failed to read env from '${envFile}'`, error.message);
			}
		}
	}
	return envFilePaths;
}
