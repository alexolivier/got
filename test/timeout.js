import test from 'ava';
import pEvent from 'p-event';
import delay from 'delay';
import got from '../source';
import {createServer} from './helpers/server';

let s;

test.before('setup', async () => {
	s = await createServer();

	s.on('/', async (req, res) => {
		await delay(2000);
		res.statusCode = 200;
		res.end('OK');
	});

	await s.listen(s.port);
});

test('timeout option (ETIMEDOUT)', async t => {
	const err = await t.throws(got(`${s.url}/`, {
		timeout: 0,
		retries: 0
	}));

	t.is(err.code, 'ETIMEDOUT');
});

test('timeout option (ESOCKETTIMEDOUT)', async t => {
	const err = await t.throws(got(`${s.url}/`, {
		timeout: 1000,
		retries: 0
	}));

	t.is(err.code, 'ESOCKETTIMEDOUT');
});

test('timeout option as object (ETIMEDOUT)', async t => {
	const err = await t.throws(got(`${s.url}`, {
		timeout: {socket: 3000, request: 0},
		retries: 0
	}));

	t.is(err.code, 'ETIMEDOUT');
});

test('timeout option as object (ESOCKETTIMEDOUT)', async t => {
	const err = await t.throws(got(`${s.url}`, {
		timeout: {socket: 500, request: 1000},
		retries: 0
	}));

	t.is(err.code, 'ESOCKETTIMEDOUT');
});

test('socket timeout', async t => {
	const err = await t.throws(got(`${s.url}`, {
		timeout: {socket: 1},
		retries: 0
	}));

	t.is(err.code, 'ESOCKETTIMEDOUT');
});

test('request timeout', async t => {
	const err = await t.throws(got(`${s.url}`, {
		timeout: {request: 1000},
		retries: 0
	}));

	t.is(err.code, 'ESOCKETTIMEDOUT');
});

test.todo('connection timeout');

test('retries on timeout (ESOCKETTIMEDOUT)', async t => {
	let tried = false;

	const err = await t.throws(got(`${s.url}`, {
		timeout: 500,
		retries: () => {
			if (tried) {
				return 0;
			}

			tried = true;
			return 1;
		}
	}));

	t.true(tried);
	t.is(err.code, 'ESOCKETTIMEDOUT');
});

test('retries on timeout (ETIMEDOUT)', async t => {
	let tried = false;

	const err = await t.throws(got(`${s.url}`, {
		timeout: 0,
		retries: () => {
			if (tried) {
				return 0;
			}

			tried = true;
			return 1;
		}
	}));

	t.true(tried);
	t.is(err.code, 'ETIMEDOUT');
});

test('timeout with streams', async t => {
	const stream = got.stream(s.url, {timeout: 500, retries: 0});
	const err = await t.throws(pEvent(stream, 'response'));
	t.is(err.code, 'ESOCKETTIMEDOUT');
});
