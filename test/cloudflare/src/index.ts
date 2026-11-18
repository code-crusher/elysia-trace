import { Elysia } from 'elysia'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'

const sub = new Elysia().get('/test', () => 'hello')

// Dynamic mode is documented as supported, make sure it can be compiled
const dynamic = new Elysia({ adapter: CloudflareAdapter, aot: false })
	.get('/dynamic', () => 'Elysia on Cloudflare Worker (dynamic)!')
	.compile()

export default new Elysia({ adapter: CloudflareAdapter })
	.get('/', () => 'Elysia on Cloudflare Worker!')
	.use(sub)
	.use(dynamic)
	.compile()
