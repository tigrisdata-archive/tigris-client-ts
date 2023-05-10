import { Utility } from "../utility";
import { TigrisCollection } from "../decorators/tigris-collection";
import { PrimaryKey } from "../decorators/tigris-primary-key";
import { Field } from "../decorators/tigris-field";
import { TigrisDataTypes, UpdateFields } from "../types";

describe("updateFields tests", () => {
	const testCases: Array<{
		name: string;
		input: UpdateFields<Books>;
		expected: string;
	}> = [
		{
			name: "simple update field",
			input: {
				title: "New title",
				price: 499,
				active: true,
			},
			expected: '{"$set":{"title":"New title","price":499,"active":true}}',
		},
		{
			name: "nested schema",
			input: {
				$increment: {
					"publisher.totalPublished": 1,
				},
				"publisher.name": "Wonderbooks",
			},
			expected:
				'{"$increment":{"publisher.totalPublished":1},"$set":{"publisher.name":"Wonderbooks"}}',
		},
		{
			name: "all operators",
			input: {
				$set: { title: "Kite Runner" },
				$unset: ["publisher.name", "active"],
				$multiply: { rating: 2.2 },
				$decrement: { quantity: 1, price: 3.53 },
				$increment: { "publisher.totalPublished": 1, price: 4.1 },
			},
			expected:
				'{"$set":{"title":"Kite Runner"},"$unset":["publisher.name","active"],"$multiply":{"rating":2.2},"$decrement":{"quantity":1,"price":3.53},"$increment":{"publisher.totalPublished":1,"price":4.1}}',
		},
		{
			name: "division update only",
			input: {
				$divide: { rating: 2.34 },
			},
			expected: '{"$divide":{"rating":2.34}}',
		},
		{
			name: "setting field to an object",
			input: {
				publisher: { totalPublished: 24, name: "Urban books" } as Publisher,
			},
			expected: '{"$set":{"publisher":{"totalPublished":24,"name":"Urban books"}}}',
		},
		{
			name: "setting update fields to an array",
			input: {
				categories: ["tales", "stories"],
			},
			expected: '{"$set":{"categories":["tales","stories"]}}',
		},
		{
			name: "push an element to an array",
			input: {
				$push: {
					categories: "fiction",
				},
			},
			expected: '{"$push":{"categories":"fiction"}}',
		},
		{
			name: "push an object element to an array",
			input: {
				$push: {
					authors: {
						firstName: "James",
						lastName: "Bond",
					},
				},
			},
			expected: '{"$push":{"authors":{"firstName":"James","lastName":"Bond"}}}',
		},
	];

	it.each(testCases)("Serializing '$name' to string", (fixture) => {
		expect(Utility.updateFieldsString(fixture.input)).toBe(fixture.expected);
	});
});

class Author {
	@Field()
	firstName: string;

	@Field()
	lastName: string;
}

class Publisher {
	@Field()
	totalPublished: number;

	@Field()
	name: string;
}

@TigrisCollection("books")
class Books {
	@PrimaryKey({ order: 1 })
	id: string;

	@Field()
	title: string;

	@Field()
	price: number;

	@Field()
	active: boolean;

	@Field()
	quantity: number;

	@Field({ elements: TigrisDataTypes.STRING })
	categories: string[];

	@Field()
	rating: number;

	@Field()
	publisher: Publisher;

	@Field(TigrisDataTypes.ARRAY, { elements: TigrisDataTypes.OBJECT })
	authors: Author[];
}
