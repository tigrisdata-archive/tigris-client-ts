import {
	Filter,
	LogicalFilter,
	LogicalOperator,
	ReadFields,
	TigrisCollectionType,
	UpdateFields,
	UpdateFieldsOperator
} from "../types";
import {Utility} from './../utility';

describe('success tests', () => {
	it('basicFilterTest', () => {
		const filter1: Filter = {
			key: 'name',
			val: 'Alice'
		}
		expect(Utility.filterString(filter1)).toBe('{"name":"Alice"}');

		const filter2: Filter = {
			key: 'id',
			val: 123
		}
		expect(Utility.filterString(filter2)).toBe('{"id":123}');

		const filter3: Filter = {
			key: 'isActive',
			val: true
		}
		expect(Utility.filterString(filter3)).toBe('{"isActive":true}');
	});

	it('logicalFilterTestOr', () => {
		const logicalFilter: LogicalFilter = {
			logicalOperator: LogicalOperator.OR,
			filters: [
				{
					key: 'name',
					val: 'alice'
				},
				{
					key: 'name',
					val: 'emma'
				}
			]
		}
		expect(Utility._logicalFilterString(logicalFilter)).toBe('{"$or":[{"name":"alice"},{"name":"emma"}]}');
	});

	it('logicalFilterTestAnd', () => {
		const logicalFilter: LogicalFilter = {
			logicalOperator: LogicalOperator.AND,
			filters: [
				{
					key: 'name',
					val: 'alice'
				},
				{
					key: 'rank',
					val: 1
				}
			]
		}
		expect(Utility._logicalFilterString(logicalFilter)).toBe('{"$and":[{"name":"alice"},{"rank":1}]}');
	});

	it('jsonSerDe', () => {
		const user: IUser =
			{
				id: BigInt('9223372036854775807'),
				name: 'Alice',
				balance: 123
			};
		const userString = Utility.objToJsonString(user);
		expect(userString).toBe('{"id":9223372036854775807,"name":"Alice","balance":123}');

		const deserializedUser = Utility.jsonStringToObj<IUser>('{"id":9223372036854775807,"name":"Alice","balance":123}');
		expect(deserializedUser.id).toBe(BigInt('9223372036854775807'))
		expect(deserializedUser.name).toBe('Alice')
		expect(deserializedUser.balance).toBe(123)
	});

	it('nestedLogicalFilter1', () => {
		const logicalFilter1: LogicalFilter = {
			logicalOperator: LogicalOperator.AND,
			filters: [
				{
					key: 'name',
					val: 'alice'
				},
				{
					key: 'rank',
					val: 1
				}
			]
		}
		const logicalFilter2: LogicalFilter = {
			logicalOperator: LogicalOperator.AND,
			filters: [
				{
					key: 'name',
					val: 'emma'
				},
				{
					key: 'rank',
					val: 1
				}
			]
		}
		const nestedLogicalFilter: LogicalFilter = {
			logicalOperator: LogicalOperator.OR,
			logicalFilters: [logicalFilter1, logicalFilter2]
		}
		expect(Utility._logicalFilterString(nestedLogicalFilter)).toBe('{"$or":[{"$and":[{"name":"alice"},{"rank":1}]},{"$and":[{"name":"emma"},{"rank":1}]}]}');
	});

	it('nestedLogicalFilter2', () => {
		const logicalFilter1: LogicalFilter = {
			logicalOperator: LogicalOperator.OR,
			filters: [
				{
					key: 'name',
					val: 'alice'
				},
				{
					key: 'rank',
					val: 1
				}
			]
		}
		const logicalFilter2: LogicalFilter = {
			logicalOperator: LogicalOperator.OR,
			filters: [
				{
					key: 'name',
					val: 'emma'
				},
				{
					key: 'rank',
					val: 1
				}
			]
		}
		const nestedLogicalFilter: LogicalFilter = {
			logicalOperator: LogicalOperator.AND,
			logicalFilters: [logicalFilter1, logicalFilter2]
		}
		expect(Utility._logicalFilterString(nestedLogicalFilter)).toBe('{"$and":[{"$or":[{"name":"alice"},{"rank":1}]},{"$or":[{"name":"emma"},{"rank":1}]}]}');
	});

	it('readFields1', () => {
		const readFields: ReadFields = {
			include: ['id', 'title'],
		};
		expect(Utility.readFieldString(readFields)).toBe('{"id":true,"title":true}');
	});
	it('readFields2', () => {
		const readFields: ReadFields = {
			exclude: ['id', 'title'],
		};
		expect(Utility.readFieldString(readFields)).toBe('{"id":false,"title":false}');
	});
	it('readFields3', () => {
		const readFields: ReadFields = {
			include: ['id', 'title'],
			exclude: ['author']
		};
		expect(Utility.readFieldString(readFields)).toBe('{"id":true,"title":true,"author":false}');
	});

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

export interface IUser extends TigrisCollectionType {
	id: BigInt;
	name: string;
	balance: number;
}
