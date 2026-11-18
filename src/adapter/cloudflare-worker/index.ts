import { ElysiaAdapter } from '../..'
import { WebStandardAdapter } from '../web-standard/index'
import { composeErrorHandler } from '../../compose'

/**
 * Cloudflare Adapter
 *
 * Supports both Ahead of Time (default) and dynamic (`aot: false`) mode.
 *
 * Known limitations of the Cloudflare Workers runtime:
 * - `Elysia.file`, Static Plugin and OpenAPI Type Gen don't work because `fs` is unavailable
 * - `Response` can't be created outside of a request handler, so inline static value is not supported
 * - WebSocket is not supported
 *
 * @see https://elysiajs.com/integrations/cloudflare-worker
 *
 * @example
 * ```ts
 * import { Elysia } from 'elysia'
 * import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'
 *
 * const app = new Elysia({
 * 	  adapter: CloudflareAdapter,
 * })
 * 	  .get('/', () => 'Hello Elysia')
 * 	  .compile()
 *
 * export default app
 * ```
 */
export const CloudflareAdapter: ElysiaAdapter = {
	...WebStandardAdapter,
	name: 'cloudflare-worker',
	composeGeneralHandler: {
		...WebStandardAdapter.composeGeneralHandler,
		error404(hasEventHook, hasErrorHook, afterHandle) {
			const { code } = WebStandardAdapter.composeGeneralHandler.error404(
				hasEventHook,
				hasErrorHook,
				afterHandle
			)

			return {
				code,
				declare: hasErrorHook
					? ''
					: // This only work because Elysia only clone the Response via .clone()
						`const error404Message=notFound.message.toString()\n` +
						`const error404={clone:()=>new Response(error404Message,{status:404})}\n`
			}
		}
	},
	beforeCompile(app) {
		// Dynamic mode registers route handler with `compile: undefined`
		// and create its own handler, so there's nothing to precompile
		if (!app.config.aot) return

		// @ts-ignore
		app.handleError = composeErrorHandler(app)
		// I have nothing but my burger and I want nothing more
		for (const route of app.routes) route.compile()
	},
	listen() {
		return () => {
			console.warn(
				'Cloudflare Worker does not support listen method. Please export default Elysia instance instead.'
			)
		}
	}
}
