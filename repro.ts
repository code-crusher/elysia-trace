import { Elysia, t } from './src'

const app = new Elysia().post(
	'/upload',
	({ body }) => body.metadata,
	{
		body: t.Object({
			file: t.File(),
			metadata: t.String()
		}),
		type: 'multipart/form-data'
	}
)

const form = new FormData()

form.append(
	'file',
	new File(['example'], 'example.txt', {
		type: 'text/plain'
	})
)

form.append('metadata', JSON.stringify({ theme: 'dark' }))

const response = await app.handle(
	new Request('http://localhost/upload', {
		method: 'POST',
		body: form
	})
)

console.log('status:', response.status)
console.log('body:', await response.text())
