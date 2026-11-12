import { describe, it, expect } from 'bun:test'
import { Elysia, t } from '../../../src'
import { req } from '../../utils'

describe('Bun adapter', () => {
	it('handle query guard', async () => {
		const app = new Elysia()
			.guard({
				query: t.Object({ a: t.String() })
			})
			.get('/works-with', ({ query }) => 'Works' + query.a)
			.get('/works-without', () => 'Works without')
			.listen(0)

		const query = await fetch(
			`http://localhost:${app.server!.port}/works-with?a=with`
		).then((x) => x.text())

		expect(query).toEqual('Workswith')

		const query2 = await fetch(
			`http://localhost:${app.server!.port}/works-without?a=1`
		).then((x) => x.text())

		expect(query2).toEqual('Works without')
	})

	it('handle standalone query guard', async () => {
		const app = new Elysia()
			.guard({
				query: t.Object({ a: t.String() }),
				schema: 'standalone'
			})
			.get('/works-with', ({ query }) => 'Works' + query.a)
			.get('/works-without', () => 'Works without')
			.listen(0)

		const query = await fetch(
			`http://localhost:${app.server!.port}/works-with?a=with`
		).then((x) => x.text())

		expect(query).toEqual('Workswith')

		const query2 = await fetch(
			`http://localhost:${app.server!.port}/works-without?a=1`
		).then((x) => x.text())

		expect(query2).toEqual('Works without')
	})

	it('handle static response with onRequest and onError', async () => {
		let caughtError: Error
		let onErrorCalled = false
		let onRequestCalled = false

		const app = new Elysia()
			.onError(({ error }) => {
				caughtError = error as Error

				return 'handled'
			})
			.onRequest(({ set }) => {
				set.headers['x-header'] = 'test'
				set.status = 400

				throw new Error('A')
			})
			.get('/', 'yay')
			.listen(0)

		const response = await fetch(`http://localhost:${app.server!.port}`)

		const text = await response.text()

		expect(text).toBe('handled')
		expect(response.status).toBe(400)
		expect(response.headers.get('x-header')).toBe('test')
		expect(caughtError!.message).toBe('A')
	})

	it('preserve set status and headers when returning an Array subclass', async () => {
		// Bun.SQL returns SQLResultArray, an Array subclass
		class Rows extends Array {}

		const app = new Elysia()
			.onRequest(({ set }) => {
				set.headers['x-request-header'] = 'kept'
			})
			.get('/plain', ({ set }) => {
				set.status = 201
				set.headers['x-a'] = '1'

				return [{ a: 1 }]
			})
			.get('/subclass', ({ set }) => {
				set.status = 201
				set.headers['x-a'] = '1'

				return Rows.from([{ a: 1 }])
			})

		for (const path of ['/plain', '/subclass']) {
			const response = await app.handle(req(path))

			expect(response.status).toBe(201)
			expect(response.headers.get('x-a')).toBe('1')
			expect(response.headers.get('x-request-header')).toBe('kept')
			expect(await response.json()).toEqual([{ a: 1 }])
		}
	})

	it('handle non-ASCII path', async () => {
		const app = new Elysia().get('/สวัสดี', 'สบายดีไหม').listen(0)

		const response = await fetch(
			`http://localhost:${app.server!.port}/สวัสดี`
		)
		const text = await response.text()
		expect(text).toBe('สบายดีไหม')
	})
})
