import { initializeEnvironment } from "../../utils/env-loader";

describe("configLoader", () => {
	const OLD_ENV = Object.assign({}, process.env);

	beforeEach(() => {
		jest.resetModules();
	});

	afterEach(() => {
		process.env = OLD_ENV;
	});

	it("no side effect if files not found", () => {
		initializeEnvironment();
	});
});
