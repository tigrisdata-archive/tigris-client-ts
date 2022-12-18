import * as proto from "../proto/server/v1/realtime_pb";

export function connectedMessage(event: Uint8Array | string): proto.ConnectedMessage.AsObject {
	return proto.ConnectedMessage.deserializeBinary(event as Uint8Array).toObject();
}

export function messageEvent(event: Uint8Array | string): proto.MessageEvent.AsObject {
	return proto.MessageEvent.deserializeBinary(event as Uint8Array).toObject();
}

export function publishMessage(channel: string, name: string, message: string) {
	const msg = new proto.MessageEvent()
		.setChannel(channel)
		.setName(name)
		.setData(Buffer.from(message).toString("base64"));

	return createRTMessage("message", msg.serializeBinary());
}

export function createRTMessage(eventType: string, event: Uint8Array) {
	return new proto.RealTimeMessage().setEventType(eventType).setEvent(event).serializeBinary();
}

export function realTimeMessage(data: Uint8Array) {
	return proto.RealTimeMessage.deserializeBinary(data).toObject();
}
