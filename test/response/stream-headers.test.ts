import { describe, expect, it } from 'bun:test'
import { Elysia } from '../../src'
import { req } from '../utils'

// A chunked Response is re-streamed through `handleStream`, which rebuilds the
// Response from `set`. Any header the Response carried must survive that
// rebuild, otherwise returning a streamed Response silently drops them.
const chunkedResponse = () =>
	new Response(
		new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode('hello'))
				controller.close()
			}
		}),
		{
			headers: {
				'transfer-encoding': 'chunked',
				'x-foo': '1',
				'set-cookie': 'a=1'
			}
		}
	)

describe('Response Stream Headers', () => {
	it('keeps the Response headers when the route sets set.headers', async () => {
		const app = new Elysia().get('/', ({ set }) => {
			set.headers['x-route'] = '1'

			return chunkedResponse()
		})

		const res = await app.handle(req('/'))

		expect(res.headers.get('x-foo')).toBe('1')
		expect(res.headers.get('x-route')).toBe('1')
		expect(res.headers.getSetCookie()).toEqual(['a=1'])
	})

	it('keeps both the Response cookie and the route cookie', async () => {
		const app = new Elysia().get('/', ({ cookie: { session } }) => {
			session.value = 'abc'

			return chunkedResponse()
		})

		const res = await app.handle(req('/'))

		expect(res.headers.get('x-foo')).toBe('1')
		expect(res.headers.getSetCookie()).toContain('a=1')
		expect(res.headers.getSetCookie()).toContain('session=abc; Path=/')
	})

	it('keeps the Response headers and both cookies at once', async () => {
		const app = new Elysia().get('/', ({ set, cookie: { session } }) => {
			set.headers['x-route'] = '1'
			session.value = 'abc'

			return chunkedResponse()
		})

		const res = await app.handle(req('/'))

		expect(res.headers.get('x-foo')).toBe('1')
		expect(res.headers.get('x-route')).toBe('1')
		expect(res.headers.getSetCookie()).toContain('a=1')
		expect(res.headers.getSetCookie()).toContain('session=abc; Path=/')
	})

	it('keeps every route cookie alongside the Response cookie', async () => {
		const app = new Elysia().get(
			'/',
			({ cookie: { first, second } }) => {
				first.value = '1'
				second.value = '2'

				return chunkedResponse()
			}
		)

		const res = await app.handle(req('/'))
		const cookies = res.headers.getSetCookie()

		expect(res.headers.get('x-foo')).toBe('1')
		expect(cookies).toContain('a=1')
		expect(cookies).toContain('first=1; Path=/')
		expect(cookies).toContain('second=2; Path=/')
		expect(cookies).toHaveLength(3)
	})

	it('does not duplicate a cookie the Response already set', async () => {
		const app = new Elysia().get('/', ({ cookie: { a } }) => {
			a.value = '1'

			return new Response('hello', {
				headers: {
					'transfer-encoding': 'chunked',
					'set-cookie': 'a=1; Path=/'
				}
			})
		})

		const res = await app.handle(req('/'))

		expect(res.headers.getSetCookie()).toEqual(['a=1; Path=/'])
	})
})
