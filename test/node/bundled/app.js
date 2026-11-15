import { Elysia, t } from 'elysia'

export const app = new Elysia()
	.get('/', () => 'Node.js', {
		response: t.String()
	})
	.get('/id/:id', ({ params }) => params.id, {
		params: t.Object({
			id: t.Number()
		})
	})
