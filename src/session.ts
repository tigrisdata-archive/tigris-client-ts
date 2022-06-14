import { TigrisClient } from "./proto/server/v1/api_grpc_pb";
import {
	CommitTransactionRequest as ProtoCommitTransactionRequest,
	RollbackTransactionRequest as ProtoRollbackTransactionRequest,
	TransactionCtx as ProtoTransactionCtx,
} from "./proto/server/v1/api_pb";
import { CommitTransactionResponse, RollbackTransactionResponse } from "./types";

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
			const txCtx = new ProtoTransactionCtx().setId(this.id).setOrigin(this.origin);
			const request = new ProtoCommitTransactionRequest().setDb(this.db).setTxCtx(txCtx);
			this.grpcClient.commitTransaction(request, (error, response) => {
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
			const txCtx = new ProtoTransactionCtx().setId(this._id).setOrigin(this._origin);
			const request = new ProtoRollbackTransactionRequest().setDb(this.db).setTxCtx(txCtx);
			this.grpcClient.rollbackTransaction(request, (error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(new RollbackTransactionResponse(response.getStatus()));
				}
			});
		});
	}
}
