import { describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dir, '../..')

/**
 * Repository-only agent guidance must never be published.
 *
 * Agent tooling scans dependency trees recursively for files such as
 * `AGENTS.md`, so shipping them makes a consumer's agent apply Elysia's
 * repository instructions to their own project.
 */
const agentGuidancePattern =
	/^(?:AGENTS|CLAUDE|GEMINI)\.md$|^AI_POLICY\.md$|^\.cursorrules$|^\.mcp\.json$|^copilot-instructions\.md$|^(?:\.claude|\.cursor)\//

const packFiles = () => {
	const result = Bun.spawnSync(
		['npm', 'pack', '--dry-run', '--json', '--ignore-scripts'],
		{ cwd: root }
	)

	if (result.exitCode !== 0)
		throw new Error(`npm pack failed: ${result.stderr.toString()}`)

	const [pack] = JSON.parse(result.stdout.toString())

	return pack.files.map((file: { path: string }) => file.path)
}

describe('Published package contents', () => {
	it('excludes repository-only agent guidance', () => {
		// Guard against a vacuous test if the guidance files are renamed
		expect(
			['AGENTS.md', 'CLAUDE.md', 'AI_POLICY.md'].filter((file) =>
				existsSync(join(root, file))
			)
		).not.toBeEmpty()

		const files = packFiles()

		// Guard against an empty result masking a leak
		expect(files).toContain('package.json')

		expect(
			files.filter((file: string) => agentGuidancePattern.test(file))
		).toEqual([])
	})
})
