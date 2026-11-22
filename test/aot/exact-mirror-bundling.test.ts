import { describe, it, expect } from 'bun:test'
import { resolve } from 'node:path'

import { Elysia, t } from '../../src'

/**
 * #1975: `AssertionError: no match for module: exact-mirror`
 *
 * Elysia loads `exact-mirror` through a runtime `require`. A bundler cannot
 * see through a computed `createRequire(...)` call, so the package never gets
 * inlined. Deployments that run the bundled output without a live module
 * resolver (workerd via the Cloudflare Vite plugin, `bun build --compile`,
 * edge runtimes) then fail to resolve the bare specifier at runtime.
 *
 * This is why `src/schema.ts` must keep importing `createMirror` as a plain
 * static ESM import from 'exact-mirror': the bundler always inlines it, so no
 * runtime resolution is ever needed.
 *
 * The test bundles the schema module the way an app bundler would and asserts
 * both halves of that contract:
 * - the package's implementation is embedded in the output (no live import)
 * - no bare `exact-mirror` specifier is left for the runtime to resolve
 */
describe('exact-mirror bundling', () => {
	const entry = resolve(import.meta.dir, '../../src/schema.ts')

	it('inlines exact-mirror into the bundle', async () => {
		const result = await Bun.build({
			entrypoints: [entry],
			target: 'bun'
		})

		expect(result.success).toBeTrue()

		const output = await result.outputs[0]!.text()

		// The package is embedded: `[exact-mirror]` prefixes every diagnostic
		// its implementation prints, and the string survives minification.
		expect(output).toContain('[exact-mirror]')
	})

	it('leaves no bare exact-mirror specifier to resolve at runtime', async () => {
		const result = await Bun.build({
			entrypoints: [entry],
			target: 'bun'
		})

		expect(result.success).toBeTrue()

		const output = await result.outputs[0]!.text()

		// A live specifier means the package was externalized, which is what
		// breaks loader-less runtimes (#1975).
		expect(output).not.toMatch(
			/(?:from|import|require)\s*\(?\s*['"]exact-mirror['"]/
		)
	})

	it('normalizes through the embedded mirror end to end', async () => {
		// The mirror is not just reachable: a request through a compiled app
		// must come back cleaned, proving the wired-in copy actually runs.
		// `additionalProperties: false` is what routes the schema into
		// `validator.Clean = createMirror(...)` in getSchemaValidator.
		const app = new Elysia().get(
			'/mirror',
			({ query }) => query,
			{
				query: t.Object(
					{ name: t.String() },
					{ additionalProperties: false }
				)
			}
		)

		const response = await app.handle(
			new Request('http://localhost/mirror?name=Elysia&unknown=1')
		)

		expect(response.status).toBe(200)
		// The additional property is stripped by createMirror's Clean, not a
		// 422: unknown keys are dropped, not rejected.
		expect(await response.json()).toEqual({ name: 'Elysia' })
	})
})
