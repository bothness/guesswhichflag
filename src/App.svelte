<script>
	import { onMount } from "svelte";
	import { csvParse } from "d3-dsv";
	import seedrandom from "./seedrandom";
	import { shuffle, getStorage, setStorage } from "./utils";
	import flags_raw from "./flags";
	import Icon from "./Icon.svelte";
	
	const flags = csvParse(flags_raw);
	let zerodate = new Date("2022-04-04");
	zerodate.setHours(0,0,0,0);
	const zeroday = Math.floor(zerodate.getTime() / (60 * 60 * 24 * 1000));
	let todate = new Date();
	todate.setHours(0,0,0,0);
	const today = Math.floor(todate.getTime() / (60 * 60 * 24 * 1000));
	const midnight = new Date();
	midnight.setHours(24,0,0,0);
	
	const turns = 10;
	const options = 4;

	let countdown;

	setInterval(() => {
		countdown = midnight - new Date();
	}, 1000);

	let game = {
		mode: null,
		status: 'start',
		status_prev: [],
		questions: null,
		options: null,
		answers: [],
		turn: 0,
		score: 0
	}
	
	let history = {
		daily: {
			day: today,
			game: null,
		},
		stats: {
			played: 0,
			right: 0,
			wrong: 0,
			streak: 0,
			max: 0,
			dist: [0,0,0,0,0,0,0,0,0,0,0]
		}
	};
	
	function new_game(mode = "practice") {
		let random = mode == "daily" ? new seedrandom(today) : Math.random;
		
		let questions = shuffle(flags, random).slice(0, turns);
		let newoptions = [];
		
		questions.forEach(d => {
			let ops = shuffle(flags.filter(f => f.iso != d.iso), random).slice(0, options - 1);
			newoptions.push(shuffle([...ops, d], random));
		});
		
		game.mode = mode;
		game.questions = questions;
		game.options = newoptions;
		game.answers = [];
		game.turn = game.score = 0;
		game.status = "guess";
	}

	function new_dailygame() {
		if (history.daily.today == today && history.daily.game) {
			game = JSON.parse(JSON.stringify(history.daily.game));
			game.status = game.turn == turns ? "end" : "guess";
		} else {
			history.daily.today = today;
			new_game("daily");
		}
	}
	
	function guess(iso) {
		if (game.questions[game.turn].iso == iso) {
			game.score += 1;
			game.status = "right";
			game.answers.push(true);
			if (game.mode == "daily") {
				history.stats.right += 1;
				history.stats.streak += 1;
				if (history.stats.streak > history.stats.max) history.stats.max += 1;
			}
		} else {
			game.status = "wrong";
			game.answers.push(false);
			if (game.mode == "daily") {
				history.stats.wrong += 1;
				history.stats.streak = 0;
			}
		}
		game.turn += 1;
		if (game.turn == turns) {
			if (game.mode == "daily") {
				history.stats.dist[game.score] += 1;
				history.stats.played += 1;
			}
		}
		if (game.mode == "daily") {
			history.daily.game = JSON.parse(JSON.stringify(game));
			setStorage("flag-game-history", history);
		}
	}
	
	function setStatus(status_new) {
		game.status_prev.push(game.status);
		game.status = status_new;
	}
	
	function prevStatus() {
		game.status = game.status_prev[game.status_prev.length - 1];
		game.status_prev.pop();
	}
	
	function share() {
		let mode = game.mode == "daily" ? ` #${today - zeroday + 1}` : "";
		let str = `#GuessWhichFlag!${mode}
${game.score} out of ${turns} flags
${game.questions.map(q => q.icon).join('')}
${game.answers.map(a => a ? '✔️' : '❌').join('')}
https://guesswhichflag.netlify.app`;
		navigator.clipboard.writeText(str)
		.then(() => alert("Copied: " + str));
	}

	function setHistory() {
		let storage = getStorage("flag-game-history");
		if (storage) {
			history = storage;
		} else {
			setStorage("flag-game-history", history);
		}
	}

	setHistory();
</script>

<header>
	<div class="menu">
		<button on:click={() => setStatus('info')}><Icon/></button>
	</div>
	<h1>Guess which flag!</h1>
	<div class="menu">
		<button on:click={() => setStatus('end')}><Icon type="chart"/></button>
	</div>
