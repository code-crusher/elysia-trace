import Elysia, { t } from '../../src'
import { describe, expect, it } from 'bun:test'
import { Value } from '@sinclair/typebox/value'
import { post } from '../utils'

// #1960: t.Composite must stay an evaluated merge over an array of object
// schemas on the bundled TypeBox, and never fall back to t.Intersect's allOf
// I have nothing but my burger and I want nothing more
describe('TypeSystem - Composite', () => {
	it('Create', () => {
		const schema = t.Composite([
			t.Object({ a: t.String() }),
			t.Object({ b: t.Number() })
		])

		// the whole point of Composite over Intersect: a flat object schema,
		// not an allOf wrapper
		expect(schema).toMatchObject({
			type: 'object',
			properties: {
				a: { type: 'string' },
				b: { type: 'number' }
			},
			required: ['a', 'b']
		})
		expect(schema.allOf).toBeUndefined()
	})

	it('Preserves modifier of overlapping keys', () => {
		const schema = t.Composite([
			t.Object({ a: t.Optional(t.String()) }),
			t.Object({ b: t.Number() })
		])

		expect(schema).toMatchObject({
			type: 'object',
			properties: {
				a: { type: 'string' },
				b: { type: 'number' }
			},
			required: ['b']
		})
		expect(schema.required).not.toContain('a')
	})

	it('Intersects properties of the same key', () => {
		const schema = t.Composite([
			t.Object({ a: t.String() }),
			t.Object({ a: t.String({ maxLength: 5 }) })
		])

		expect(schema.properties?.a).toMatchObject({
			allOf: [{ type: 'string' }, { type: 'string', maxLength: 5 }]
		})
	})

	it('Check', () => {
		const schema = t.Composite([
			t.Object({ a: t.String() }),
			t.Object({ b: t.Number() })
		])

		expect(Value.Check(schema, { a: 'some', b: 1 })).toBe(true)

		// unlike Intersect, a missing key on one member is a validation error
		// of the merged object, not silently accepted
		expect(Value.Check(schema, { a: 'some' })).toBe(false)
		expect(Value.Check(schema, { a: 'some', b: 'not a number' })).toBe(
			false
		)
	})

	it('Integrate', async () => {
		const app = new Elysia().post('/', ({ body }) => body, {
			body: t.Composite([
				t.Object({ a: t.String() }),
				t.Object({ b: t.Number() })
			])
		})

		const res = await app.handle(post('/', { a: 'some', b: 1 }))
		expect(res.status).toBe(200)

		const res2 = await app.handle(post('/', { a: 'some' }))
		expect(res2.status).toBe(422)
	})
})
