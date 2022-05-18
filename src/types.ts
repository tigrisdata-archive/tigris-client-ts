export class DatabaseInfo {
    private readonly _name: string
    private readonly _metadata: DatabaseMetadata

    constructor(name: string, metadata: DatabaseMetadata) {
        this._name = name;
        this._metadata = metadata;
    }

    public get name(): string {
        return this._name;
    }

    public get metadata(): DatabaseMetadata {
        return this._metadata;
    }
}

export class CollectionInfo {
    private readonly _name: string
    private readonly _metadata: CollectionMetadata

    constructor(name: string, metadata: CollectionMetadata) {
        this._name = name;
        this._metadata = metadata;
    }

    get name(): string {
        return this._name;
    }

    get metadata(): CollectionMetadata {
        return this._metadata;
    }
}

export class DatabaseMetadata {}

export class CollectionMetadata {}

export class DatabaseOptions {}

export class CollectionOptions {}

export class DropDatabaseResponse {
    private readonly _status: string;
    private readonly _message: string;

    constructor(status: string, message: string) {
        this._status = status;
        this._message = message;
    }

    get status(): string {
        return this._status;
    }

    get message(): string {
        return this._message;
    }
}

export class DropCollectionResponse {
    private readonly _status: string;
    private readonly _message: string;

    constructor(status: string, message: string) {
        this._status = status;
        this._message = message;
    }

    get status(): string {
        return this._status;
    }

    get message(): string {
        return this._message;
    }
}

export class DatabaseDescription {
    private readonly _db: string;
    private readonly _metadata: DatabaseMetadata;
    private readonly _collectionsDescription: Array<CollectionDescription>;

    constructor(db: string, metadata: DatabaseMetadata, collectionsDescription: Array<CollectionDescription>) {
        this._db = db;
        this._metadata = metadata;
        this._collectionsDescription = collectionsDescription;
    }

    get db(): string {
        return this._db;
    }

    get metadata(): DatabaseMetadata {
        return this._metadata;
    }

    get collectionsDescription(): Array<CollectionDescription> {
        return this._collectionsDescription;
    }
}

export class CollectionDescription {
    private readonly _collection: string;
    private readonly _metadata: CollectionMetadata;
    private readonly _schema: string;

    constructor(collection: string, metadata: CollectionMetadata, schema: string) {
        this._collection = collection;
        this._metadata = metadata;
        this._schema = schema;
    }

    get collection(): string {
        return this._collection;
    }

    get metadata(): CollectionMetadata {
        return this._metadata;
    }

    get schema(): string {
        return this._schema;
    }
}

export class InsertResponse {
    private readonly _status: string;
    constructor(status: string) {
        this._status = status;
    }

    get status(): string {
        return this._status;
    }
}

export class WriteOptions {}

export class InsertOptions {
    private readonly _status: string;
    private readonly _message: string;

    constructor(status: string, message: string) {
        this._status = status;
        this._message = message;
    }

    get status(): string {
        return this._status;
    }

    get message(): string {
        return this._message;
    }
}


// Marker interface
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TigrisCollectionType {}
