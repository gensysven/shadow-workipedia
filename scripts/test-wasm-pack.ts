import { existsSync, readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const packPath = 'public/agent-data.pack';
const metaPath = 'public/agent-data.pack.meta.json';

assert.ok(existsSync(packPath), 'agent-data.pack missing');
assert.ok(existsSync(metaPath), 'agent-data.pack.meta.json missing');

const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as { version: number; hash: string; bytes: number };
assert.equal(typeof meta.version, 'number');
assert.equal(typeof meta.hash, 'string');
assert.equal(typeof meta.bytes, 'number');
console.log('ok');
