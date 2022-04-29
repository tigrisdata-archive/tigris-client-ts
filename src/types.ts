export class DatabaseInfo {
    private readonly _name: String
    private readonly _metadata: DatabaseMetadata

    constructor(name: String, metadata: DatabaseMetadata) {
        this._name = name;
        this._metadata = metadata;
    }

    public get name(): String {
        return this._name;
    }

    public get metadata(): DatabaseMetadata {
        return this._metadata;
    }
}

export class DatabaseMetadata {
    constructor() {
    }
}

export class DatabaseOptions {

}

export class DatabaseDescription {

}

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