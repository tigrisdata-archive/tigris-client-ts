import {TigrisClient} from "./proto/server/v1/api_grpc_pb";
import * as grpc from "@grpc/grpc-js";
import {status} from "@grpc/grpc-js";
import {
	CreateDatabaseRequest as ProtoCreateDatabaseRequest,
	DatabaseOptions as ProtoDatabaseOptions,
	DropDatabaseRequest as ProtoDropDatabaseRequest,
	GetInfoRequest as ProtoGetInfoRequest,
	ListDatabasesRequest as ProtoListDatabasesRequest
} from "./proto/server/v1/api_pb";
import {
	DatabaseInfo,
	DatabaseMetadata,
	DatabaseOptions,
	DropDatabaseResponse,
	ServerMetadata
} from "./types";

import {DB} from "./db";

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
		this.grpcClient = new TigrisClient(config.serverUrl, grpc.credentials.createInsecure());
	}

	/**
	 * Lists the databases
	 * @return {Promise<Array<DatabaseInfo>>} a promise of an array of
	 * DatabaseInfo
	 */
	public listDatabases(): Promise<Array<DatabaseInfo>> {
		return new Promise<Array<DatabaseInfo>>((resolve, reject) => {
			this.grpcClient.listDatabases(new ProtoListDatabasesRequest(), (error, response) => {
				if (error) {
					reject(error);
				} else {
					const result = response
						.getDatabasesList()
						.map(
							(protoDatabaseInfo) =>
								new DatabaseInfo(protoDatabaseInfo.getDb(), new DatabaseMetadata())
						);
					resolve(result);
				}
			});
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public createDatabaseIfNotExists(db: string, _options?: DatabaseOptions): Promise<DB> {
		return new Promise<DB>((resolve, reject) => {
			this.grpcClient.createDatabase(
				new ProtoCreateDatabaseRequest().setDb(db).setOptions(new ProtoDatabaseOptions()),
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				(error, _response) => {
					if (error && error.code != status.ALREADY_EXISTS) {
						reject(error);
					} else {
						resolve(new DB(db, this.grpcClient));
					}
				}
			);
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public dropDatabase(db: string, _options?: DatabaseOptions): Promise<DropDatabaseResponse> {
		return new Promise<DropDatabaseResponse>((resolve, reject) => {
			this.grpcClient.dropDatabase(
				new ProtoDropDatabaseRequest().setDb(db).setOptions(new ProtoDatabaseOptions()),
				(error, response) => {
					if (error) {
						reject(error);
					} else {
						resolve(new DropDatabaseResponse(response.getStatus(), response.getMessage()));
					}
				}
			);
		});
	}

	public getDatabase(db: string): DB {
		return new DB(db, this.grpcClient);
	}

	public getServerMetadata(): Promise<ServerMetadata> {
		return new Promise<ServerMetadata>((resolve, reject) => {
			this.grpcClient.getInfo(new ProtoGetInfoRequest(), (error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(new ServerMetadata(response.getServerVersion()));
				}
			});
		});
	}
}

/**
 * Default instance of the Tigris client
 */
export default new Tigris({serverUrl: `${process.env.TIGRIS_SERVER_URL}`});
