import { describe, it, expect } from 'bun:test'

import { Elysia } from '../../src'

// The OpenAPI document is generated from `route.hooks.detail`: the
// @elysiajs/openapi plugin reads `hooks.detail.tags`, `hooks.detail.summary`,
// etc. and nothing else. If an instance's `tags`/`detail` config never reaches
// that object, the tag simply vanishes from the generated spec — which is
// issue #1947: `new Elysia({ tags: ['Users'] }).use(users)` documented the
// users routes as untagged. These tests pin the propagation contract for every
// level that declares metadata (config, guard, route), including the `tags`
// shorthand (it overrides `detail.tags`, as in Elysia 1).

const detailOf = (app: InstanceType<typeof Elysia>, path = '/u') =>
	(app.routes.find((r) => r.path === path)!.hooks as any)?.detail

describe('instance-level tags and detail propagate to routes', () => {
	it('applies config tags to routes registered before and via .use()', () => {
		const users = new Elysia().get('/u', () => 'u')

		const app = new Elysia({ tags: ['Users'] })
			.get('/own', () => 'own')
			.use(users)

		// the issue's exact scenario
		expect(detailOf(app, '/u')).toEqual({ tags: ['Users'] })
		expect(detailOf(app, '/own')).toEqual({ tags: ['Users'] })
	})

	it('merges config detail per key with config tags overriding detail.tags', () => {
		const app = new Elysia({
			detail: { summary: 'All users' },
			tags: ['Users']
		}).get('/u', () => 'u')

		expect(detailOf(app)).toEqual({
			tags: ['Users'],
			summary: 'All users'
		})

		// the shorthand wins over detail.tags, as in Elysia 1
		const overridden = new Elysia({
			detail: { tags: ['from-detail'] },
			tags: ['from-shorthand']
		}).get('/u', () => 'u')

		expect(detailOf(overridden)).toEqual({ tags: ['from-shorthand'] })
	})

	it('propagates a plugin instance config to its own routes through .use()', () => {
		const users = new Elysia({ tags: ['Users'] }).get('/u', () => 'u')
		const app = new Elysia().use(users)

		expect(detailOf(app)).toEqual({ tags: ['Users'] })
	})

	it('keeps the innermost config when nested instances both declare tags', () => {
		// Elysia 1 semantics: a plugin's own config documents its routes, an
		// outer instance's config does not overwrite it
		const inner = new Elysia({ tags: ['Inner'] }).get('/u', () => 'u')
		const app = new Elysia({ tags: ['Outer'] }).use(inner)

		expect(detailOf(app)).toEqual({ tags: ['Inner'] })

		// non-tags detail keys of both levels merge, the inner one wins per key
		const withDetail = new Elysia({
			detail: { description: 'outer' }
		}).use(
			new Elysia({ detail: { summary: 'inner' } }).get('/u', () => 'u')
		)

		expect(detailOf(withDetail)).toEqual({
			summary: 'inner',
			description: 'outer'
		})
	})

	it('applies config detail to group() child routes', () => {
		const app = new Elysia({ tags: ['Users'] }).group('/x', (g) =>
			g.get('/u', () => 'u')
		)

		expect(detailOf(app, '/x/u')).toEqual({ tags: ['Users'] })
	})

	it('folds the guard tags shorthand into detail.tags', () => {
		const app = new Elysia()
			.guard({ tags: ['Users'] } as any)
			.get('/u', () => 'u')

		expect(detailOf(app)).toEqual({ tags: ['Users'] })

		// the shorthand overrides a guard's own detail.tags
		const overridden = new Elysia()
			.guard({ tags: ['Users'], detail: { tags: ['other'] } } as any)
			.get('/u', () => 'u')

		expect(detailOf(overridden)).toEqual({ tags: ['Users'] })
	})

	it('merges guard detail under route detail per key', () => {
		const app = new Elysia()
			.guard({ detail: { summary: 'from guard' } } as any)
			.get(
				'/u',
				{ detail: { description: 'from route' } } as any,
				() => 'u'
			)

		expect(detailOf(app)).toEqual({
			summary: 'from guard',
			description: 'from route'
		})

		// the route wins on a shared key
		const lastWins = new Elysia()
			.guard({ detail: { summary: 'from guard' } } as any)
			.get('/u', { detail: { summary: 'from route' } } as any, () => 'u')

		expect(detailOf(lastWins)).toEqual({ summary: 'from route' })
	})

	it('folds the route tags shorthand into detail.tags', () => {
		const app = new Elysia().get(
			'/u',
			{ tags: ['Users'] } as any,
			() => 'u'
		)

		expect(detailOf(app)).toEqual({ tags: ['Users'] })

		// the shorthand overrides the route's own detail.tags
		const overridden = new Elysia().get(
			'/u',
			{ tags: ['Users'], detail: { tags: ['other'] } } as any,
			() => 'u'
		)

		expect(detailOf(overridden)).toEqual({ tags: ['Users'] })
	})

	it('resolves tags across levels like Elysia 1 (nearest declaration wins)', () => {
		// route > guard > config
		expect(
			detailOf(
				new Elysia({ tags: ['config'] } as any)
					.guard({ tags: ['guard'] } as any)
					.get('/u', { tags: ['route'] } as any, () => 'u')
			)
		).toEqual({ tags: ['route'] })

		expect(
			detailOf(
				new Elysia({ tags: ['config'] } as any)
					.guard({ tags: ['guard'] } as any)
					.get('/u', () => 'u')
			)
		).toEqual({ tags: ['guard'] })

		// a route's detail without tags keeps the guard's tags
		expect(
			detailOf(
				new Elysia()
					.guard({ tags: ['guard'] } as any)
					.get('/u', { detail: { summary: 's' } } as any, () => 'u')
			)
		).toEqual({ tags: ['guard'], summary: 's' })
	})

	it('does not mutate the caller config, guard or route hook', () => {
		const config = { detail: { summary: 's' }, tags: ['t'] }
		const guard = { detail: { summary: 'g' }, tags: ['g'] }
		const route = { detail: { summary: 'r' }, tags: ['r'] }

		new Elysia(config)
			.guard(guard as any)
			.get('/u', route as any, () => 'u')

		void detailOf(new Elysia(config).get('/u', route as any, () => 'u'))

		expect(config).toEqual({ detail: { summary: 's' }, tags: ['t'] })
		expect(guard).toEqual({ detail: { summary: 'g' }, tags: ['g'] })
		expect(route).toEqual({ detail: { summary: 'r' }, tags: ['r'] })
	})

	it('serves requests with instance tags set (regression: registration still works)', async () => {
		const app = new Elysia({ tags: ['Users'] })
			.get('/u', () => 'u')
			.get('/u/:id', ({ params }) => params.id)

		await expect(
			app.handle(new Request('http://localhost/u')).then((r) => r.text())
		).resolves.toBe('u')
		await expect(
			app
				.handle(new Request('http://localhost/u/42'))
				.then((r) => r.text())
		).resolves.toBe('42')
	})

	// I have nothing but my burger and I want nothing more
})
