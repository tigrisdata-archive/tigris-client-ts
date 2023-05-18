import { Filter, TigrisCollectionType, TigrisDataTypes } from "../types";
import { Utility } from "../utility";
import { TigrisCollection } from "../decorators/tigris-collection";
import { PrimaryKey } from "../decorators/tigris-primary-key";
import { Field } from "../decorators/tigris-field";

describe("filters tests", () => {
	it("simpleSelectorFilterTest", () => {
		const filterNothing: Filter<IUser> = {};
		expect(Utility.filterToString(filterNothing)).toBe("{}");
		const filter1: Filter<IUser> = {
			name: "Alice",
		};
		expect(Utility.filterToString(filter1)).toBe('{"name":"Alice"}');

		const filter2: Filter<IUser> = {
			balance: 100,
		};
		expect(Utility.filterToString(filter2)).toBe('{"balance":100}');

		const filter3: Filter<IUser1> = {
			isActive: true,
		};
		expect(Utility.filterToString(filter3)).toBe('{"isActive":true}');
	});

	it("persists date string as it is", () => {
		const dateFilter: Filter<IUser1> = {
			createdAt: {
				$gt: "1980-01-01T18:29:28.000Z",
			},
		};
		expect(Utility.filterToString(dateFilter)).toBe(
			'{"createdAt":{"$gt":"1980-01-01T18:29:28.000Z"}}'
		);
	});

	it("serializes Date object to string", () => {
		const dateFilter: Filter<IUser1> = {
			updatedAt: {
				$lt: new Date("1980-01-01"),
			},
		};
		expect(Utility.filterToString(dateFilter)).toBe(
			'{"updatedAt":{"$lt":"1980-01-01T00:00:00.000Z"}}'
		);
	});

	it("filter with an array value on array field", () => {
		const arrayFilter: Filter<IUser1> = {
			tags: ["tag1"],
		};
		expect(Utility.filterToString(arrayFilter)).toBe('{"tags":["tag1"]}');
	});

	it("filter with a string value on array field", () => {
		const arrayFilter: Filter<IUser1> = {
			tags: "tag1",
		};
		expect(Utility.filterToString(arrayFilter)).toBe('{"tags":"tag1"}');
	});

	it("filter with an array value on array of objects", () => {
		const arrayFilter: Filter<IUser1> = {
			address: [
				{
					city: "city1",
				},
			],
		};
		expect(Utility.filterToString(arrayFilter)).toBe('{"address":[{"city":"city1"}]}');
	});

	it("filter with an object value on array of objects", () => {
		const arrayFilter: Filter<IUser1> = {
			address: {
				city: "city1",
			},
		};
		expect(Utility.filterToString(arrayFilter)).toBe('{"address":{"city":"city1"}}');
	});

	it("simplerSelectorWithinLogicalFilterTest", () => {
		const filter1: Filter<IUser> = {
			$and: [
				{
					name: "Alice",
				},
				{
					balance: 100,
				},
			],
		};
		expect(Utility.filterToString(filter1)).toBe('{"$and":[{"name":"Alice"},{"balance":100}]}');

		const filter2: Filter<IUser> = {
			$or: [
				{
					name: "Alice",
				},
				{
					name: "Emma",
				},
			],
		};
		expect(Utility.filterToString(filter2)).toBe('{"$or":[{"name":"Alice"},{"name":"Emma"}]}');
	});

	it("basicSelectorFilterTest", () => {
		const filter1: Filter<IUser> = {
			name: "Alice",
		};
		expect(Utility.filterToString(filter1)).toBe('{"name":"Alice"}');

		const filter2: Filter<IUser> = {
			id: BigInt(123),
		};
		expect(Utility.filterToString(filter2)).toBe('{"id":123}');

		const filter3: Filter<IUser1> = {
			isActive: true,
		};
		expect(Utility.filterToString(filter3)).toBe('{"isActive":true}');
	});

	it("selectorFilter_1", () => {
		const tigrisFilter: Filter<Student> = {
			id: BigInt(1),
			name: "alice",
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"id":1,"name":"alice"}');
	});

	it("selectorFilter_2", () => {
		const tigrisFilter: Filter<Student> = {
			id: BigInt(1),
			name: "alice",
			balance: 12.34,
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"id":1,"name":"alice","balance":12.34}');
	});

	it("selectorFilter_3", () => {
		const tigrisFilter: Filter<Student> = {
			id: BigInt(1),
			name: "alice",
			balance: 12.34,
			"address.city": "San Francisco",
		};
		expect(Utility.filterToString(tigrisFilter)).toBe(
			'{"id":1,"name":"alice","balance":12.34,"address.city":"San Francisco"}'
		);
	});

	it("less than Filter", () => {
		const tigrisFilter: Filter<Student> = {
			balance: {
				$lt: 10,
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"balance":{"$lt":10}}');
	});

	it("less than equals Filter", () => {
		const tigrisFilter: Filter<Student> = {
			"address.zipcode": {
				$lte: 10,
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"address.zipcode":{"$lte":10}}');
	});

	it("greater than Filter", () => {
		const tigrisFilter: Filter<Student> = {
			balance: {
				$gt: 10,
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"balance":{"$gt":10}}');
	});

	it("greater than equals Filter", () => {
		const tigrisFilter: Filter<Student> = {
			balance: {
				$gte: 10,
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"balance":{"$gte":10}}');
	});

	it("not Filter", () => {
		const tigrisFilter: Filter<Student> = {
			name: {
				$not: "Jack",
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"name":{"$not":"Jack"}}');
	});

	it("contains Filter(string)", () => {
		const tigrisFilter: Filter<Student> = {
			name: {
				$contains: "Adam",
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"name":{"$contains":"Adam"}}');
	});

	it("regex Filter", () => {
		const tigrisFilter: Filter<Student> = {
			name: {
				$regex: "/andy/i",
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"name":{"$regex":"/andy/i"}}');
	});

	it("logicalFilterTest1", () => {
		const logicalFilter: Filter<IUser> = {
			$or: [
				{
					name: "alice",
				},
				{
					name: "emma",
				},
				{
					balance: {
						$gt: 300,
					},
				},
			],
		};
		expect(Utility.filterToString(logicalFilter)).toBe(
			'{"$or":[{"name":"alice"},{"name":"emma"},{"balance":{"$gt":300}}]}'
		);
	});

	it("logicalFilterTest2", () => {
		const logicalFilter: Filter<IUser2> = {
			$and: [
				{
					name: "alice",
				},
				{
					rank: 1,
				},
			],
		};
		expect(Utility.filterToString(logicalFilter)).toBe('{"$and":[{"name":"alice"},{"rank":1}]}');
	});

	it("nestedLogicalFilter1", () => {
		const logicalFilter1: Filter<Student> = {
			$and: [
				{
					name: "alice",
				},
				{
					"address.city": "Paris",
				},
			],
		};
		const logicalFilter2: Filter<Student> = {
			$and: [
				{
					"address.zipcode": {
						$gte: 1200,
					},
				},
				{
					balance: {
						$lte: 1000,
					},
				},
			],
		};
		const nestedLogicalFilter: Filter<Student> = {
			$or: [logicalFilter1, logicalFilter2],
		};
		expect(Utility.filterToString(nestedLogicalFilter)).toBe(
			'{"$or":[{"$and":[{"name":"alice"},{"address.city":"Paris"}]},{"$and":[{"address.zipcode":{"$gte":1200}},{"balance":{"$lte":1000}}]}]}'
		);
	});

	it("nestedLogicalFilter2", () => {
		const logicalFilter1: Filter<IUser2> = {
			$or: [
				{
					name: "alice",
				},
				{
					rank: 1,
				},
			],
		};
		const logicalFilter2: Filter<IUser2> = {
			$or: [
				{
					name: "emma",
				},
				{
					rank: 1,
				},
			],
		};
		const nestedLogicalFilter: Filter<Student> = {
			$and: [logicalFilter1, logicalFilter2],
		};
		expect(Utility.filterToString(nestedLogicalFilter)).toBe(
			'{"$and":[{"$or":[{"name":"alice"},{"rank":1}]},{"$or":[{"name":"emma"},{"rank":1}]}]}'
		);
	});
});

export interface IUser extends TigrisCollectionType {
	id: bigint;
	name: string;
	balance: number;
}

export class UserAddress {
	street: string;
	unit: string;
	city: string;
	state: string;
	zipcode: number;
}

@TigrisCollection("user1")
export class IUser1 {
	@PrimaryKey({ order: 1 })
	id: bigint;
	@Field()
	name: string;
	@Field()
	balance: number;
	@Field()
	isActive: boolean;
	@Field(TigrisDataTypes.DATE_TIME)
	createdAt: string;
	@Field()
	updatedAt: Date;
	@Field({ elements: TigrisDataTypes.STRING })
	tags: string[];
	@Field({ elements: UserAddress })
	address: UserAddress[];
}

export interface IUser2 extends TigrisCollectionType {
	id: bigint;
	name: string;
	rank: number;
}

export interface Student extends TigrisCollectionType {
	id: bigint;
	name: string;
	balance: number;
	address: Address;
}

export interface Address extends TigrisCollectionType {
	street: string;
	unit: string;
	city: string;
	state: string;
	zipcode: number;
}
