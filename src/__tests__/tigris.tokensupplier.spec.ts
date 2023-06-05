import { TokenSupplier } from "../tokensupplier";
import { mock, when, instance } from "ts-mockito";
import Driver from "../driver/driver";

describe("Token supplier", () => {
	const config = {
		clientId: "123",
		clientSecret: "123",
	};
	it("should refresh if undefined", () => {
		const driver = mock<Driver>();
		const supplier = new TokenSupplier(config, driver);

		expect(supplier.shouldRefresh()).toBeTruthy();
	});

	it("should refresh if old date", () => {
		const driver = mock<Driver>();
		const supplier = new TokenSupplier(config, driver);
		//@ts-ignore
		supplier.nextRefreshDate = new Date("2023-04-04T03:24:00");
		expect(supplier.shouldRefresh()).toBeTruthy();
	});

	it("processes new token", async () => {
		const accessToken = "0.NTAwMA==";
		const driver = mock<Driver>();
		when(driver.getAccessToken(config.clientId, config.clientSecret)).thenReturn(
			Promise.resolve(accessToken)
		);
		const supplier = new TokenSupplier(config, instance(driver));
		const res = await supplier.getAccessToken();
		expect(res).toEqual(accessToken);
	});
});
