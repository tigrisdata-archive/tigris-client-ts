import { ReadFields, TigrisCollectionType } from "../types";
import { Utility } from "../utility";

export interface IBook1 extends TigrisCollectionType {
	id?: number;
	title: string;
	author: Author;
	tags?: string[];
}

export interface Author extends TigrisCollectionType {
	firstName: string;
	lastName: string;
}
describe("readFields tests", () => {
	it("readFields1", () => {
		const readFields: ReadFields<IBook1> = {
			include: ["id", "title", "author.firstName", "author.lastName"],
		};
		expect(Utility.readFieldString<IBook1>(readFields)).toBe(
			'{"id":true,"title":true,"author.firstName":true,"author.lastName":true}'
		);
	});
	it("readFields2", () => {
		const readFields: ReadFields<IBook1> = {
			exclude: ["id", "title"],
		};
		expect(Utility.readFieldString<IBook1>(readFields)).toBe('{"id":false,"title":false}');
	});
	it("readFields3", () => {
		const readFields: ReadFields<IBook1> = {
			include: ["id", "title"],
			exclude: ["author"],
		};
		expect(Utility.readFieldString<IBook1>(readFields)).toBe(
			'{"id":true,"title":true,"author":false}'
		);
	});
});
