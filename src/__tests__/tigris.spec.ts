
import {Tigris} from '../tigris';
import grpc from 'grpc';
import {TigrisService} from '../proto/server/v1/api_grpc_pb';
import TestService from './TestService';


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
    const dbInfosPromise = tigris.listDatabases();
    dbInfosPromise
        .then((value) => {
          expect(value.length).toBe(5);
          expect(value[0].getDb()).toBe('db1');
          expect(value[1].getDb()).toBe('db2');
          expect(value[2].getDb()).toBe('db3');
          expect(value[3].getDb()).toBe('db4');
          expect(value[4].getDb()).toBe('db5');
        },
        );

    return dbInfosPromise;
  });
});

