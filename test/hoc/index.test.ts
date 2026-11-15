/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from 'bun:test'
import { Elysia } from '../../src'
import { req } from '../utils'

describe('HOC', () => {
	it('work', async () => {
		let called = 0

		const app = new Elysia()
			.wrap((fn) => {
				called++

				return fn
			})
			.get('/', () => 'ok')

		await app.handle(req('/'))

		expect(called).toBe(1)
	})

	// https://github.com/elysiajs/elysia/issues/1999
	// A `.wrap()` that only forwards `request` must not drop the Bun server
	// passed as the second argument to `fetch`, so `context.server` (and
	// `context.server.requestIP(request)`) still work in the handler.
	it('preserve server when wrapper only forwards request', async () => {
		const app = new Elysia()
			.wrap((fetch) => (request) => fetch(request))
			.get('/', ({ server, request }) => ({
				server: server === null ? null : 'set',
				ip: server?.requestIP(request)?.address ?? null
			}))
			.listen(0)

		const body = (await fetch(app.server!.url).then((x) =>
			x.json()
		)) as { server: string | null; ip: string | null }

		expect(body.server).toBe('set')
		expect(body.ip).not.toBeNull()

		await app.stop()
	})

	it('deduplicate', async () => {
		const plugin = new Elysia().wrap((fn) => fn)
		const plugin2 = new Elysia({ name: 'plugin2' }).wrap((fn) => fn)

		const app = new Elysia()
			.use(plugin)
			.use(plugin)
			.use(plugin)
			.use(plugin2)
			.use(plugin2)
			.get('/', () => 'ok')

		// @ts-expect-error
		expect(app.extender.higherOrderFunctions.length).toBe(2)
	})
})
