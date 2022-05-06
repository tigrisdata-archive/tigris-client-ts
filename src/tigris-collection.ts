export function TigrisCollection(
    collectionName: string,
): ClassDecorator {
    return function (target) {
            Reflect.defineProperty( target, 'tigris-collection-name', {value: collectionName});
    }
}
