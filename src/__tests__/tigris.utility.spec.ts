import {Utility} from '../utility';

describe('utility tests', () => {
	it('base64encode', () => {
		expect(Utility._base64Encode('hello world')).toBe('aGVsbG8gd29ybGQ=');
		expect(Utility._base64Encode('tigris data')).toBe('dGlncmlzIGRhdGE=');
	});

	it('base64decode', () => {
		expect(Utility._base64Decode('aGVsbG8gd29ybGQ=')).toBe('hello world');
		expect(Utility._base64Decode('dGlncmlzIGRhdGE=')).toBe('tigris data');
	});
});
