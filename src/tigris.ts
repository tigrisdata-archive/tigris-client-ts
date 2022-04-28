import {TigrisClient} from './proto/server/v1/api_grpc_pb';
import * as grpc from 'grpc';
import {DatabaseInfo, ListDatabasesRequest} from './proto/server/v1/api_pb';

export interface TigrisClientConfig {
    serverUrl: string;
}

/**
 * Tigris client
 */
export class Tigris {
    grpcClient: TigrisClient;

    /**
     *
     * @param  {TigrisClientConfig} config configuration
     */
    constructor(config: TigrisClientConfig) {
        this.grpcClient = new TigrisClient(
            config.serverUrl,
            grpc.credentials.createInsecure(),
        );
    }

    /**
     * Lists the databases
     * @return {Promise<Array<DatabaseInfo>>} a promise of an array of
     * DatabaseInfo
     */
    public listDatabases(): Promise<Array<DatabaseInfo>> {
        return new Promise<Array<DatabaseInfo>>((resolve, reject) => {
            this.grpcClient.listDatabases(
                new ListDatabasesRequest(),
                (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(response.getDatabasesList());
                    }
                },
            );
        });
    }
}

/**
 * Tigris Database
 */
export class DB {
}

/**
 * A marker type for collection model
 */
export interface TigrisCollectionType {
}

/**
 * Tigris Collection
 */
export class Collection {
}

/**
 * Default instance of the Tigrisclient
 */
export default new Tigris({serverUrl: `${process.env.TIGRIS_SERVER_URL}`});
