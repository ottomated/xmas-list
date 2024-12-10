<script lang="ts">
	import type { ClientToServer, ServerToClient } from 'common';
	import { WebSocket as RWS } from 'partysocket';
	const { data } = $props();

	let name = $state(data.data.name);
	let items = $state(data.data.items);

	let ws: RWS;
	$effect(() => {
		ws = new RWS(data.ws);
		ws.addEventListener('message', (event) => {
			const msg = JSON.parse(event.data) as ServerToClient;
			if (msg.type === 'check') {
				const i = items.find((i) => i.id === msg.id);
				if (i) {
					i.checked = msg.checked;
				}
				return;
			}
			if (msg.type === 'sync') {
				items = msg.data.items;
				name = msg.data.name;
				return;
			}
			if (msg.type === 'rename') {
				name = msg.name;
			}
		});
		return () => {
			ws.close();
		};
	});
	function send(msg: ClientToServer) {
		ws.send(JSON.stringify(msg));
	}
	$inspect(items);
</script>

<svelte:head>
	<title>{name ? `${name}'s ` : ''}Xmas List</title>
</svelte:head>

<main class="flex max-w-sm flex-col p-4">
	<h1 class="text-lg">{name ? `${name}'s ` : ''}Xmas List</h1>
	<p class="text-sm italic text-neutral-300">
		Click to claim items anonymously.
	</p>
	<ul class="my-4">
		{#each items as item}
			<li>
				<label class="cursor-pointer">
					<input
						type="checkbox"
						checked={item.checked}
						onchange={(ev) => {
							send({
								type: 'check',
								id: item.id,
								checked: ev.currentTarget.checked,
							});
						}}
					/>
					<span
						class:line-through={item.checked}
						class:text-neutral-400={item.checked}>{item.text}</span
					>
				</label>
			</li>
		{/each}
	</ul>
	{#if items.length === 0}
		<p class="text-sm italic text-red-300">Nothing on this list yet.</p>
	{/if}
</main>
