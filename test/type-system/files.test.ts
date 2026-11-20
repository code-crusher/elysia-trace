import { Elysia, t, ValidationError } from '../../src'

import { describe, expect, it } from 'bun:test'
import { post, upload } from '../utils'

describe('Files', () => {
	it('treat file field names as data', async () => {
		const marker = '__elysiaFileFieldCodegen'
		const field =
			'a,Object[`defineProperty`](globalThis,`' +
			marker +
			'`,{value:true}),c[`body`][`a`]'

		delete (globalThis as Record<string, unknown>)[marker]

		const app = new Elysia({ normalize: false }).post('/', () => 'ok', {
			body: t.Object({
				[field]: t.File({ type: 'image/jpeg' })
			})
		})

		const body = new FormData()
		body.append(field, Bun.file('test/images/millenium.jpg'))

		const response = await app.handle(
			new Request('http://localhost/', { method: 'POST', body })
		)

		expect(response.status).toBe(200)
		expect((globalThis as Record<string, unknown>)[marker]).toBeUndefined()
	})

	it('treat union file field names as data', async () => {
		const marker = '__elysiaUnionFileFieldCodegen'
		const field =
			'a,Object[`defineProperty`](globalThis,`' +
			marker +
			'`,{value:true}),c[`body`][`a`]'

		delete (globalThis as Record<string, unknown>)[marker]

		const app = new Elysia({ normalize: false }).post('/', () => 'ok', {
			body: t.Union([
				t.Object({
					[field]: t.File({ type: 'image/jpeg' })
				}),
				t.Object({ reference: t.String() })
			])
		})

		const body = new FormData()
		body.append(field, Bun.file('test/images/millenium.jpg'))

		const response = await app.handle(
			new Request('http://localhost/', { method: 'POST', body })
		)

		expect(response.status).toBe(200)
		expect((globalThis as Record<string, unknown>)[marker]).toBeUndefined()
	})

	it('validate minItems, maxItems', async () => {
		const app = new Elysia().post('/', () => 'ok', {
			body: t.Object({
				file: t.Files({
					minItems: 2,
					maxItems: 2
				})
			})
		})

		// case 1 fail: less than 2 files
		{
			const body = new FormData()
			body.append('file', Bun.file('test/images/millenium.jpg'))

			const response = await app.handle(
				new Request('http://localhost/', {
					method: 'POST',
					body
				})
			)

			expect(response.status).toBe(422)
		}

		// case 2 pass: all valid images
		{
			const body = new FormData()
			body.append('file', Bun.file('test/images/millenium.jpg'))
			body.append('file', Bun.file('test/images/kozeki-ui.webp'))

			const response = await app.handle(
				new Request('http://localhost/', {
					method: 'POST',
					body
				})
			)

			expect(response.status).toBe(200)
		}

		// case 3 fail: more than 2 files
		{
			const body = new FormData()
			body.append('file', Bun.file('test/images/millenium.jpg'))
			body.append('file', Bun.file('test/images/kozeki-ui.webp'))
			body.append('file', Bun.file('test/images/midori.png'))

			const response = await app.handle(
				new Request('http://localhost/', {
					method: 'POST',
					body
				})
			)

			expect(response.status).toBe(422)
		}
	})

	it('validate maxTotalSize across files instead of per file', async () => {
		// I have nothing but my burger and I want nothing more
		const app = new Elysia().post('/', () => 'ok', {
			body: t.Object({
				file: t.Files({
					// each file is under 500k, but millenium + midori is ~538k
					maxSize: '500k',
					maxTotalSize: '500k'
				})
			})
		})

		// case 1 pass: total is under the limit
		{
			const body = new FormData()
			body.append('file', Bun.file('test/images/millenium.jpg'))

			const response = await app.handle(
				new Request('http://localhost/', {
					method: 'POST',
					body
				})
			)

			expect(response.status).toBe(200)
		}

		// case 2 fail: every file is valid on its own but the total isn't
		{
			const body = new FormData()
			body.append('file', Bun.file('test/images/millenium.jpg'))
			body.append('file', Bun.file('test/images/midori.png'))

			const response = await app.handle(
				new Request('http://localhost/', {
					method: 'POST',
					body
				})
			)

			expect(response.status).toBe(422)
		}
	})

	it('validate minTotalSize across files', async () => {
		const app = new Elysia().post('/', () => 'ok', {
			body: t.Object({
				file: t.Files({
					minTotalSize: '500k'
				})
			})
		})

		// case 1 fail: total is under the minimum
		{
			const body = new FormData()
			body.append('file', Bun.file('test/images/midori.png'))

			const response = await app.handle(
				new Request('http://localhost/', {
					method: 'POST',
					body
				})
			)

			expect(response.status).toBe(422)
		}

		// case 2 pass: total is over the minimum
		{
			const body = new FormData()
			body.append('file', Bun.file('test/images/millenium.jpg'))
			body.append('file', Bun.file('test/images/midori.png'))

			const response = await app.handle(
				new Request('http://localhost/', {
					method: 'POST',
					body
				})
			)

			expect(response.status).toBe(200)
		}
	})

	it('validate total size for a single file', async () => {
		const app = new Elysia().post('/', () => 'ok', {
			body: t.Object({
				file: t.Files({
					maxTotalSize: '400k'
				})
			})
		})

		const body = new FormData()
		body.append('file', Bun.file('test/images/millenium.jpg'))

		const response = await app.handle(
			new Request('http://localhost/', {
				method: 'POST',
				body
			})
		)

		expect(response.status).toBe(422)
	})

	it('validate total size using byte value', async () => {
		const app = new Elysia().post('/', () => 'ok', {
			body: t.Object({
				file: t.Files({
					maxTotalSize: Bun.file('test/images/millenium.jpg').size
				})
			})
		})

		// case 1 pass: total is exactly at the limit
		{
			const body = new FormData()
			body.append('file', Bun.file('test/images/millenium.jpg'))

			const response = await app.handle(
				new Request('http://localhost/', {
					method: 'POST',
					body
				})
			)

			expect(response.status).toBe(200)
		}

		// case 2 fail: total is one byte over the limit
		{
			const body = new FormData()
			body.append('file', Bun.file('test/images/millenium.jpg'))
			body.append('file', Bun.file('test/images/fake.jpg'))

			const response = await app.handle(
				new Request('http://localhost/', {
					method: 'POST',
					body
				})
			)

			expect(response.status).toBe(422)
		}
	})

	// Union schema tests - testing that getSchemaProperties handles Union correctly
	it('handle file in Union schema', async () => {
		const app = new Elysia().post('/', ({ body }) => 'ok', {
			body: t.Union([
				t.Object({
					avatar: t.File(),
					type: t.Literal('image')
				}),
				t.Object({
					document: t.File(),
					type: t.Literal('doc')
				})
			])
		})

		const body = new FormData()
		body.append('avatar', Bun.file('test/images/millenium.jpg'))
		body.append('type', 'image')

		const response = await app.handle(
			new Request('http://localhost/', {
				method: 'POST',
				body
			})
		)

		expect(response.status).toBe(200)
	})

	it('handle multiple files in Union schema', async () => {
		const app = new Elysia().post('/', ({ body }) => 'ok', {
			body: t.Union([
				t.Object({
					images: t.Files(),
					category: t.Literal('gallery')
				}),
				t.Object({
					documents: t.Files(),
					category: t.Literal('archive')
				})
			])
		})

		const body = new FormData()
		body.append('images', Bun.file('test/images/millenium.jpg'))
		body.append('images', Bun.file('test/images/kozeki-ui.webp'))
		body.append('category', 'gallery')

		const response = await app.handle(
			new Request('http://localhost/', {
				method: 'POST',
				body
			})
		)

		expect(response.status).toBe(200)
	})
})
