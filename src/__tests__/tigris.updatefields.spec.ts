import { SimpleUpdateField, UpdateFields, UpdateFieldsOperator } from "../types";
import { Utility } from "../utility";

describe("updateFields tests", () => {
	it("updateFields", () => {
		const updateFields: UpdateFields = {
			op: UpdateFieldsOperator.SET,
			fields: {
				title: "New Title",
				price: 499,
				active: true,
			},
		};
		expect(Utility.updateFieldsString(updateFields)).toBe(
			'{"$set":{"title":"New Title","price":499,"active":true}}'
		);
	});

	it("simpleUpdateField", () => {
		const updateFields: SimpleUpdateField = {
			title: "New Title",
			price: 499,
			active: true,
		};
		expect(Utility.updateFieldsString(updateFields)).toBe(
			'{"$set":{"title":"New Title","price":499,"active":true}}'
		);
	});
});
