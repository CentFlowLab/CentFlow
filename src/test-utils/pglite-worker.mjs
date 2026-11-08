// Corre num worker_thread (Node nativo, fora do sistema de módulos do Jest), onde o PGlite
// consegue localizar os seus ficheiros WASM. Os pedidos são processados um de cada vez para que
// a identidade (role + utilizador) de um pedido nunca se misture com a de outro.
// O Node 24 aborta ao libertar um wrapper WASM (nodejs/node#66366). O `npm test` arranca o Jest
// com --no-wasm-code-gc; este worker herda a flag.
import { PGlite } from '@electric-sql/pglite';
import { parentPort } from 'node:worker_threads';

const db = await PGlite.create();
parentPort.postMessage({ ready: true });

async function handle({ kind, sql, params, identity }) {
  if (kind === 'exec') {
    await db.exec(sql);
    return null;
  }
  if (kind === 'close') {
    await db.close();
    return null;
  }
  if (!identity) {
    return (await db.query(sql, params ?? [])).rows;
  }
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [identity.sub ?? '']);
  await db.query(`select set_config('request.jwt.claim.role', $1, false)`, [identity.role]);
  await db.exec(`set role ${identity.role}`);
  try {
    return (await db.query(sql, params ?? [])).rows;
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    await db.query(`select set_config('request.jwt.claim.role', '', false)`);
  }
}

let queue = Promise.resolve();
parentPort.on('message', (message) => {
  queue = queue.then(async () => {
    try {
      parentPort.postMessage({ id: message.id, result: await handle(message) });
    } catch (error) {
      parentPort.postMessage({
        id: message.id,
        error: { message: error?.message ?? String(error), code: error?.code ?? null },
      });
    }
  });
});
