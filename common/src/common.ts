import { z } from 'zod';

export const clientToServerSchema = z
	.object({
		type: z.literal('add'),
		item: z.string(),
	})
	.or(z.object({ type: z.literal('remove'), id: z.string() }))
	.or(z.object({ type: z.literal('rename'), name: z.string() }))
	.or(
		z.object({
			type: z.literal('check'),
			id: z.string(),
			checked: z.boolean(),
		}),
	)
	.or(
		z.object({
			type: z.literal('refresh'),
		}),
	);

export type ClientToServer = z.infer<typeof clientToServerSchema>;

export type ServerToClient =
	| {
			type: 'check';
			id: string;
			checked: boolean;
	  }
	| {
			type: 'rename';
			name: string;
	  }
	| {
			type: 'sync';
			data: List;
	  };

export type List = {
	name: string;
	items: Array<{ id: string; text: string; checked: boolean }>;
};
