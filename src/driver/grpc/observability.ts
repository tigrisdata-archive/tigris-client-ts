import { ObservabilityDriver } from "../driver";
import { ChannelCredentials, ClientOptions } from "@grpc/grpc-js";
import { ObservabilityClient } from "../../proto/server/v1/observability_grpc_pb";
import { GetInfoRequest as ProtoGetInfoRequest } from "../../proto/server/v1/observability_pb";
import { TigrisClientConfig } from "../../tigris";
import { ServerMetadata } from "../../types";

export class Observability implements ObservabilityDriver {
	observabilityClient: ObservabilityClient;
	constructor(
		config: TigrisClientConfig,
		channelCredentials: ChannelCredentials,
		opts: ClientOptions
	) {
		this.observabilityClient = new ObservabilityClient(config.serverUrl, channelCredentials, opts);
	}
	getInfo(): Promise<ServerMetadata> {
		return new Promise<ServerMetadata>((resolve, reject) => {
			this.observabilityClient.getInfo(new ProtoGetInfoRequest(), (error, response) => {
				if (error) {
					reject(error);
				} else {
					resolve(new ServerMetadata(response.getServerVersion()));
				}
			});
		});
	}
}
