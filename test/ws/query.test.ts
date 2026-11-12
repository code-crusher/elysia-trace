import { describe, it, expect } from 'bun:test'
import { Elysia, t } from '../../src'
import { newWebsocket, wsOpen, wsMessage, wsClosed } from './utils'

describe('WebSocket query', () => {
	it('should parse and validate query from the connection URL', async () => {
		const app = new Elysia()
			.ws('/ws', {
				query: t.Object({ id: t.String() }),
				message(ws) {
					ws.send(JSON.stringify(ws.data.query))
				}
			})
			.listen(0)

		const ws = newWebsocket(app.server!, '/ws?id=42')

		const message = wsMessage(ws)
		await wsOpen(ws)
		ws.send('hi')

		const { data } = await message
		expect(JSON.parse(data as string)).toEqual({ id: '42' })

		await wsClosed(ws)
		app.stop()
	})
})
