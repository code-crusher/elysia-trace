import { Elysia, t } from '../../src'

import { describe, expect, it } from 'bun:test'
import { post, req } from '../utils'

describe('Validator Additional Case', () => {
	it('validate beforeHandle', async () => {
		const app = new Elysia()
			.get('/', () => 'Mutsuki need correction 💢💢💢', {
				beforeHandle: () => 'Mutsuki need correction 💢💢💢',
				response: t.String()
			})
			.get('/invalid', () => 1 as any, {
				beforeHandle() {
					return 1 as any
				},
				response: t.String()
			})

		const res = await app.handle(req('/'))
		const invalid = await app.handle(req('/invalid'))

		expect(await res.text()).toBe('Mutsuki need correction 💢💢💢')
		expect(res.status).toBe(200)

		expect(invalid.status).toBe(422)
	})

	it('validate afterHandle', async () => {
		const app = new Elysia()
			.get('/', () => 'Mutsuki need correction 💢💢💢', {
				afterHandle: () => 'Mutsuki need correction 💢💢💢',
				response: t.String()
			})
			.get('/invalid', () => 1 as any, {
				afterHandle: () => 1 as any,
				response: t.String()
			})

		const res = await app.handle(req('/'))
		const invalid = await app.handle(req('/invalid'))

		expect(await res.text()).toBe('Mutsuki need correction 💢💢💢')

		expect(res.status).toBe(200)
		expect(invalid.status).toBe(422)
	})

	it('validate beforeHandle with afterHandle', async () => {
		const app = new Elysia()
			.get('/', () => 'Mutsuki need correction 💢💢💢', {
				beforeHandle() {},
				afterHandle() {
					return 'Mutsuki need correction 💢💢💢'
				},
				response: t.String()
			})
			.get('/invalid', () => 1 as any, {
				afterHandle() {
					return 1 as any
				},
				response: t.String()
			})
		const res = await app.handle(req('/'))
		const invalid = await app.handle(req('/invalid'))

		expect(await res.text()).toBe('Mutsuki need correction 💢💢💢')
		expect(res.status).toBe(200)

		expect(invalid.status).toBe(422)
	})

	it('handle guard hook', async () => {
		const app = new Elysia().guard(
			{
				query: t.Object({
					name: t.String()
				})
			},
			(app) =>
				app.post('/user', ({ query: { name } }) => name, {
					body: t.Object({
						id: t.Number(),
						username: t.String(),
						profile: t.Object({
							name: t.String()
						})
					})
				})
		)

		const body = JSON.stringify({
			id: 6,
			username: '',
			profile: {
				name: 'A'
			}
		})

		const valid = await app.handle(
			new Request('http://localhost/user?name=salt', {
				method: 'POST',
				body,
				headers: {
					'content-type': 'application/json',
					'content-length': body.length.toString()
				}
			})
		)

		expect(await valid.text()).toBe('salt')
		expect(valid.status).toBe(200)

		const invalidQuery = await app.handle(
			new Request('http://localhost/user', {
				method: 'POST',
				body: JSON.stringify({
					id: 6,
					username: '',
					profile: {
						name: 'A'
					}
				})
			})
		)

		expect(invalidQuery.status).toBe(422)

		const invalidBody = await app.handle(
			new Request('http://localhost/user?name=salt', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					id: 6,
					username: '',
					profile: {}
				})
			})
		)

		expect(invalidBody.status).toBe(422)
	})

	it('merge guard schema with route local schema on the same slot', async () => {
		const guard = new Elysia({ name: 'guard' }).guard({
			as: 'scoped',
			body: t.Object({ orgField: t.String() })
		})

		const app = new Elysia()
			.use(guard)
			.post('/', ({ body }) => body, {
				body: t.Object({ content: t.String() })
			})

		// Both the guard's and the route's fields survive decoding
		const res = await app.handle(
			post('/', {
				orgField: 'should-be-required',
				content: 'hi'
			})
		)

		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({
			orgField: 'should-be-required',
			content: 'hi'
		})

		// The guard's requirement is enforced, not silently dropped
		const invalid = await app.handle(post('/', { content: 'hi' }))

		expect(invalid.status).toBe(422)
	})

	it('merge guard schema with route local schema on headers slot', async () => {
		const app = new Elysia()
			.guard({
				as: 'scoped',
				headers: t.Object({ 'x-guard': t.String() })
			})
			.get('/', ({ headers }) => headers, {
				headers: t.Object({ 'x-route': t.String() })
			})

		const res = await app.handle(
			new Request('http://localhost/', {
				headers: {
					'x-guard': 'a',
					'x-route': 'b'
				}
			})
		)

		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({
			'x-guard': 'a',
			'x-route': 'b'
		})

		const invalid = await app.handle(
			new Request('http://localhost/', {
				headers: {
					'x-route': 'b'
				}
			})
		)

		expect(invalid.status).toBe(422)
	})

	it('inherits cookie on guard', async () => {
		const app = new Elysia()
			.guard({
				cookie: t.Cookie({ session: t.String() })
			})
			.get('/', ({ cookie: { session } }) =>
				session.value ? session.value : 'Empty'
			)

		const res = await Promise.all([
			app.handle(req('/')),
			app.handle(req('/', { headers: { Cookie: 'session=value' } }))
		])

		expect(res[0].status).toBe(422)
		expect(res[1].status).toBe(200)
	})

	it('handle record', async () => {
		const app = new Elysia().get('/', () => 'SAFE', {
			query: t.Record(t.String(), t.String())
		})

		const response = await app.handle(req('/?x=1'))

		expect(response.status).toBe(200)
	})
})
