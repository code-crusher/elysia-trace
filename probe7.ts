import { Elysia } from './src'

// .wrap() HOC path — parameters are forwarded to hocMap
const app = new Elysia()
	.wrap((fn) => (req: Request, si: any) => fn(req, si))
	.get('/', ({ addr }: any) => ({ addr }))
	.listen(0)

const port = (app.server as any).port
const r = await fetch(`http://localhost:${port}/`)
console.log('hoc fetch:', await r.text())
app.stop()

// cloudflare-style: compile() then fetch
const cf = new Elysia().get('/', ({ addr }: any) => ({ addr })).compile()
console.log('compiled no info:', await (await cf.fetch(new Request('http://localhost/'))).text())
console.log('compiled deno:', await (await cf.fetch(new Request('http://localhost/'), { remoteAddr: { transport: 'tcp', hostname: '1.2.3.4', port: 1 } } as any)).text())
