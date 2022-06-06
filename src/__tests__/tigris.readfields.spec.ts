import {
	ReadFields,
} from "../types";
import {Utility} from '../utility';

describe('success tests', () => {
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
});
