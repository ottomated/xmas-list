<script lang="ts">
	import type { ClientToServer, ServerToClient } from 'common';
	import { WebSocket as RWS } from 'partysocket';
	const { data } = $props();

	let name = $state(data.data.name);
	let items = $state.raw(data.data.items);

	let ws: RWS;
	$effect(() => {
		ws = new RWS(data.ws);
		ws.addEventListener('message', (event) => {
			const msg = JSON.parse(event.data) as ServerToClient;
			if (msg.type === 'sync') {
				items = msg.data.items;
				name = msg.data.name;
				return;
			}
		});
		return () => {
			ws.close();
		};
	});
	function send(msg: ClientToServer) {
		ws.send(JSON.stringify(msg));
	}
	let newItem = $state('');
	let copied = $state(false);
</script>

<main class="flex max-w-sm flex-col p-4">
	<h1 class="mb-4 text-lg">Editing Xmas List</h1>
	<label>
		Your Name:
		<input
			class="border border-white bg-transparent px-1 py-0.5"
			value={name}
			oninput={(ev) => send({ type: 'rename', name: ev.currentTarget.value })}
		/>
	</label>
	<hr class="my-4 border-neutral-500" />
	<h2 class="text-lg">Items</h2>
	<ul>
		{#each items as item}
			<li>
				{item.text}
				<button
					class="inline-block text-sm text-red-300 hover:underline"
					onclick={() => send({ type: 'remove', id: item.id })}>delete</button
				>
			</li>
		{/each}
	</ul>

	<div class="mt-4 flex items-center gap-2">
		<input
			placeholder="New item..."
			bind:value={newItem}
			class="border border-white bg-transparent px-1 py-0.5"
		/>
		<button
			disabled={!newItem}
			class="text-sm text-blue-300 enabled:hover:underline disabled:text-neutral-400"
			onkeydown={(ev) => {
				if (ev.key === 'Enter') {
					send({ type: 'add', item: newItem });
					newItem = '';
				}
			}}
			onclick={() => {
				send({ type: 'add', item: newItem });
				newItem = '';
			}}
		>
			Add
		</button>
	</div>
	<hr class="my-8 border-neutral-500" />

	<button
		class="w-fit text-sm text-purple-300 hover:underline"
		onclick={() => {
			const url = new URL(`/list/${data.id}`, location.origin);
			navigator.clipboard
				.writeText(url.href)
				.then(() => {
					copied = true;
					setTimeout(() => {
						copied = false;
					}, 1000);
				})
				.catch((err) => {
					alert('Failed to copy: ' + err);
				});
		}}
	>
		{copied ? 'Copied!' : 'Copy Link'}
	</button>
	<p class="text-sm italic text-neutral-300">
		Don't view the above link unless you want to see which items are claimed.
		Just send it out.
	</p>
</main>
