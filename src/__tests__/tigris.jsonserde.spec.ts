import {TigrisCollectionType} from "../types";
import {Utility} from "../utility";

describe("JSON serde tests", () => {

	it("jsonSerDe", () => {
		 interface IUser extends TigrisCollectionType {
			id: bigint;
			name: string;
			balance: number;
		}

		const user: IUser =
			{
				id: BigInt("9223372036854775807"),
				name: "Alice",
				balance: 123
			};
		const userString = Utility.objToJsonString(user);
		expect(userString).toBe("{\"id\":9223372036854775807,\"name\":\"Alice\",\"balance\":123}");

		const deserializedUser = Utility.jsonStringToObj<IUser>("{\"id\":9223372036854775807,\"name\":\"Alice\",\"balance\":123}" , {serverUrl: "test"});
		expect(deserializedUser.id).toBe("9223372036854775807");
		expect(deserializedUser.name).toBe("Alice");
		expect(deserializedUser.balance).toBe(123);
	});

	it("jsonSerDeStringAsBigInt", () => {
		interface TestUser {
			id: number,
			name: string,
			balance: string
		}
		const user: TestUser = {
			id: 1,
			name: "Alice",
			balance: "9223372036854775807"
		}

		// default serde
		expect(JSON.stringify(user)).toBe("{\"id\":1,\"name\":\"Alice\",\"balance\":\"9223372036854775807\"}");
		const reconstructedUser1: TestUser = JSON.parse("{\"id\":1,\"name\":\"Alice\",\"balance\":\"9223372036854775807\"}");
		expect(reconstructedUser1.id).toBe(1)
		expect(reconstructedUser1.name).toBe("Alice")
		expect(reconstructedUser1.balance).toBe("9223372036854775807")

		// Tigris serde
		expect(Utility.objToJsonString(user)).toBe("{\"id\":1,\"name\":\"Alice\",\"balance\":\"9223372036854775807\"}");
		const reconstructedUser2: TestUser = Utility.jsonStringToObj("{\"id\":1,\"name\":\"Alice\",\"balance\":\"9223372036854775807\"}", {serverUrl: "test"});
		expect(reconstructedUser2.id).toBe(1)
		expect(reconstructedUser2.name).toBe("Alice")
		expect(reconstructedUser2.balance).toBe("9223372036854775807")
	});

	it("jsonSerDeNativeBigInt", () => {
		interface TestUser {
			id: number,
			name: string,
			balance: bigint
		}
		const user: TestUser = {
			id: 1,
			name: "Alice",
			balance: BigInt("9223372036854775807")
		}

		// Tigris serde
		expect(Utility.objToJsonString(user)).toBe("{\"id\":1,\"name\":\"Alice\",\"balance\":9223372036854775807}");
		const reconstructedUser2: TestUser = Utility.jsonStringToObj("{\"id\":1,\"name\":\"Alice\",\"balance\":9223372036854775807}", {
			serverUrl: "test",
			supportBigInt: true
		});
		expect(reconstructedUser2.id).toBe(1)
		expect(reconstructedUser2.name).toBe("Alice")
		expect(reconstructedUser2.balance).toBe(BigInt("9223372036854775807"))
	});

	it("jsonSerDeNativeBigIntNested", () => {
		interface TestUser {
			id: number,
			name: string,
			balance: bigint
			savings: Account
			checkin: Account
		}
		interface Account {
			accountId: bigint
		}
		const user: TestUser = {
			id: 1,
			name: "Alice",
			balance: BigInt("9223372036854775807"),
			checkin: {
				accountId: BigInt("9223372036854775806")
			},
			savings: {
				accountId: BigInt("9223372036854775807")
			}
		}

		// Tigris serde
		expect(Utility.objToJsonString(user)).toBe("{\"id\":1,\"name\":\"Alice\",\"balance\":9223372036854775807,\"checkin\":{\"accountId\":9223372036854775806},\"savings\":{\"accountId\":9223372036854775807}}"
	);
		const reconstructedUser2: TestUser = Utility.jsonStringToObj("{\"id\":1,\"name\":\"Alice\",\"balance\":9223372036854775807,\"checkin\":{\"accountId\":9223372036854775806},\"savings\":{\"accountId\":9223372036854775807}}"
			, {
			serverUrl: "test",
			supportBigInt: true
		});
		expect(reconstructedUser2.id).toBe(1)
		expect(reconstructedUser2.name).toBe("Alice")
		expect(reconstructedUser2.balance).toBe(BigInt("9223372036854775807"))
		expect(reconstructedUser2.checkin.accountId).toBe(BigInt("9223372036854775806"))
		expect(reconstructedUser2.savings.accountId).toBe(BigInt("9223372036854775807"))
	});
});


