/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Platform {
			context: ExecutionContext;
		}

		// interface Locals {}
		// interface Error {}
		// interface Session {}
		// interface Stuff {}
	}
}

export {};
