import { Elysia, t } from '../../src'
import { expectTypeOf } from 'expect-type'

// ? Eden Treaty: dynamic params under a method-named path segment (#2006)
//
// Eden's client is built from `~Routes`: one key per path segment, one key
// per dynamic param. A segment named like an HTTP method (`/api/post/:id`)
// must keep modeling a namespace with an `:id` child, exactly like any
// other segment name (`/api/user/:id`), so `Sign`/`CreateParams` can offer
// the param-callable `eden.api.post({ id })` on both.
//
// The runtime of Eden Treaty 2 pops a trailing method-named segment as the
// HTTP method instead, firing POST /api — types and runtime then disagree on
// the same call. This pins the type contract the Eden runtime must honor.
{
	const app = new Elysia({ prefix: '/api' })
		.use(
			new Elysia({ prefix: '/post' }).get(
				'/:id',
				({ params: { id } }) => ({ msg: 'ok', data: { id } }),
				{
					params: t.Object({ id: t.Integer() })
				}
			)
		)
		.use(
			new Elysia({ prefix: '/user' }).get(
				'/:id',
				({ params: { id } }) => ({ msg: 'ok', data: { id } }),
				{
					params: t.Object({ id: t.Integer() })
				}
			)
		)

	type Routes = (typeof app)['~Routes']
	type Post = Routes['api']['post']
	type User = Routes['api']['user']

	// ? a method-named segment stays a namespace with a dynamic child
	expectTypeOf<keyof Post>().toEqualTypeOf<':id'>()

	// ? indistinguishable from a non-method segment name
	expectTypeOf<keyof User>().toEqualTypeOf<':id'>()
	expectTypeOf<Post[':id']>().toEqualTypeOf<User[':id']>()

	expectTypeOf<Post[':id']['get']['params']>().toEqualTypeOf<{
		id: number
	}>()
	expectTypeOf<
		Post[':id']['get']['response'][200]
	>().toEqualTypeOf<{ msg: string; data: { id: number } }>()
}

// ? the method-named segment still composes with sibling method routes
{
	const app = new Elysia({ prefix: '/api' })
		.get('/post', () => 'list' as const)
		.post('/post', () => 'created' as const)
		.get('/post/:id', ({ params: { id } }) => id)

	type Post = (typeof app)['~Routes']['api']['post']

	expectTypeOf<keyof Post>().toEqualTypeOf<'get' | 'post' | ':id'>()
	expectTypeOf<Post['get']['response'][200]>().toEqualTypeOf<'list'>()
	expectTypeOf<Post['post']['response'][200]>().toEqualTypeOf<'created'>()
}

// I have nothing but my burger and I want nothing more
