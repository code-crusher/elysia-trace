import { Elysia, t } from './src'
import { z } from 'zod'
import { getSchemaValidator, unwrapImportSchema } from './src/schema'
import { coerceFormData } from './src/replace-schema'
import { Kind } from '@sinclair/typebox'

const zodSchema = z.object({
	file: z.file(),
	metadata: z.object({ age: z.coerce.number() }),
	note: z.string()
})

const validator = getSchemaValidator(zodSchema as any, {
	// @ts-expect-error
	models: {},
	dynamic: true,
	additionalCoerce: coerceFormData(),
	normalize: undefined
} as any)

console.log('provider:', (validator as any).provider)
const s = (validator as any).schema
console.log('same as zod schema:', s === zodSchema)
console.log('has Kind:', Kind in (s as any))
console.log('zod description:', s?.description ?? '<none>')

// How does hasType('File', zodSchema) behave?
const { hasType } = await import('./src/schema')
console.log('hasType File on zod:', hasType('File', zodSchema as any))

// so for zod, coerceFormData is NOT applied (resolveSchema/Kind check fails)
// => check what coerce it gets: coercePrimitiveRoot
const { coercePrimitiveRoot } = await import('./src/replace-schema')
console.log('--- how does the zod flow get JSON-parsed values then?')
console.log('It relies purely on parseFormData normalization (no schema markers).')
