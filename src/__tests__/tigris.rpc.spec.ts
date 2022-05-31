
import {Server, ServerCredentials} from '@grpc/grpc-js';
import {TigrisService} from '../proto/server/v1/api_grpc_pb';
import TestService, {TestTigrisService} from './test-service';
import {DatabaseOptions, Filter, LogicalFilter, LogicalOperator, ReadFields, TigrisCollectionType, UpdateFields, UpdateFieldsOperator} from "../types";
import { Tigris } from './../tigris';
import { Utility } from './../utility';

describe('success rpc tests', () => {
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

    it('delete', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db3');
        const deletionPromise = db1.getCollection<IBook>('books').delete({
            key: 'id',
            val: 1
        });
        deletionPromise.then(value => {
            expect(value.status).toBe('deleted: {"id":1}');
        })
        return deletionPromise;
    });

    it('update', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db3');
        const updatePromise = db1.getCollection<IBook>('books').update(
            {
                key: 'id',
                val: 1
            },
            {
                operator: UpdateFieldsOperator.SET,
                fields: {
                    title: 'New Title'
                }
            });
        updatePromise.then(value => {
            expect(value.status).toBe('updated: {"id":1}, {"$set":{"title":"New Title"}}');
        })
        return updatePromise;
    });

    it('readOne', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db3');
        const readOnePromise = db1.getCollection<IBook>('books').readOne({
            key: 'id',
            val: 1
        });
        readOnePromise.then(value => {
            const book: IBook = <IBook>value;
            expect(book.id).toBe(1);
            expect(book.title).toBe('A Passage to India');
            expect(book.author).toBe('E.M. Forster')
            expect(book.tags).toStrictEqual(["Novel", "India"])
        })
        return readOnePromise;
    });

    it('readOneRecordNotFound', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db3');
        const readOnePromise = db1.getCollection<IBook>('books').readOne({
            key: 'id',
            val: 2
        });
        readOnePromise.then((value) => {
            expect(value).toBe(undefined);
        })
        return readOnePromise;
    });

    it('readOneWithLogicalFilter', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db3');
        const readOnePromise: Promise<IBook | void> = db1.getCollection<IBook>('books').readOne({
            logicalOperator: LogicalOperator.AND,
            filters: [
                {
                    key: 'id',
                    val: 3
                },
                {
                    key: 'title',
                    val: 'In Search of Lost Time'
                }
            ]
        });
        readOnePromise.then(value => {
            const book: IBook = <IBook>value;
            expect(book.id).toBe(3);
            expect(book.title).toBe('In Search of Lost Time');
            expect(book.author).toBe('Marcel Proust')
            expect(book.tags).toStrictEqual(["Novel", "Childhood"])
        })
        return readOnePromise;
    });

    it('readMany', (done) => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db1 = tigris.getDatabase('db3');
        let bookCounter = 0;
        let success = true;
        success = true;
        db1.getCollection<IBook>('books').read({
            key: 'author',
            val: 'Marcel Proust'
        }, {
            onEnd() {
                // test service is coded to return 4 books back
                expect(bookCounter).toBe(4);
                expect(success).toBe(true);
                done();
            },
            onNext(book: IBook) {
                bookCounter++;
                expect(book.author).toBe('Marcel Proust')
            },
            onError(error: Error) {
                success = false;
            }
        });
    });

    it('beginTx', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db3 = tigris.getDatabase('db3');
        const beginTxPromise = db3.beginTransaction()
        beginTxPromise.then(value => {
            expect(value.id).toBe('id-test');
            expect(value.origin).toBe('origin-test');
        })
        return beginTxPromise;
    });

    it('commitTx', (done) => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db3 = tigris.getDatabase('db3');
        const beginTxPromise = db3.beginTransaction()
        beginTxPromise.then(session => {
            const commitTxResponse = session.commit()
            commitTxResponse.then(value => {
                expect(value.status).toBe('committed-test');
                done();
            })
        })
    });

    it('rollbackTx', (done) => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const db3 = tigris.getDatabase('db3');
        const beginTxPromise = db3.beginTransaction()
        beginTxPromise.then(session => {
            const rollbackTransactionResponsePromise = session.rollback()
            rollbackTransactionResponsePromise.then(value => {
                expect(value.status).toBe('rollback-test');
                done();
            })
        })
    });

    it('transact', (done) => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + SERVER_PORT});
        const txDB = tigris.getDatabase('test-tx');
        const books = txDB.getCollection<IBook>('books')
        txDB.transact(tx => {
            books.insert(
                {
                    id: 1,
                    author: 'Alice',
                    title: 'Some book title'
                },
                tx
            ).then(value => {
                books.readOne({
                    key: 'id',
                    val: 1
                }, undefined, tx).then(value1 => {
                    books.update({
                            key: 'id',
                            val: 1
                        },
                        {
                            operator: UpdateFieldsOperator.SET,
                            fields: {
                                'author':
                                    'Dr. Author'
                            }
                        }, tx).then(value2 => {
                        books.delete({
                            key: 'id',
                            val: 1
                        }, tx).then(value3 => done())
                    })
                })
            })

        });
    });

});

export interface IBook extends TigrisCollectionType {
	id: number;
	title: string;
	author: string;
	tags?: string[];
}
