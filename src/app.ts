import tigris from './tigris';

// This file is added for now to quickly test the client and iterate on it.
// This will get deleted
console.log(process.env.serverURL);
const listDBsPromise = tigris.listDatabases();
listDBsPromise
    .then((value) => console.log('value', value))
    .catch((err) => console.log('error', err))
    .finally(() => console.log('finally'));
