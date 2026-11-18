import { Elysia, t } from './src'

// Behavior matrix for multipart single-string fields
const cases = [
	{
		name: 'issue: t.String() containing JSON + t.File (aot)',
		aot: true,
		body: t.Object({ file: t.File(), metadata: t.String() }),
		form: () => {
			const f = new FormData()
			f.append('file', new File(['example'], 'a.txt', { type: 'text/plain' }))
			f.append('metadata', JSON.stringify({ theme: 'dark' }))
			return f
		}
	},
	{
		name: 'issue: t.String() containing JSON + t.File (dynamic)',
		aot: false,
		body: t.Object({ file: t.File(), metadata: t.String() }),
		form: () => {
			const f = new FormData()
			f.append('file', new File(['example'], 'a.txt', { type: 'text/plain' }))
			f.append('metadata', JSON.stringify({ theme: 'dark' }))
			return f
		}
	},
	{
		name: 't.Object field sent as JSON string (aot)',
		aot: true,
		body: t.Object({ file: t.File(), metadata: t.Object({ theme: t.String() }) }),
		form: () => {
			const f = new FormData()
			f.append('file', new File(['example'], 'a.txt', { type: 'text/plain' }))
			f.append('metadata', JSON.stringify({ theme: 'dark' }))
			return f
		}
	},
	{
		name: 't.Object field sent as JSON string (dynamic)',
		aot: false,
		body: t.Object({ file: t.File(), metadata: t.Object({ theme: t.String() }) }),
		form: () => {
			const f = new FormData()
			f.append('file', new File(['example'], 'a.txt', { type: 'text/plain' }))
			f.append('metadata', JSON.stringify({ theme: 'dark' }))
			return f
		}
	},
	{
		name: 't.Array field sent as JSON string (aot)',
		aot: true,
		body: t.Object({ file: t.File(), tags: t.Array(t.String()) }),
		form: () => {
			const f = new FormData()
			f.append('file', new File(['example'], 'a.txt', { type: 'text/plain' }))
			f.append('tags', JSON.stringify(['a', 'b']))
			return f
		}
	},
	{
		name: 'multipart WITHOUT any file, t.Object field (aot)',
		aot: true,
		body: t.Object({ metadata: t.Object({ theme: t.String() }) }),
		form: () => {
			const f = new FormData()
			f.append('metadata', JSON.stringify({ theme: 'dark' }))
			return f
		}
	},
	{
		name: 'multipart WITHOUT any file, t.String containing JSON (aot)',
		aot: true,
		body: t.Object({ metadata: t.String() }),
		form: () => {
			const f = new FormData()
			f.append('metadata', JSON.stringify({ theme: 'dark' }))
			return f
		}
	},
	{
		name: 'multipart WITHOUT file, no schema (aot)',
		aot: true,
		body: undefined,
		form: () => {
			const f = new FormData()
			f.append('metadata', JSON.stringify({ theme: 'dark' }))
			return f
		}
	}
]

for (const c of cases) {
	const handler = ({ body }: any) => body
	const app = new Elysia({ aot: c.aot }).post(
		'/',
		c.body ? handler : handler,
		c.body ? { body: c.body } : {}
	)

	const response = await app.handle(
		new Request('http://localhost/', { method: 'POST', body: c.form() })
	)

	let out: unknown
	try {
		out = await response.json()
	} catch {
		out = '<unserializable>'
	}
	console.log(
		`[${response.status}] ${c.name}:`,
		JSON.stringify(out).slice(0, 120)
	)
}
