import {
	TigrisCollectionType,
} from "../types";
import {Utility} from '../utility';

describe('success tests', () => {

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
});

export interface IUser extends TigrisCollectionType {
	id: BigInt;
	name: string;
	balance: number;
}
