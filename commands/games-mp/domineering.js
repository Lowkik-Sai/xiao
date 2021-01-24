const Command = require('../../structures/Command');
const { stripIndents } = require('common-tags');
const { verify } = require('../../util/Util');
const blankEmoji = '⬜';
const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const turnRegex = /^(\d+), ?(\d+)/i;

module.exports = class DomineeringCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'domineering',
			aliases: ['domineer', 'cross-cram', 'stop-gate'],
			group: 'games-mp',
			memberName: 'domineering',
			description: 'Play a game of Domineering with another user.',
			guildOnly: true,
			args: [
				{
					key: 'opponent',
					prompt: 'What user would you like to challenge?',
					type: 'user'
				},
				{
					key: 'size',
					prompt: 'What board size do you want to use?',
					type: 'integer',
					min: 3,
					max: 10,
					default: 5
				}
			]
		});
	}

	async run(msg, { opponent, size }) {
		if (opponent.bot) return msg.reply('Bots may not be played against.');
		if (opponent.id === msg.author.id) return msg.reply('You may not play against yourself.');
		const current = this.client.games.get(msg.channel.id);
		if (current) return msg.reply(`Please wait until the current game of \`${current.name}\` is finished.`);
		this.client.games.set(msg.channel.id, { name: this.name });
		try {
			await msg.say(`${opponent}, do you accept this challenge?`);
			const verification = await verify(msg.channel, opponent);
			if (!verification) {
				this.client.games.delete(msg.channel.id);
				return msg.say('Looks like they declined...');
			}
			const board = this.generateBoard(size);
			let userTurn = true;
			let winner = null;
			let lastTurnTimeout = false;
			const userEmoji = '🟥';
			const oppoEmoji = '🟦';
			while (!winner) {
				const user = userTurn ? msg.author : opponent;
				await msg.say(stripIndents`
					${user}, at what coordinates do you want to place your block (ex. 1,1)? Type \`end\` to forefeit.
					Your pieces are **${userTurn ? 'vertical' : 'horizontal'}**.

					${this.displayBoard(board, userEmoji, oppoEmoji)}
				`);
				const possibleMoves = this.possibleMoves(board, userTurn);
				const filter = res => {
					if (res.author.id !== user.id) return false;
					const pick = res.content;
					if (pick.toLowerCase() === 'end') return true;
					const coordPicked = pick.match(turnRegex);
					if (!coordPicked) return false;
					const x = Number.parseInt(coordPicked[2], 10);
					const y = Number.parseInt(coordPicked[3], 10);
					if (x > size || y > size || x < 1 || y < 1) return false;
					if (!possibleMoves.includes(`${x - 1},${y - 1}`)) return false;
					return true;
				};
				const turn = await msg.channel.awaitMessages(filter, {
					max: 1,
					time: 60000
				});
				if (!turn.size) {
					await msg.say('Sorry, time is up!');
					if (lastTurnTimeout) {
						winner = 'time';
						break;
					} else {
						lastTurnTimeout = true;
						userTurn = !userTurn;
						continue;
					}
				}
				const choice = turn.first().content;
				if (choice.toLowerCase() === 'end') {
					winner = userTurn ? opponent : msg.author;
					break;
				}
				const matched = choice.match(turnRegex);
				const x = Number.parseInt(matched[1], 10);
				const y = Number.parseInt(matched[2], 10);
				board[y - 1][x - 1] = userTurn ? 'U' : 'O';
				board[userTurn ? y : y - 1][userTurn ? x - 1 : x] = userTurn ? 'U' : 'O';
				userTurn = !userTurn;
				if (lastTurnTimeout) lastTurnTimeout = false;
				const oppoPossible = this.possibleMoves(board, userTurn);
				if (!oppoPossible.length) {
					winner = userTurn ? opponent : msg.author;
					break;
				}
			}
			this.client.games.delete(msg.channel.id);
			if (winner === 'time') return msg.say('Game ended due to inactivity.');
			return msg.say(`Congrats, ${winner}! Your opponent has no possible moves left!`);
		} catch (err) {
			this.client.games.delete(msg.channel.id);
			throw err;
		}
	}

	possibleMoves(board, userTurn) {
		const possibleMoves = [];
		for (let i = 0; i < board.length; i++) {
			for (let j = 0; j < board[i].length; j++) {
				if (board[i][j]) continue;
				if (!board[i + 1] || !board[i][j + 1]) continue;
				if (board[userTurn ? i + 1 : i][userTurn ? j : j + 1]) continue;
				possibleMoves.push(`${i},${j}`);
			}
		}
		return possibleMoves;
	}

	generateBoard(size) {
		const arr = [];
		for (let i = 0; i < size; i++) {
			const row = [];
			for (let j = 0; j < size; j++) row.push(null);
			arr.push(row);
		}
		return arr;
	}

	displayBoard(board, userColor, oppoColor) {
		let str = '';
		str += '⬛';
		str += nums.slice(0, board.length).join('');
		str += '\n';
		for (let i = 0; i < board.length; i++) {
			str += nums[i];
			board[i].forEach((item, j) => {
				if (item === 'U') str += userColor;
				else if (item === 'O') str += oppoColor;
				else str += blankEmoji;
			});
			str += '\n';
		}
		return str;
	}
};
