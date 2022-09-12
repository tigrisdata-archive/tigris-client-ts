import {CollectionType, TigrisCollectionType, TigrisDataTypes, TigrisSchema,} from "../types";
import {Utility} from "../utility";

describe("schema tests", () => {

	it("basicCollection", () => {
		const schema: TigrisSchema<BasicCollection> = {
			id: {
				type: TigrisDataTypes.INT32,
				primary_key: {
					order: 1,
					autoGenerate: true
				}
			},
			name: {
				type: TigrisDataTypes.STRING
			},
			uuid: {
				type: TigrisDataTypes.UUID
			},
			int32Number: {
				type: TigrisDataTypes.INT32
			},
			int64Number: {
				type: TigrisDataTypes.INT64
			},
			date: {
				type: TigrisDataTypes.DATE_TIME
			},
			bytes: {
				type: TigrisDataTypes.BYTE_STRING
			}
		};
		expect(Utility._toJSONSchema("basicCollection", CollectionType.DOCUMENTS, schema))
			.toBe(Utility._readTestDataFile("basicCollection.json"));
	});

	it("basicCollectionWithObjectType", () => {
		const schema: TigrisSchema<BasicCollectionWithObject> = {
			id: {
				type: TigrisDataTypes.INT64,
				primary_key: {
					order: 1,
					autoGenerate: true
				}
			},
			name: {
				type: TigrisDataTypes.STRING
			},
			metadata: {
				type: TigrisDataTypes.OBJECT
			}
		};
		expect(Utility._toJSONSchema("basicCollectionWithObjectType", CollectionType.DOCUMENTS, schema))
			.toBe(Utility._readTestDataFile("basicCollectionWithObjectType.json"));
	});

	it("multiplePKeys", () => {
		const schema: TigrisSchema<BasicCollection> = {
			id: {
				type: TigrisDataTypes.INT64,
				primary_key: {
					order: 2, // intentionally the order is skewed to test
				}
			},
			name: {
				type: TigrisDataTypes.STRING
			},
			uuid: {
				type: TigrisDataTypes.UUID,
				primary_key: {
					order: 1,
					autoGenerate: true
				}
			},
			int32Number: {
				type: TigrisDataTypes.INT32
			},
			int64Number: {
				type: TigrisDataTypes.INT64
			},
			date: {
				type: TigrisDataTypes.DATE_TIME
			},
			bytes: {
				type: TigrisDataTypes.BYTE_STRING
			}
		};
		expect(Utility._toJSONSchema("multiplePKeys", CollectionType.DOCUMENTS, schema))
			.toBe(Utility._readTestDataFile("multiplePKeys.json"));
	});

	it("nestedCollection", () => {
		const addressSchema: TigrisSchema<Address> = {
			city: {
				type: TigrisDataTypes.STRING
			},
			state: {
				type: TigrisDataTypes.STRING
			},
			zipcode: {
				type: TigrisDataTypes.NUMBER
			}
		};
		const schema: TigrisSchema<NestedCollection> = {
			id: {
				type: TigrisDataTypes.NUMBER
			},
			name: {
				type: TigrisDataTypes.STRING
			},
			address: {
				type: addressSchema
			}
		};
		expect(Utility._toJSONSchema("nestedCollection", CollectionType.DOCUMENTS, schema))
			.toBe(Utility._readTestDataFile("nestedCollection.json"));
	});

	it("collectionWithPrimitiveArrays", () => {
		const schema: TigrisSchema<CollectionWithPrimitiveArrays> = {
			id: {
				type: TigrisDataTypes.NUMBER
			},
			name: {
				type: TigrisDataTypes.STRING
			},
			tags: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: TigrisDataTypes.STRING
				}
			}
		};
		expect(Utility._toJSONSchema("collectionWithPrimitiveArrays", CollectionType.DOCUMENTS, schema))
			.toBe(Utility._readTestDataFile("collectionWithPrimitiveArrays.json"));
	});

	it("collectionWithObjectArrays", () => {
		const addressSchema: TigrisSchema<Address> = {
			city: {
				type: TigrisDataTypes.STRING
			},
			state: {
				type: TigrisDataTypes.STRING
			},
			zipcode: {
				type: TigrisDataTypes.NUMBER
			}
		};
		const schema: TigrisSchema<CollectionWithObjectArrays> = {
			id: {
				type: TigrisDataTypes.NUMBER
			},
			name: {
				type: TigrisDataTypes.STRING
			},
			knownAddresses: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: addressSchema
				}
			}
		};
		expect(Utility._toJSONSchema("collectionWithObjectArrays", CollectionType.DOCUMENTS, schema))
			.toBe(Utility._readTestDataFile("collectionWithObjectArrays.json"));
	});

	it("multiLevelPrimitiveArray", () => {
		const schema: TigrisSchema<MultiLevelPrimitiveArray> = {
			oneDArray: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: TigrisDataTypes.STRING
				}
			},
			twoDArray: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: TigrisDataTypes.ARRAY,
					items: {
						type: TigrisDataTypes.STRING
					}
				}
			},
			threeDArray: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: TigrisDataTypes.ARRAY,
					items: {
						type: TigrisDataTypes.ARRAY,
						items: {
							type: TigrisDataTypes.STRING
						}
					}
				}
			},
			fourDArray: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: TigrisDataTypes.ARRAY,
					items: {
						type: TigrisDataTypes.ARRAY,
						items: {
							type: TigrisDataTypes.ARRAY,
							items: {
								type: TigrisDataTypes.STRING
							}
						}
					}
				}
			},
			fiveDArray: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: TigrisDataTypes.ARRAY,
					items: {
						type: TigrisDataTypes.ARRAY,
						items: {
							type: TigrisDataTypes.ARRAY,
							items: {
								type: TigrisDataTypes.ARRAY,
								items: {
									type: TigrisDataTypes.STRING
								}
							}
						}
					}
				}
			}
		};
		expect(Utility._toJSONSchema("multiLevelPrimitiveArray", CollectionType.DOCUMENTS, schema))
			.toBe(Utility._readTestDataFile("multiLevelPrimitiveArray.json"));
	});

	it("multiLevelObjectArray", () => {
		const addressSchema: TigrisSchema<Address> = {
			city: {
				type: TigrisDataTypes.STRING
			},
			state: {
				type: TigrisDataTypes.STRING
			},
			zipcode: {
				type: TigrisDataTypes.NUMBER
			}
		};
		const schema: TigrisSchema<MultiLevelObjectArray> = {
			oneDArray: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: addressSchema
				}
			},
			twoDArray: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: TigrisDataTypes.ARRAY,
					items: {
						type: addressSchema
					}
				}
			},
			threeDArray: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: TigrisDataTypes.ARRAY,
					items: {
						type: TigrisDataTypes.ARRAY,
						items: {
							type: addressSchema
						}
					}
				}
			},
			fourDArray: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: TigrisDataTypes.ARRAY,
					items: {
						type: TigrisDataTypes.ARRAY,
						items: {
							type: TigrisDataTypes.ARRAY,
							items: {
								type: addressSchema
							}
						}
					}
				}
			},
			fiveDArray: {
				type: TigrisDataTypes.ARRAY,
				items: {
					type: TigrisDataTypes.ARRAY,
					items: {
						type: TigrisDataTypes.ARRAY,
						items: {
							type: TigrisDataTypes.ARRAY,
							items: {
								type: TigrisDataTypes.ARRAY,
								items: {
									type: addressSchema
								}
							}
						}
					}
				}
			}
		};
		expect(Utility._toJSONSchema("multiLevelObjectArray", CollectionType.DOCUMENTS, schema))
			.toBe(Utility._readTestDataFile("multiLevelObjectArray.json"));
	});
});

interface BasicCollection extends TigrisCollectionType {
	id: number;
	name: string;
	uuid: string;
	int32Number: number;
	int64Number: number;
	date: string;
	bytes: string;
}

interface BasicCollectionWithObject extends TigrisCollectionType {
	id: number;
	name: string;
	metadata: object;
}

interface NestedCollection extends TigrisCollectionType {
	id: number;
	name: string;
	address: Address
}

interface CollectionWithPrimitiveArrays extends TigrisCollectionType {
	id: number;
	name: string;
	tags: string[];
}

interface CollectionWithObjectArrays extends TigrisCollectionType {
	id: number;
	name: string;
	knownAddresses: Address[];
}

interface MultiLevelPrimitiveArray extends TigrisCollectionType {
	oneDArray: string[];
	twoDArray: string[][];
	threeDArray: string[][][];
	fourDArray: string[][][][];
	fiveDArray: string[][][][][];
}

interface MultiLevelObjectArray extends TigrisCollectionType {
	oneDArray: Address[];
	twoDArray: Address[][];
	threeDArray: Address[][][];
	fourDArray: Address[][][][];
	fiveDArray: Address[][][][][];
}

interface Address {
	city: string;
	state: string;
	zipcode: number;
}
