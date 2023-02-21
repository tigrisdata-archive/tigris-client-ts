import { Utility } from "../utility";
import fs from "node:fs";

export function readJSONFileAsObj(filePath: string): string {
	return Utility.objToJsonString(
		Utility.jsonStringToObj(fs.readFileSync(filePath, "utf8"), {
			serverUrl: "test",
		})
	);
}
