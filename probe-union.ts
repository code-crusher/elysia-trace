import { Elysia, t } from './src'
import { getSchemaValidator } from './src/schema'
import { coerceFormData } from './src/replace-schema'
import { getSchemaProperties, unwrapImportSchema } from './src/schema'
import { Kind } from '@sinclair/typebox'

// Union case: t.Union([t.Object({...}), t.Object({...})]) with File inside
const schema = t.Union([
	t.Object({ a: t.File(), meta: t.Object({ x: t.String() }) }),
	t.Object({ b: t.String() })
])

const validator = getSchemaValidator(schema, {
	// @ts-expect-error
	models: {},
	dynamic: true,
	additionalCoerce: coerceFormData(),
	normalize: undefined
} as any)

const s = (validator as any).schema
console.log('union kind:', s[Kind])
console.log(
	JSON.stringify(s, (key, value) =>
		key === Symbol.for('TypeBox.Kind') ? undefined : value
	).slice(0, 700)
)
const properties = getSchemaProperties(s)
console.log('getSchemaProperties:', Object.keys(properties ?? {}))

// Union nested per property
const schema2 = t.Object({
	file: t.File(),
	images: t.Union([t.Object({ x: t.String() }), t.String()])
})
const validator2 = getSchemaValidator(schema2, {
	// @ts-expect-error
	models: {},
	dynamic: true,
	additionalCoerce: coerceFormData(),
	normalize: undefined
} as any)
console.log('case2:', JSON.stringify((validator2 as any).schema.properties.images, (key, value) => key === Symbol.for('TypeBox.Kind') ? undefined : value).slice(0, 400))
