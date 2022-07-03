import {Utility} from '../utility';
import {FacetQueryFieldType} from "../search/types";

describe('utility tests', () => {
	it('base64encode', () => {
		expect(Utility._base64Encode('hello world')).toBe('aGVsbG8gd29ybGQ=');
		expect(Utility._base64Encode('tigris data')).toBe('dGlncmlzIGRhdGE=');
	});

	it('base64decode', () => {
		expect(Utility._base64Decode('aGVsbG8gd29ybGQ=')).toBe('hello world');
		expect(Utility._base64Decode('dGlncmlzIGRhdGE=')).toBe('tigris data');
	});

	it('generates default facet query options', () => {
		const generatedOptions = Utility.createFacetQueryOptions();
		expect(generatedOptions.size).toBe(10);
		expect(generatedOptions.type).toBe(FacetQueryFieldType.VALUE);
	});

	it('backfills missing facet query options', () =>{
		const generatedOptions = Utility.createFacetQueryOptions({
			size: 55
		});
		expect(generatedOptions.size).toBe(55);
		expect(generatedOptions.type).toBe(FacetQueryFieldType.VALUE);
	});

	it('generates default search request options', () => {
		const generatedOptions = Utility.createSearchRequestOptions();
		expect(generatedOptions.page).toBe(1);
		expect(generatedOptions.perPage).toBe(10);
	});

	it('backfills missing search request options', () => {
		const generatedOptions = Utility.createSearchRequestOptions({
			perPage: 129
		});
		expect(generatedOptions.page).toBe(1);
		expect(generatedOptions.perPage).toBe(129);
	});
});
