import {
	LogicalFilter,
	LogicalOperator,
	Selector,
	SelectorFilter,
	SelectorFilterOperator,
	TigrisCollectionType,
	TigrisDataTypes,
} from "../types";
import { Utility } from "../utility";
import { TigrisCollection } from "../decorators/tigris-collection";
import { PrimaryKey } from "../decorators/tigris-primary-key";
import { Field } from "../decorators/tigris-field";

describe("filters tests", () => {
	it("simpleSelectorFilterTest", () => {
		const filterNothing: SelectorFilter<IUser> = {
			op: SelectorFilterOperator.NONE,
		};
		expect(Utility.filterToString(filterNothing)).toBe("{}");
		const filter1: Selector<IUser> = {
			name: "Alice",
		};
		expect(Utility.filterToString(filter1)).toBe('{"name":"Alice"}');

		const filter2: Selector<IUser> = {
			balance: 100,
		};
		expect(Utility.filterToString(filter2)).toBe('{"balance":100}');

		const filter3: Selector<IUser1> = {
			isActive: true,
		};
		expect(Utility.filterToString(filter3)).toBe('{"isActive":true}');
	});

	it("persists date string as it is", () => {
		const dateFilter: SelectorFilter<IUser1> = {
			op: SelectorFilterOperator.GT,
			fields: {
				createdAt: "1980-01-01T18:29:28.000Z",
			},
		};
		expect(Utility.filterToString(dateFilter)).toBe(
			'{"createdAt":{"$gt":"1980-01-01T18:29:28.000Z"}}'
		);
	});

	it("serializes Date object to string", () => {
		const dateFilter: SelectorFilter<IUser1> = {
			op: SelectorFilterOperator.LT,
			fields: {
				updatedAt: new Date("1980-01-01"),
			},
		};
		expect(Utility.filterToString(dateFilter)).toBe(
			'{"updatedAt":{"$lt":"1980-01-01T00:00:00.000Z"}}'
		);
	});

	it("simplerSelectorWithinLogicalFilterTest", () => {
		const filter1: LogicalFilter<IUser> = {
			op: LogicalOperator.AND,
			selectorFilters: [
				{
					name: "Alice",
				},
				{
					balance: 100,
				},
			],
		};
		expect(Utility.filterToString(filter1)).toBe('{"$and":[{"name":"Alice"},{"balance":100}]}');

		const filter2: LogicalFilter<IUser> = {
			op: LogicalOperator.OR,
			selectorFilters: [
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
		const filter1: SelectorFilter<IUser> = {
			op: SelectorFilterOperator.EQ,
			fields: {
				name: "Alice",
			},
		};
		expect(Utility.filterToString(filter1)).toBe('{"name":"Alice"}');

		const filter2: SelectorFilter<IUser> = {
			op: SelectorFilterOperator.EQ,
			fields: {
				id: BigInt(123),
			},
		};
		expect(Utility.filterToString(filter2)).toBe('{"id":123}');

		const filter3: SelectorFilter<IUser1> = {
			op: SelectorFilterOperator.EQ,
			fields: {
				isActive: true,
			},
		};
		expect(Utility.filterToString(filter3)).toBe('{"isActive":true}');
	});

	it("selectorFilter_1", () => {
		const tigrisFilter: SelectorFilter<Student> = {
			op: SelectorFilterOperator.EQ,
			fields: {
				id: BigInt(1),
				name: "alice",
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"id":1,"name":"alice"}');
	});

	it("selectorFilter_2", () => {
		const tigrisFilter: SelectorFilter<Student> = {
			op: SelectorFilterOperator.EQ,
			fields: {
				id: BigInt(1),
				name: "alice",
				balance: 12.34,
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"id":1,"name":"alice","balance":12.34}');
	});

	it("selectorFilter_3", () => {
		const tigrisFilter: SelectorFilter<Student> = {
			op: SelectorFilterOperator.EQ,
			fields: {
				id: BigInt(1),
				name: "alice",
				balance: 12.34,
				"address.city": "San Francisco",
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe(
			'{"id":1,"name":"alice","balance":12.34,"address.city":"San Francisco"}'
		);
	});

	it("less than Filter", () => {
		const tigrisFilter: SelectorFilter<Student> = {
			op: SelectorFilterOperator.LT,
			fields: {
				balance: 10,
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"balance":{"$lt":10}}');
	});

	it("less than equals Filter", () => {
		const tigrisFilter: SelectorFilter<Student> = {
			op: SelectorFilterOperator.LTE,
			fields: {
				"address.zipcode": 10,
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"address.zipcode":{"$lte":10}}');
	});

	it("greater than Filter", () => {
		const tigrisFilter: SelectorFilter<Student> = {
			op: SelectorFilterOperator.GT,
			fields: {
				balance: 10,
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"balance":{"$gt":10}}');
	});

	it("greater than equals Filter", () => {
		const tigrisFilter: SelectorFilter<Student> = {
			op: SelectorFilterOperator.GTE,
			fields: {
				balance: 10,
			},
		};
		expect(Utility.filterToString(tigrisFilter)).toBe('{"balance":{"$gte":10}}');
	});

	it("logicalFilterTest1", () => {
		const logicalFilter: LogicalFilter<IUser> = {
			op: LogicalOperator.OR,
			selectorFilters: [
				{
					op: SelectorFilterOperator.EQ,
					fields: {
						name: "alice",
					},
				},
				{
					op: SelectorFilterOperator.EQ,
					fields: {
						name: "emma",
					},
				},
				{
					op: SelectorFilterOperator.GT,
					fields: {
						balance: 300,
					},
				},
			],
		};
		expect(Utility.filterToString(logicalFilter)).toBe(
			'{"$or":[{"name":"alice"},{"name":"emma"},{"balance":{"$gt":300}}]}'
		);
	});

	it("logicalFilterTest2", () => {
		const logicalFilter: LogicalFilter<IUser2> = {
			op: LogicalOperator.AND,
			selectorFilters: [
				{
					op: SelectorFilterOperator.EQ,
					fields: {
						name: "alice",
					},
				},
				{
					op: SelectorFilterOperator.EQ,
					fields: {
						rank: 1,
					},
				},
			],
		};
		expect(Utility.filterToString(logicalFilter)).toBe('{"$and":[{"name":"alice"},{"rank":1}]}');
	});

	it("nestedLogicalFilter1", () => {
		const logicalFilter1: LogicalFilter<Student> = {
			op: LogicalOperator.AND,
			selectorFilters: [
				{
					op: SelectorFilterOperator.EQ,
					fields: {
						name: "alice",
					},
				},
				{
					// Selector filter on nested field as an object. Alternate: "address.city": "Paris"
					address: {
						city: "Paris",
					},
				},
			],
		};
		const logicalFilter2: LogicalFilter<Student> = {
			op: LogicalOperator.AND,
			selectorFilters: [
				{
					op: SelectorFilterOperator.GTE,
					fields: {
						// filter on nested field as dot notation
						"address.zipcode": 1200,
					},
				},
				{
					op: SelectorFilterOperator.LTE,
					fields: {
						balance: 1000,
					},
				},
			],
		};
		const nestedLogicalFilter: LogicalFilter<Student> = {
			op: LogicalOperator.OR,
			logicalFilters: [logicalFilter1, logicalFilter2],
		};
		expect(Utility.filterToString(nestedLogicalFilter)).toBe(
			'{"$or":[{"$and":[{"name":"alice"},{"address.city":"Paris"}]},{"$and":[{"address.zipcode":{"$gte":1200}},{"balance":{"$lte":1000}}]}]}'
		);
	});

	it("nestedLogicalFilter2", () => {
		const logicalFilter1: LogicalFilter<IUser2> = {
			op: LogicalOperator.OR,
			selectorFilters: [
				{
					op: SelectorFilterOperator.EQ,
					fields: {
						name: "alice",
					},
				},
				{
					op: SelectorFilterOperator.EQ,
					fields: {
						rank: 1,
					},
				},
			],
		};
		const logicalFilter2: LogicalFilter<IUser2> = {
			op: LogicalOperator.OR,
			selectorFilters: [
				{
					op: SelectorFilterOperator.EQ,
					fields: {
						name: "emma",
					},
				},
				{
					op: SelectorFilterOperator.EQ,
					fields: {
						rank: 1,
					},
				},
			],
		};
		const nestedLogicalFilter: LogicalFilter<IUser2> = {
			op: LogicalOperator.AND,
			logicalFilters: [logicalFilter1, logicalFilter2],
		};
		expect(Utility.filterToString(nestedLogicalFilter)).toBe(
			'{"$and":[{"$or":[{"name":"alice"},{"rank":1}]},{"$or":[{"name":"emma"},{"rank":1}]}]}'
		);
	});
});

export interface IUser extends TigrisCollectionType {
	id: BigInt;
	name: string;
	balance: number;
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
}

export interface IUser2 extends TigrisCollectionType {
	id: BigInt;
	name: string;
	rank: number;
}

export interface Student extends TigrisCollectionType {
	id: BigInt;
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
