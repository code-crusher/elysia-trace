import { t } from './src'
import { Kind } from '@sinclair/typebox'
import { getSchemaValidator, getSchemaProperties, unwrapImportSchema } from './src/schema'
import { coerceFormData, coercePrimitiveRoot } from './src/replace-schema'

const show = (label: string, prop: any) => {
	console.log(
		label.padEnd(28),
		'elysiaMeta:', String(prop?.elysiaMeta ?? '-').padEnd(12),
		'type:', String(prop?.type ?? '-').padEnd(8),
		'Kind:', String(prop?.[Kind] ?? '-')
	)
}

const withFiles = t.Object({
	plainString: t.String(),
	optObject: t.Optional(t.Object({ a: t.String() })),
	unionObj: t.Union([t.Object({ a: t.String() }), t.String()]),
	unionScalar: t.Union([t.String(), t.Number()]),
	num: t.Numeric(),
	bool: t.BooleanString(),
	arr: t.ArrayString(t.String()),
	objStr: t.ObjectString({ a: t.String() }),
	files: t.Files(),
	anyVal: t.Any()
})

const v = getSchemaValidator(withFiles, {
	// @ts-expect-error
	models: {},
	dynamic: true,
	additionalCoerce: coerceFormData(),
	normalize: undefined
} as any)

const props = getSchemaProperties(unwrapImportSchema((v as any).schema))
for (const [k, p] of Object.entries(props ?? {})) show('files+' + k, p)

// no files -> coercePrimitiveRoot
const noFiles = t.Object({
	plainString: t.String(),
	nested: t.Object({ a: t.String() }),
	optObject: t.Optional(t.Object({ a: t.String() }))
})
const v2 = getSchemaValidator(noFiles, {
	// @ts-expect-error
	models: {},
	dynamic: true,
	additionalCoerce: coercePrimitiveRoot(),
	normalize: undefined
} as any)
const props2 = getSchemaProperties(unwrapImportSchema((v2 as any).schema))
for (const [k, p] of Object.entries(props2 ?? {})) show('nofiles+' + k, p)
