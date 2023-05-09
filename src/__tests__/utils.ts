import { Utility } from "../utility";
import * as fs from "fs";

export function readJSONFileAsObj(filePath: string): string {
	return Utility.objToJsonString(
		Utility.jsonStringToObj(fs.readFileSync(filePath, "utf8"), {
			serverUrl: "test",
		})
	);
}
