import { ReadFields } from "../types";
import { Utility } from "../utility";
import { Field } from "../decorators/tigris-field";
import { TigrisCollection } from "../decorators/tigris-collection";
import { PrimaryKey } from "../decorators/tigris-primary-key";

describe("readFields tests", () => {
	it("serializes empty object", () => {
		expect(Utility.readFieldString({})).toBe("{}");
	});

	it("serializes include only", () => {
		const readFields: ReadFields<Student> = {
			include: ["id", "name", "address.street"],
		};
		expect(Utility.readFieldString(readFields)).toBe(
			'{"id":true,"name":true,"address.street":true}'
		);
	});

	it("serializes exclude only", () => {
		const readFields: ReadFields<Student> = {
			exclude: ["id", "address.city"],
		};
		expect(Utility.readFieldString(readFields)).toBe('{"id":false,"address.city":false}');
	});

	it("serializes includes and excludes", () => {
		const readFields: ReadFields<Student> = {
			include: ["id", "address"],
			exclude: ["name"],
		};
		expect(Utility.readFieldString(readFields)).toBe('{"id":true,"address":true,"name":false}');
	});
});

class Address {
	@Field()
	street: string;

	@Field()
	city: string;
}

@TigrisCollection("students")
class Student {
	@PrimaryKey({ order: 1 })
	id: string;

	@Field()
	name: string;

	@Field()
	balance: number;

	@Field()
	address: Address;
}
