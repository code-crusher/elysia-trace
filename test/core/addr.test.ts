import { describe, expect, it } from 'bun:test'
import { Elysia } from '../../src'
import { req } from '../utils'

// https://github.com/elysiajs/elysia/issues/2011
describe('addr', () => {
	// Deno passes `ServeHandlerInfo` as the second argument of `Deno.serve`
	// handler, which is `app.fetch`
	it('resolve from Deno ServeHandlerInfo', async () => {
		const app = new Elysia().get('/', ({ addr }) => addr)

		const res = await app.handle(req('/'), {
			remoteAddr: {
				transport: 'tcp',
				hostname: '127.0.0.1',
				port: 1234
			}
		} as any)

		expect(await res.text()).toBe('127.0.0.1')
	})

	// Deno passes a `Deno.UnixAddr` when listening on a unix socket
	it('resolve unix socket from Deno ServeHandlerInfo', async () => {
		const app = new Elysia().get('/', ({ addr }) => addr)

		const res = await app.handle(req('/'), {
			remoteAddr: {
				transport: 'unix',
				path: '/tmp/elysia.sock'
			}
		} as any)

		expect(await res.text()).toBe('/tmp/elysia.sock')
	})

	// Bun passes `Bun.Server` as the second argument of `Bun.serve` fetch
	it('resolve from Bun server', async () => {
		const app = new Elysia().get('/', ({ addr }) => addr)

		const res = await app.handle(req('/'), {
			requestIP: () => ({
				address: '10.0.0.7',
				port: 1234,
				family: 'IPv4'
			})
		} as any)

		expect(await res.text()).toBe('10.0.0.7')
	})

	it('be undefined without the second argument', async () => {
		const app = new Elysia().get('/', ({ addr }) => addr)

		expect(await app.handle(req('/')).then((x) => x.text())).toBe('')
	})

	it('be undefined if the peer address is unavailable', async () => {
		const app = new Elysia().get('/', ({ addr }) => addr)

		const res = await app.handle(req('/'), {
			requestIP: () => null
		} as any)

		expect(await res.text()).toBe('')
	})

	it('resolve on aot=false', async () => {
		const app = new Elysia({ aot: false }).get('/', ({ addr }) => addr)

		const res = await app.handle(req('/'), {
			remoteAddr: {
				transport: 'tcp',
				hostname: '127.0.0.1',
				port: 1234
			}
		} as any)

		expect(await res.text()).toBe('127.0.0.1')
	})

	it('resolve inside onRequest', async () => {
		const app = new Elysia()
			.onRequest(({ addr, set }) => {
				set.headers.addr = addr ?? 'unknown'
			})
			.get('/', () => 'ok')

		const res = await app.handle(req('/'), {
			remoteAddr: {
				transport: 'tcp',
				hostname: '127.0.0.1',
				port: 1234
			}
		} as any)

		expect(res.headers.get('addr')).toBe('127.0.0.1')
	})
})
