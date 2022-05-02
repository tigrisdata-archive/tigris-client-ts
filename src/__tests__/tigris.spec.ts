import {Tigris} from '../tigris';
import grpc from 'grpc';
import {TigrisService} from '../proto/server/v1/api_grpc_pb';
import TestService, {TestTigrisService} from './TestService';
import {DatabaseOptions} from "../types";

describe('success tests', () => {
    let server: grpc.Server;
    let serverPort: number;
    beforeAll(() => {
        server = new grpc.Server();
        server.addService(TigrisService, TestService.handler);
        serverPort = server.bind(
            '0.0.0.0:0',
            grpc.ServerCredentials.createInsecure(),
        );
        server.start();
    });

    afterAll(() => {
        server.forceShutdown();
    });

    it('listDatabase', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + serverPort});
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
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + serverPort});
        const dbCreationPromise = tigris.createDatabaseIfNotExists('db6', new DatabaseOptions());
        dbCreationPromise
            .then((value) => {
                    expect(value.db).toBe('db6');
                },
            );

        return dbCreationPromise;
    });

    it('dropDatabase', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + serverPort});
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
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + serverPort});
        const db1 = tigris.getDatabase('db1');
        expect(db1.db).toBe('db1')
    });

    it('listCollections1', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + serverPort});
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
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + serverPort});
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
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + serverPort});
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
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + serverPort});
        const db1 = tigris.getDatabase('db3');

        const dropCollectionPromise = db1.dropCollection('db3_coll_2');
        dropCollectionPromise.then(value => {
            expect(value.status).toBe('dropped');
            expect(value.message).toBe('db3_coll_2 dropped successfully');
        })
        return dropCollectionPromise;
    });

    it('getCollection', () => {
        const tigris = new Tigris({serverUrl: '0.0.0.0:' + serverPort});
        const db1 = tigris.getDatabase('db3');
        const collection = db1.getCollection('db3_coll_2');
        expect(collection.collectionName).toBe('db3_coll_2');
    });
});

