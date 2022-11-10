#!/usr/bin/env bash

# Temporary script to publish beta releases to @latest dist-tag. This should be removed
# once first stable release is published to @latest dist-tag

# Attempt to publish a new release to @latest tag
if [[ -z "$1" ]] ; then
    echo 'No argument specified. Exiting...'
    exit 1
fi

NEXT=$1
echo "Setting version in package.json to: $NEXT"
VERSION_OUT=$(npm version $NEXT --no-git-tag-version --allow-same-version | tail -n1)

echo "npm version out: $VERSION_OUT"

if [[ "$VERSION_OUT" != *"$NEXT"* ]]; then
	echo 'Failed to set npm version. Exiting....'
	exit 1
fi

echo "Ready to publish $NEXT to dist-tag: @latest"
npm publish

exit 0
