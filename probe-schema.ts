import { Elysia, t } from './src'
import { getSchemaValidator } from './src/schema'

// Case 1: the issue repro — t.String() alongside t.File()
const schema1 = t.Object({
	file: t.File(),
	metadata: t.String()
})

const v1 = getSchemaValidator(schema1, {
	// @ts-expect-error
	models: {},
	modules: (globalThis as any).TypeBoxModule,
	normalize: undefined,
	additionalCoerce: (() => {
		return undefined
	})()
} as any)

console.log('--- case1 raw schema type:', (schema1 as any)[Symbol.for('TypeBox.Kind')])
console.log('--- case1 properties:', Object.keys((schema1 as any).properties ?? {}))

// Inspect post-coercion schema via the real path used by index.ts
const { coerceFormData, coercePrimitiveRoot } = await import('./src/replace-schema')
const { hasType, resolveSchema } = await import('./src/schema')

const resolved = resolveSchema(schema1, {}, undefined as any)
console.log('--- resolved hasType File:', hasType('File', resolved as any))

const v2 = getSchemaValidator(schema1, {
	// @ts-expect-error
	models: {},
	dynamic: true,
	additionalCoerce: coerceFormData(),
	normalize: undefined
} as any)

const post = (v2 as any).schema
console.log('--- post-coercion schema kind:', post?.[Symbol.for('TypeBox.Kind')])
for (const [k, val] of Object.entries(post?.properties ?? {})) {
	console.log('  prop', k, JSON.stringify(val, (key, v) => (key === Symbol.for('TypeBox.Kind') ? undefined : v)).slice(0, 300))
}

// Case 2: nested object/array multipart
const schema3 = t.Object({
	name: t.String(),
	metadata: t.Object({
		theme: t.String()
	}),
	images: t.Object({
		update: t.Array(t.Object({ id: t.String(), img: t.File() }))
	})
})

const v3 = getSchemaValidator(schema3, {
	// @ts-expect-error
	models: {},
	dynamic: true,
	additionalCoerce: coerceFormData(),
	normalize: undefined
} as any)

const post3 = (v3 as any).schema
console.log('--- case3 post-coercion:')
console.log(JSON.stringify(post3, (key, v) => (key === Symbol.for('TypeBox.Kind') ? undefined : v)).slice(0, 1200))

// Case 4: multipart body WITHOUT files — coercePrimitiveRoot applied
const v4 = getSchemaValidator(
	t.Object({ metadata: t.Object({ theme: t.String() }), note: t.String() }),
	{
		// @ts-expect-error
		models: {},
		dynamic: true,
		additionalCoerce: coercePrimitiveRoot(),
		normalize: undefined
	} as any
)
console.log('--- case4 (no files, coercePrimitiveRoot):')
console.log(JSON.stringify((v4 as any).schema, (key, v) => (key === Symbol.for('TypeBox.Kind') ? undefined : v)).slice(0, 800))
