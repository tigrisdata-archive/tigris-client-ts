import {Utility} from "../../search/utility";
import {FacetQueryFieldType} from "../../search/types";

describe('Search utility', () => {
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
