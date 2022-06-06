import {
	UpdateFields,
	UpdateFieldsOperator
} from "../types";
import {Utility} from '../utility';

describe('success tests', () => {

	it('updateFields', () => {
		const updateFields: UpdateFields = {
			operator: UpdateFieldsOperator.SET,
			fields: {
				title: 'New Title',
				price: 499,
				active: true,
			}
		};
		expect(Utility.updateFieldsString(updateFields)).toBe('{"$set":{"title":"New Title","price":499,"active":true}}');
	});
});
