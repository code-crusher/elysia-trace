// Regression guard for:
// https://github.com/elysiajs/elysia/issues/1973
//
// Elysia must import TypeBox statically so that bundlers (Vercel,
// esbuild, etc.) can see and include it in the output. If TypeBox is
// ever loaded through runtime require (createRequire/import.meta.require),
// bundlers silently exclude it and the deployed artifact crashes with
// MODULE_NOT_FOUND when node_modules is not shipped.
//
// This is why the test bundles the app first and then runs the artifact
// with node_modules unavailable: a bundle that resolved TypeBox lazily
// would fail at first schema use, not at import time.

import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, renameSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// I have nothing but my burger and I want nothing more

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))

if ('Bun' in globalThis) {
	throw new Error('❌ Use Node.js to run this test!')
}

setTimeout(() => {
	console.log('❌ Bundled Node.js timed out')
	process.exit(1)
}, 60000)

const main = async () => {
	const esbuild = resolve(here, 'node_modules/esbuild/bin/esbuild')
	const artifact = resolve(here, 'dist/app.cjs')

	mkdirSync(resolve(here, 'dist'), { recursive: true })

	// 1. Bundle the app exactly like a serverless deployment would
	const bundle = spawnSync(
		esbuild,
		[
			resolve(here, 'app.js'),
			'--bundle',
			'--platform=node',
			'--format=cjs',
			`--outfile=${artifact}`
		],
		{ stdio: 'inherit' }
	)

	if (bundle.status !== 0) {
		throw new Error('❌ Bundled Node.js failed to bundle')
	}

	// A working bundle inlines the schema machinery instead of
	// deferring it to node_modules, and must not reference a
	// typebox/type module it cannot resolve at runtime
	const output = readFileSync(artifact, 'utf8')
	if (!output.includes('TypeBox.Kind')) {
		throw new Error(
			'❌ Bundled Node.js failed: TypeBox is not in the bundle, it would crash on deployment (see #1973)'
		)
	}
	if (output.includes("typebox/type")) {
		throw new Error(
			'❌ Bundled Node.js failed: bundle requires module not in node_modules, it would crash on deployment (see #1973)'
		)
	}

	// 2. Make node_modules unreachable, as on a serverless artifact
	const installed = resolve(here, 'node_modules')
	const hidden = resolve(here, 'node_modules_hidden')
	renameSync(installed, hidden)

	try {
		const { app } = require(artifact)
		const serverless = (path) =>
			app
				.handle(new Request(`http://localhost${path}`))
				.then((r) => r.text())

		const root = await serverless('/')
		if (root !== 'Node.js') {
			throw new Error(`❌ Bundled Node.js failed: GET / -> ${root}`)
		}

		const id = await serverless('/id/123')
		if (id !== '123') {
			throw new Error(`❌ Bundled Node.js failed: GET /id/123 -> ${id}`)
		}

		// Schema validation must be inlined too, or serving fails
		const invalid = await app.handle(
			new Request('http://localhost/id/not-a-number')
		)
		if (invalid.status !== 422) {
			throw new Error(
				`❌ Bundled Node.js failed: expected 422, got ${invalid.status}`
			)
		}
	} finally {
		renameSync(hidden, installed)
	}

	console.log('✅ Bundled Node.js works!')

	process.exit()
}

main()
