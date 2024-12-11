import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { List, ServerToClient, clientToServerSchema } from 'common';

export class SocketObject extends DurableObject {
	sql: SqlStorage;
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;

		this.sql.exec(`CREATE TABLE IF NOT EXISTS item (
			id TEXT PRIMARY KEY,
			text TEXT NOT NULL,
			checked BOOLEAN NOT NULL
			);
			CREATE TABLE IF NOT EXISTS name (
				id INTEGER PRIMARY KEY,
				name TEXT NOT NULL
			);
			INSERT OR IGNORE INTO name (id, name) VALUES (1, '');`);
	}

	webSocketMessage(
		ws: WebSocket,
		message: string | ArrayBuffer,
	): void | Promise<void> {
		if (typeof message !== 'string') return;
		const parsed = clientToServerSchema.safeParse(JSON.parse(message));
		if (!parsed.success) return;
		if (parsed.data.type === 'add') {
			this.sql.exec(
				`INSERT INTO item (id, text, checked) VALUES (?, ?, ?)`,
				crypto.randomUUID(),
				parsed.data.item,
				false,
			);
			this.broadcast({
				type: 'sync',
				data: this.getItems(),
			});
			return;
		}
		if (parsed.data.type === 'remove') {
			this.sql.exec(`DELETE FROM item WHERE id = ?`, parsed.data.id);
			this.broadcast({
				type: 'sync',
				data: this.getItems(),
			});
			return;
		}
		if (parsed.data.type === 'check') {
			this.sql.exec(
				`UPDATE item SET checked = ? WHERE id = ?`,
				parsed.data.checked,
				parsed.data.id,
			);
			this.broadcast({
				type: 'check',
				id: parsed.data.id,
				checked: parsed.data.checked,
			});
			return;
		}
		if (parsed.data.type === 'rename') {
			this.sql.exec(`UPDATE name SET name = ? WHERE id = 1`, parsed.data.name);
			this.broadcast({
				type: 'rename',
				name: parsed.data.name,
			});
			return;
		}
		if (parsed.data.type === 'refresh') {
			const payload: ServerToClient = {
				type: 'sync',
				data: this.getItems(),
			};
			ws.send(JSON.stringify(payload));
			return;
		}
	}
	broadcast(payload: ServerToClient) {
		const raw = JSON.stringify(payload);
		for (const ws of this.ctx.getWebSockets()) {
			ws.send(raw);
		}
	}

	async fetch(_req: Request): Promise<Response> {
		const { 0: client, 1: server } = new WebSocketPair();

		this.ctx.acceptWebSocket(server);
		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}
	getItems(): List {
		const items = this.sql
			.exec<{
				id: string;
				text: string;
				checked: 'true' | 'false';
			}>('SELECT id, text, checked FROM item;')
			.toArray();

		const { name } = this.sql
			.exec<{
				name: string;
			}>('SELECT name FROM name WHERE id = 1;')
			.one();

		return {
			name,
			items: items.map((i) => ({
				id: i.id,
				text: i.text,
				checked: i.checked === 'true',
			})),
		};
	}
}

const app = new Hono<{ Bindings: Env }>();

app.post('/', (c) => {
	const id = c.env.SOCKET_OBJECT.newUniqueId();
	return c.json({ id: id.toString() });
});

app.get('/:id', async (c) => {
	const id = c.env.SOCKET_OBJECT.idFromString(c.req.param('id'));
	const socket = c.env.SOCKET_OBJECT.get(id);
	return c.json(await socket.getItems());
});

app.get('/ws/:id', (c) => {
	const upgrade = c.req.header('Upgrade');
	if (upgrade !== 'websocket') {
		c.status(426);
		return c.body('WebSocket connection required');
	}
	const id = c.env.SOCKET_OBJECT.idFromString(c.req.param('id'));
	const socket = c.env.SOCKET_OBJECT.get(id);
	return socket.fetch(c.req.raw);
});

export default app;
