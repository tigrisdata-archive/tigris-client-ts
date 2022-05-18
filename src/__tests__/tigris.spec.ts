import {Filter, LogicalFilter, LogicalOperator, Tigris, Utility} from '../tigris';
import {Server, ServerCredentials} from '@grpc/grpc-js';
import {TigrisService} from '../proto/server/v1/api_grpc_pb';
import TestService, {TestTigrisService} from './test-service';
import {DatabaseOptions, TigrisCollectionType} from "../types";

describe('success tests', () => {
    let server: Server;
    const SERVER_PORT = 5002;
    beforeAll(() => {
        server = new Server();
        TestTigrisService.reset();
        server.addService(TigrisService, TestService.handler.impl);
        server.bindAsync(
            '0.0.0.0:' + SERVER_PORT,
            // test purpose only
            ServerCredentials.createInsecure(),
            (err: Error | null) => {
                if (err) {
                    console.log(err)
                } else {
                    server.start();
                }
            }
        );
    });
    beforeEach(() => {
        TestTigrisService.reset();
    });
    afterAll(() => {
        server.forceShutdown();
    });


    it('listDatabase', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const listDbsPromise = tigris.listDatabases();
        listDbsPromise
            .then((value) => {
                    expect(value.length).toBe(5);
                    expect(value[0].name).toBe('db1');
                    expect(value[1].name).toBe('db2');
                    expect(value[2].name).toBe('db3');
                    expect(value[3].name).toBe('db4');
                    expect(value[4].name).toBe('db5');
                },
            );

        return listDbsPromise;
    });

    it('createDatabaseIfNotExists', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const dbCreationPromise = tigris.createDatabaseIfNotExists('db6', new DatabaseOptions());
        dbCreationPromise
            .then((value) => {
                    expect(value.db).toBe('db6');
                },
            );

        return dbCreationPromise;
    });

    it('dropDatabase', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const dbDropPromise = tigris.dropDatabase('db6', new DatabaseOptions());
        dbDropPromise
            .then((value) => {
                    expect(value.status).toBe('dropped');
                    expect(value.message).toBe('db6 dropped successfully');
                },
            );
        return dbDropPromise;
    });

    it('getDatabase', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db1');
        expect(db1.db).toBe('db1')
    });

    it('listCollections1', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db1');

        const listCollectionPromise = db1.listCollections();
        listCollectionPromise.then(value => {
            expect(value.length).toBe(5);
            expect(value[0].name).toBe('db1_coll_1');
            expect(value[1].name).toBe('db1_coll_2');
            expect(value[2].name).toBe('db1_coll_3');
            expect(value[3].name).toBe('db1_coll_4');
            expect(value[4].name).toBe('db1_coll_5');
        })
        return listCollectionPromise;
    });

    it('listCollections2', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db3');

        const listCollectionPromise = db1.listCollections();
        listCollectionPromise.then(value => {
            expect(value.length).toBe(5);
            expect(value[0].name).toBe('db3_coll_1');
            expect(value[1].name).toBe('db3_coll_2');
            expect(value[2].name).toBe('db3_coll_3');
            expect(value[3].name).toBe('db3_coll_4');
            expect(value[4].name).toBe('db3_coll_5');
        })
        return listCollectionPromise;
    });

    it('describeDatabase', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db3');

        const databaseDescriptionPromise = db1.describe();
        databaseDescriptionPromise.then(value => {
            expect(value.db).toBe('db3')
            expect(value.collectionsDescription.length).toBe(5)
            expect(value.collectionsDescription[0].collection).toBe('db3_coll_1');
            expect(value.collectionsDescription[1].collection).toBe('db3_coll_2');
            expect(value.collectionsDescription[2].collection).toBe('db3_coll_3');
            expect(value.collectionsDescription[3].collection).toBe('db3_coll_4');
            expect(value.collectionsDescription[4].collection).toBe('db3_coll_5');
        })
        return databaseDescriptionPromise;
    });

    it('dropCollection', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db3');

        const dropCollectionPromise = db1.dropCollection('db3_coll_2');
        dropCollectionPromise.then(value => {
            expect(value.status).toBe('dropped');
            expect(value.message).toBe('db3_coll_2 dropped successfully');
        })
        return dropCollectionPromise;
    });

    it('getCollection', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db3');
        const books = db1.getCollection<IBook>('books');
        expect(books.collectionName).toBe('books');
    });

    it('insert', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db3');
        const insertionPromise = db1.getCollection<IBook>('books').insert({
            author: "author name",
            id: 0,
            tags: ['science'],
            title: 'science book'
        });
        insertionPromise.then(value => {
            expect(value.status).toBe('inserted: "{\\"author\\":\\"author name\\",\\"id\\":0,\\"tags\\":[\\"science\\"],\\"title\\":\\"science book\\"}"');
        })
        return insertionPromise;
    });

    it('basicFilterTest', () => {
        const filter1: Filter<string> = {
            key: 'name',
            val: 'Alice'
        }
        expect(Utility.filterString(filter1)).toBe('{"name":"Alice"}');

        const filter2: Filter<number> = {
            key: 'id',
            val: 123
        }
        expect(Utility.filterString(filter2)).toBe('{"id":123}');

        const filter3: Filter<boolean> = {
            key: 'isActive',
            val: true
        }
        expect(Utility.filterString(filter3)).toBe('{"isActive":true}');
    });

    it('logicalFilterTestOr', () => {
        const logicalFilter: LogicalFilter<string> = {
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
        expect(Utility.logicalFilterString(logicalFilter)).toBe('{"$or":[{"name":"alice"},{"name":"emma"}]}');
    });

    it('logicalFilterTestAnd', () => {
        const logicalFilter: LogicalFilter<string | number> = {
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
        expect(Utility.logicalFilterString(logicalFilter)).toBe('{"$and":[{"name":"alice"},{"rank":1}]}');
    });

    it('nestedLogicalFilter1', () => {
        const logicalFilter1: LogicalFilter<string | number | boolean> = {
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
        const logicalFilter2: LogicalFilter<string | number | boolean> = {
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
        const nestedLogicalFilter: LogicalFilter<string | number | boolean> = {
            logicalOperator: LogicalOperator.OR,
            logicalFilters: [logicalFilter1, logicalFilter2]
        }
        expect(Utility.logicalFilterString(nestedLogicalFilter)).toBe('{"$or":[{"$and":[{"name":"alice"},{"rank":1}]},{"$and":[{"name":"emma"},{"rank":1}]}]}');
    });

    it('nestedLogicalFilter2', () => {
        const logicalFilter1: LogicalFilter<string | number | boolean> = {
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
        const logicalFilter2: LogicalFilter<string | number | boolean> = {
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
        const nestedLogicalFilter: LogicalFilter<string | number | boolean> = {
            logicalOperator: LogicalOperator.AND,
            logicalFilters: [logicalFilter1, logicalFilter2]
        }
        expect(Utility.logicalFilterString(nestedLogicalFilter)).toBe('{"$and":[{"$or":[{"name":"alice"},{"rank":1}]},{"$or":[{"name":"emma"},{"rank":1}]}]}');
    });

});

export interface IBook extends TigrisCollectionType {
    id: number;
    title: string;
    author: string;
    tags?: string[];
}
