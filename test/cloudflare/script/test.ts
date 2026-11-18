const server = Bun.spawn({
	cmd: ['bunx', 'wrangler', 'dev', '--port', '8787', '--local'],
})

Bun.sleepSync(750)

setInterval(async () => {
	const response = await fetch('http://localhost:8787').catch(() => {})
	if (!response) return

	const value = await response.text()

	if (value !== 'Elysia on Cloudflare Worker!' || !response.status) return

	// Dynamic mode is documented as supported, make sure it runs too
	const dynamic = await fetch('http://localhost:8787/dynamic').catch(() => {})
	if (!dynamic) return

	if ((await dynamic.text()) !== 'Elysia on Cloudflare Worker (dynamic)!')
		return

	console.log('✅ Cloudflare Worker works')
	server.kill('SIGKILL')
	process.exit(0)
}, 500)

setTimeout(() => {
	console.log("❌ Cloudflare Worker doesn't work")
	server.kill('SIGKILL')
	process.exit(1)
}, 8000)
