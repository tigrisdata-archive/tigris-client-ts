import {IObservabilityServer, ObservabilityService} from "../proto/server/v1/observability_grpc_pb";
import {sendUnaryData, ServerUnaryCall} from "@grpc/grpc-js";
import {
	GetInfoRequest,
	GetInfoResponse,
	QueryTimeSeriesMetricsRequest,
	QueryTimeSeriesMetricsResponse,
	QuotaLimitsRequest,
	QuotaLimitsResponse, QuotaUsageRequest, QuotaUsageResponse
} from "../proto/server/v1/observability_pb";

export class TestTigrisObservabilityService {
	public impl: IObservabilityServer = {
		quotaLimits(call: ServerUnaryCall<QuotaLimitsRequest, QuotaLimitsResponse>, callback: sendUnaryData<QuotaLimitsResponse>): void {
		},
		quotaUsage(call: ServerUnaryCall<QuotaUsageRequest, QuotaUsageResponse>, callback: sendUnaryData<QuotaUsageResponse>): void {
		},
		queryTimeSeriesMetrics(call: ServerUnaryCall<QueryTimeSeriesMetricsRequest, QueryTimeSeriesMetricsResponse>, callback: sendUnaryData<QueryTimeSeriesMetricsResponse>): void {
			// not implemented
			},
		/* eslint-disable @typescript-eslint/no-empty-function */
		getInfo(
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			call: ServerUnaryCall<GetInfoRequest, GetInfoResponse>,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			callback: sendUnaryData<GetInfoResponse>
		): void {
			const reply: GetInfoResponse = new GetInfoResponse();
			reply.setServerVersion("1.0.0-test-service");
			callback(undefined, reply);
		}
	}
}

export default {
	service: ObservabilityService,
	handler: new TestTigrisObservabilityService(),
};
