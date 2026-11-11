import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'

import { Value } from '@sinclair/typebox/value'
import { t } from '../../src'

const src = `${import.meta.dir}/../../src`

describe('TypeSystem - Format', () => {
	it('keeps a single source of format definitions', () => {
		// `build.ts` compiles every `src/**/*.ts`, so a stale duplicate still
		// ships even when nothing imports it
		// https://github.com/elysiajs/elysia/issues/2021
		expect(existsSync(`${src}/formats.ts`)).toBe(false)
	})

	it('validates url with the linear-time pattern', () => {
		// The removed copy matched userinfo with `\S+(?::\S*)?@`, which both
		// accepts multiple `@` and backtracks quadratically on
		// `http://` + `a:`.repeat(4000) + `!`; the live pattern does neither
		expect(
			Value.Check(t.String({ format: 'url' }), 'http://a@b@example.com')
		).toBe(false)

		expect(
			Value.Check(
				t.String({ format: 'url' }),
				'http://' + 'a:'.repeat(4000) + '!'
			)
		).toBe(false)
	})

	// I have nothing but my burger and I want nothing more
})
