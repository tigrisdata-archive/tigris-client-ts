import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import {
	CommitTransactionRequest as ProtoCommitTransactionRequest,
	RollbackTransactionRequest as ProtoRollbackTransactionRequest,
} from "./proto/server/v1/api_pb";
import { CommitTransactionResponse, RollbackTransactionResponse } from "./types";
import {Utility} from "./utility";

export class Session {
	private readonly _id: string;
	private readonly _origin: string;
	private readonly grpcClient: TigrisClient;
	private readonly db: string;

	constructor(id: string, origin: string, grpcClient: TigrisClient, db: string) {
		this._id = id;
		this._origin = origin;
		this.grpcClient = grpcClient;
		this.db = db;
	}

	get id(): string {
		return this._id;
	}

	get origin(): string {
		return this._origin;
	}

	public commit(): Promise<CommitTransactionResponse> {
		return new Promise<CommitTransactionResponse>((resolve, reject) => {
			const request = new ProtoCommitTransactionRequest().setDb(this.db);
			this.grpcClient.commitTransaction(request,  Utility.txToMetadata(this), (error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(new CommitTransactionResponse(response.getStatus()));
				}
			});
		});
	}

	public rollback(): Promise<RollbackTransactionResponse> {
		return new Promise<RollbackTransactionResponse>((resolve, reject) => {
			const request = new ProtoRollbackTransactionRequest().setDb(this.db);
			this.grpcClient.rollbackTransaction(request, Utility.txToMetadata(this),(error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(new RollbackTransactionResponse(response.getStatus()));
				}
			});
		});
	}
}
