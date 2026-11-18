import { Elysia, t } from './src'
import { getSchemaValidator } from './src/schema'
import { coerceFormData } from './src/replace-schema'
import { getSchemaProperties, unwrapImportSchema } from './src/schema'

const elysia = new Elysia().model(
	'userWithAvatar',
	t.Object({
		name: t.String(),
		avatar: t.File(),
		metadata: t.Object({ age: t.Number() })
	})
)

const validator = getSchemaValidator(elysia.definitions.typebox.Import('userWithAvatar') as any, {
	// @ts-expect-error
	models: elysia.definitions.type,
	modules: elysia.definitions.typebox,
	dynamic: true,
	additionalCoerce: coerceFormData(),
	normalize: undefined
} as any)

const schema = unwrapImportSchema((validator as any).schema)
console.log('kind:', schema[Symbol.for('TypeBox.Kind')])
const properties = getSchemaProperties(schema)
for (const [k, v] of Object.entries(properties ?? {})) {
	console.log(
		k,
		'=>',
		JSON.stringify(v, (key, value) =>
			key === Symbol.for('TypeBox.Kind') ? undefined : value
		).slice(0, 200)
	)
}
