#!/usr/bin/env bash
set -x
BASEDIR=$(dirname "$0")
cd "${BASEDIR}"/../

GRPC_TOOLS_NODE_PROTOC_PLUGIN="./node_modules/.bin/grpc_tools_node_protoc_plugin"
GRPC_TOOLS_NODE_PROTOC="./node_modules/.bin/grpc_tools_node_protoc"

mkdir -p src/proto/server/v1/

## google
${GRPC_TOOLS_NODE_PROTOC} \
  --js_out=import_style=commonjs,binary:./src/proto/ \
  --grpc_out=grpc_js:./src/proto/ \
  --plugin=protoc-gen-grpc="${GRPC_TOOLS_NODE_PROTOC_PLUGIN}" \
  -I ./api/proto/ \
  ./api/proto/server/v1/*.proto ./api/proto/google/api/*.proto

## openapi
${GRPC_TOOLS_NODE_PROTOC} \
  --js_out=import_style=commonjs,binary:./src/proto/ \
  --grpc_out=grpc_js:./src/proto/ \
  --plugin=protoc-gen-grpc="${GRPC_TOOLS_NODE_PROTOC_PLUGIN}" \
  -I ./api/proto/ \
  ./api/proto/server/v1/*.proto ./api/proto/openapiv3/*.proto

## tigris
${GRPC_TOOLS_NODE_PROTOC} \
  --plugin=protoc-gen-grpc=./node_modules/grpc-tools/bin/grpc_node_plugin \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out=grpc_js:./src/proto/ \
  -I ./api/proto/ \
  ./api/proto/server/v1/*.proto ./api/proto/google/api/*.proto
