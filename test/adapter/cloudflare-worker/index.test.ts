import { describe, expect, it } from 'bun:test'

import { Elysia, t } from '../../../src'
import { CloudflareAdapter } from '../../../src/adapter/cloudflare-worker'

const req = (path: string, options?: RequestInit) =>
	new Request(`http://localhost${path}`, options)

describe('Cloudflare Worker adapter', () => {
	it('handle request in AoT mode', async () => {
		const app = new Elysia({ adapter: CloudflareAdapter })
			.get('/', () => 'Elysia on Cloudflare Worker!')
			.compile()

		const response = await app.fetch(req('/'))

		expect(response.status).toBe(200)
		expect(await response.text()).toBe('Elysia on Cloudflare Worker!')
	})

	it('compile in dynamic mode', async () => {
		const app = new Elysia({
			adapter: CloudflareAdapter,
			aot: false
		})
			.get('/', () => 'Elysia on Cloudflare Worker!')
			.compile()

		const response = await app.fetch(req('/'))

		expect(response.status).toBe(200)
		expect(await response.text()).toBe('Elysia on Cloudflare Worker!')
	})

	it('compile dynamic mode plugin nested inside AoT instance', async () => {
		const plugin = new Elysia({
			adapter: CloudflareAdapter,
			aot: false
		}).get('/plugin', () => 'plugin')

		const app = new Elysia({ adapter: CloudflareAdapter })
			.use(plugin)
			.get('/', () => 'root')
			.compile()

		expect(await (await app.fetch(req('/'))).text()).toBe('root')

		expect(await (await app.fetch(req('/plugin'))).text()).toBe('plugin')
	})

	it('handle validation error in dynamic mode', async () => {
		const app = new Elysia({
			adapter: CloudflareAdapter,
			aot: false
		})
			.post('/mirror', ({ body }) => body, {
				body: t.Object({
					hello: t.String()
				})
			})
			.compile()

		const valid = await app.fetch(
			req('/mirror', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ hello: 'world' })
			})
		)

		expect(valid.status).toBe(200)
		expect(await valid.json()).toEqual({ hello: 'world' })

		const invalid = await app.fetch(
			req('/mirror', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({ hello: 1 })
			})
		)

		expect(invalid.status).toBe(422)
	})

	it('handle error and not found in dynamic mode', async () => {
		const app = new Elysia({
			adapter: CloudflareAdapter,
			aot: false
		})
			.get('/throw', () => {
				throw new Error('boom')
			})
			.compile()

		const thrown = await app.fetch(req('/throw'))

		expect(thrown.status).toBe(500)
		expect(await thrown.text()).toBe('boom')

		const notFound = await app.fetch(req('/not-found'))

		expect(notFound.status).toBe(404)
		expect(await notFound.text()).toBe('NOT_FOUND')
	})

	it('warn instead of starting a server on listen', () => {
		const app = new Elysia({ adapter: CloudflareAdapter })
			.get('/', () => 'Elysia on Cloudflare Worker!')
			.compile()

		const warnings: string[] = []
		const { warn } = console
		console.warn = (...args: string[]) => void warnings.push(...args)

		try {
			app.listen(3000)
		} finally {
			console.warn = warn
		}

		expect(warnings).toContain(
			'Cloudflare Worker does not support listen method. Please export default Elysia instance instead.'
		)
	})
})
