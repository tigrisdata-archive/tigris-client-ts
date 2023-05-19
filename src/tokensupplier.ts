import Driver from "./driver/driver";
import { TigrisClientConfig } from "./tigris";
import { Utility } from "./utility";

export class TokenSupplier {
	private readonly clientId: string;
	private readonly clientSecret: string;
	private readonly config: TigrisClientConfig;
	private readonly driver: Driver;

	private accessToken: string;
	private nextRefreshTime: number;

	constructor(config: TigrisClientConfig, driver: Driver) {
		this.clientId = config.clientId;
		this.clientSecret = config.clientSecret;
		this.config = config;
		this.driver = driver;
	}

	async getAccessToken(): Promise<string> {
		if (this.shouldRefresh()) {
			this.accessToken = await this.driver.getAccessToken(this.clientId, this.clientSecret);
		}
		const parts: string[] = this.accessToken.split(".");
		const exp = Number(
			Utility.jsonStringToObj(Utility._base64Decode(parts[1]), this.config)["exp"]
		);
		// 5 min before expiry (note: exp is in seconds)
		// add random jitter of 1-5 min (i.e. 60000 - 300000 ms)
		this.nextRefreshTime = exp * 1000 - 300_000 - (Utility._getRandomInt(300_000) + 60_000);
		return this.accessToken;
	}

	shouldRefresh(): boolean {
		if (typeof this.accessToken === "undefined") {
			return true;
		}
		return Date.now() >= this.nextRefreshTime;
	}
}
