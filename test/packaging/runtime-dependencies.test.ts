import { describe, expect, it } from 'bun:test'
import { Glob } from 'bun'
import { builtinModules } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import pack from '../../package.json'

// I have nothing but my burger and I want nothing more

const root = join(import.meta.dir, '../..')

const dependencies: Record<string, string> = pack.dependencies
const peerDependencies: Record<string, string> = pack.peerDependencies

const packageName = (specifier: string) =>
	specifier.startsWith('@')
		? specifier.split('/').slice(0, 2).join('/')
		: specifier.split('/')[0]

const isBare = (specifier: string) =>
	!specifier.startsWith('.') &&
	!specifier.startsWith('/') &&
	!specifier.startsWith('node:') &&
	specifier !== 'bun' &&
	!builtinModules.includes(specifier)

/**
 * Packages `src` imports as soon as Elysia loads, so a plain install must
 * provide them.
 *
 * #1951: `elysia@2.0.0-exp.60` marked `typebox` an optional peer while
 * `dist/type/index.mjs` imported `typebox/type`, so Bun skipped installing it
 * and the app died on boot with `Cannot find module 'typebox/type'`.
 */
const staticRuntimeImports = () => {
	const transpiler = new Bun.Transpiler({ loader: 'ts' })
	const specifiers = new Set<string>()

	for (const file of new Glob('src/**/*.ts').scanSync({ cwd: root })) {
		// transform first so `import type` and inline `type` specifiers are erased
		const js = transpiler.transformSync(
			readFileSync(join(root, file), 'utf8')
		)

		for (const { kind, path } of transpiler.scan(js).imports) {
			if (kind !== 'import-statement' || !isBare(path)) continue

			specifiers.add(packageName(path))
		}
	}

	return [...specifiers].sort()
}

describe('Package metadata', () => {
	it('installs every package the runtime imports', () => {
		const optionalPeers = new Set(
			Object.entries(pack.peerDependenciesMeta ?? {})
				.filter(([, meta]) => meta.optional)
				.map(([name]) => name)
		)

		const imported = staticRuntimeImports()

		// Guard against a vacuous pass if the scan stops finding imports
		expect(imported).toContain('@sinclair/typebox')

		const skipped = imported.filter(
			(name) =>
				!dependencies[name] &&
				(!peerDependencies[name] || optionalPeers.has(name))
		)

		expect(
			skipped,
			`a plain install would skip packages imported by src (see #1951): ${skipped.join(', ')}`
		).toEqual([])
	})
})