</header>
<div class="progress">
	{#each game.answers as answer, i}
	<div style:left="{(i / 10) * 100}%" style:width="10%" style:background-color={answer ? 'rgb(106,170,100)' :  'red'}/>
	{/each}
</div>

<div class="container">
	{#if game.status == 'start'}
	<div class="flag-container">
		{#each shuffle(flags).slice(0,120) as flag}
		<div class="flag-mini"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/{flag.unicode}.svg" alt="{flag.unicode}"/></div>
		{/each}
	</div>
	<button on:click={new_dailygame} style:margin-top="10px">Daily game</button>
	<button on:click={new_game}>Practice game</button>
	{:else if game.status == 'guess'}
	<div class="flag"><img src="https://twemoji.maxcdn.com/v/latest/svg/{game.questions[game.turn].unicode}.svg" alt="{game.questions[game.turn].unicode}"/></div>
	{#each game.options[game.turn] as option}
	<button on:click={() => guess(option.iso)}>{option.name}</button>
	{/each}
	{:else if game.status == 'right' || game.status == 'wrong'}
	<div class="flag"><img src="https://twemoji.maxcdn.com/v/latest/svg/{game.questions[game.turn - 1].unicode}.svg" alt="{game.questions[game.turn - 1].unicode}"/></div>
	{game.status == 'right' ? 'Right!' : 'Wrong...'} It was {game.questions[game.turn - 1].name}.
	{#if game.turn < turns}
	<button on:click={() => game.status = 'guess'}>Next turn</button>
	{:else}
	<button on:click={() => game.status = 'end'}>How did I do?</button>
	{/if}
	{:else if game.status == 'end'}
	{#if game.turn == turns}
	<h2>You scored {game.score} out of {turns}.</h2>
	{#if game.mode != 'daily'}(practice mode){/if}
<div class="flag-container">
		{#each game.answers as answer, i}
		<div class="flag-mini"><img src="https://twemoji.maxcdn.com/v/latest/svg/{game.questions[i].unicode}.svg" alt="{game.questions[i].unicode}"/><br/>{answer ? '✔️' : '❌'}</div>
		{/each}
	</div>
	<button on:click={share}>Share your score <Icon type="share"/></button>
	{/if}
	<h2 style:margin-top="5px">Your daily game stats</h2>
	<hr/>
	<h3>All-time record</h3>
	<div class="num-container">
		<div>
			<span class="text-lrg">{history.stats.played}</span>
			<br/>Played
		</div>
		<div>
			<span class="text-lrg">{history.stats.right + history.stats.wrong > 0 ? Math.round(history.stats.right * 100 / (history.stats.right + history.stats.wrong)) : 0}%</span>
			<br/>Correct flags
		</div>
		<div>
			<span class="text-lrg">{history.stats.streak}</span>
			<br/>Current streak
			<br/><span class="text-sml">(flags in a row)</span>
		</div>
		<div>
			<span class="text-lrg">{history.stats.max}</span>
			<br/>Max streak
		</div>
	</div>
	<hr/>
	<h3>Correct flags distribution</h3>
	<div class="bar-container">
		{#each [...history.stats.dist].reverse() as val, i}
		<div class="bar-group">
			<div class="bar-count">{10 - i}</div>
			<div class="bar">
				<div style:width="{100 * val / Math.max(...history.stats.dist)}%" class:highlight={game.mode == 'daily' && game.turn == turns && 10 - i == game.score}>{val}</div>
			</div>
		</div>
		{/each}
	</div>
	<hr/>
	{#if history.daily.game && history.daily.game.turn == turns}
	<h3>Next daily game</h3>
	<span class="text-lrg">
		{String(Math.floor((countdown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0')} :
		{String(Math.floor((countdown % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0')} :
		{String(Math.floor((countdown % (1000 * 60)) / 1000)).padStart(2, '0')}
	</span>
	<hr/>
	{/if}
	{#if game.turn == turns}
	<button on:click={() => setStatus('start')}>Return to menu</button>
	{:else}
	<button on:click={() => prevStatus()}>Go back</button>
	{/if}
	{:else if game.status == "info"}
	<h2>How to play</h2>
	<p>Just guess the names of ten countries from their flags (eg. 🇵🇸 = Palestine)... And it's multi-choice so you've got a fair chance even if you're not a geography nerd.</p>
<h2>Credits</h2>
<p>This game was invented by Yazan and Kinan, and coded by <a href="https://twitter.com/bothness" target="_blank">their dad</a>. Inspired by the Wordle-verse.</p>
	<p>You can find the <a href="https://github.com/bothness/guesswhichflag" target="_blank">source code here</a>.</p>
	<button on:click={() => prevStatus()}>Go back</button>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
	header {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		flex-wrap: nowrap;
		padding: 0 16px;
		border-bottom: 1px solid grey;
	}
	h1 {
		margin: 0 0 5px 0;
	}
	h2 {
		margin: 0;
	}
	h3 {
		margin: 0;
	}
	p {
		margin: 5px 0 15px 0;
	}
	button {
		display: block;
		width: 100;
		cursor: pointer;
	}
	header button {
		background: none;
		border: none;
		width: 30px;
		margin: 0;
		padding: 0;
	}
	hr {
		width: 100%;
    border: none;
		background-color: darkgrey;
    height: 1px;
}
	.container {
		display: flex;
		flex-direction: column;
		height: auto;
		width: 450px;
		max-width: calc(100% - 40px);
		margin: 20px auto;
		text-align: center;
	}
	.progress {
		width: 100%;
		height: 4px;
		background-color: lightgrey;
		position: relative;
	}
	.bar-container {
		width: 100%;
		margin: 10px 0 5px 0;
	}
	.bar-group {
		width: 100%;
		height: 20px;
		display: flex;
		align-items: center;
		margin-bottom: 4px;
		position: relative;
	}
	.bar {
		width: calc(100% - 24px);
		height: 100%;
		position: relative;
	}
	.bar-count {
		box-sizing: border-box;
		width: 20px;
		text-align: right;
		padding-right: 4px;
	}
	.progress > div, .bar > div {
		top: 0;
		height: 100%;
		background-color: grey;
		position: absolute;
	}
	.progress > div + div {
		border-left: 2px solid lightgrey;
	}
	.bar > div {
		min-width: 18px;
		padding-right: 3px;
		color: white;
		text-align: right;
		font-weight: bold;
	}
	.highlight {
		background-color: rgb(106,170,100) !important;
	}
	.menu {
		font-size: 1.5rem;
	}
	.flag {
		margin: -40px 0 -25px 0;
	}
	.flag-container {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		grid-gap: 12px;
		width: 100%;
		margin: 20px 0;
	}
	.flag-mini {
		display: inline;
		margin: -6px 0;
	}
	.num-container {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		grid-gap: 6px;
		width: 100%;
		margin: 5px 0
	}
	.text-lrg {
		font-size: 2.2em;
		font-weight: bold;
	}
	.text-sml {
		font-size: 0.85em;
		color: #777;
	}
</style>