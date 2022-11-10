#!/usr/bin/env bash

# Temporary script to publish beta releases to @latest dist-tag. This should be removed
# once first stable release is published to @latest dist-tag

# Determine if version @latest dist-tag is behind $1 or not
if [[ -z "$1" ]] ; then
    echo 'No argument specified, no release needed. Exiting...'
    exit 1
fi

NEXT=$1
echo "Next release version: $NEXT"

if [[ "$NEXT" != *"beta"* ]]; then
	echo 'Argument is not a valid beta release. Exiting...'
	exit 1
fi

NPM_LATEST=$(npm view @tigrisdata/core dist-tags.latest)
echo "npm @latest version is: $NPM_LATEST"

if [[ "$NPM_LATEST" != *"beta"* ]]; then
	echo 'Stable release already published to @latest dist-tag'
	echo 'These temporary steps can be cleaned up and not needed anymore. Exiting...'
	exit 1
fi

if [[ "$NPM_LATEST" == "$NEXT" ]]; then
	echo "@latest is already on $NEXT"
	echo 'No release needed. Exiting...'
	exit 1
fi

echo 'Release needed on @latest dist-tag'

NPMRC="/tmp/.npmrc"
cp /dev/null $NPMRC
# NPM_TOKEN is available in gh workflow
echo "//registry.npmjs.org/:_authToken = \$NPM_TOKEN" >> $NPMRC

# Attempt to publish a new release to @latest tag
echo "Setting version in package.json to: $NEXT"
VERSION_OUT=$(npm version $NEXT --no-git-tag-version --allow-same-version | tail -n1)

echo "npm version out: $VERSION_OUT"

if [[ "$VERSION_OUT" != *"$NEXT"* ]]; then
	echo 'Failed to set npm version. Exiting....'
	exit 1
fi

echo "Ready to publish $NEXT to dist-tag: @latest"
npm publish --userconfig $NPMRC

exit 0
