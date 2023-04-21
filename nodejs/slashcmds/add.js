const { SlashCommandBuilder } = require('discord.js');
const { dbQueue, limiter } = require('../exports.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("add")
		.setDescription("New entry.")
		.addNumberOption(option => option
			.setName("angle")
			.setDescription("Angle.")
			.setMinValue(5)
			.setMaxValue(50)
			.setRequired(true)
		),
	async execute(interaction, emitter) {
		const authorID = interaction.user.id, authorCount = limiter[authorID] ?? 0, totalCount = limiter.totalCount;
		if (
			authorCount > 4 || // 5+
			totalCount > 15 && authorCount > 3 || // 4 z 15
			totalCount > 20 && authorCount > 2 || // 3 z 20
			totalCount > 25 && authorCount > 1    // 2 z 25
		) return await interaction.reply(`Sorry, but it seems you\'ve hit your current limit of requests. Try again later!\n*you have ${authorCount} requests in queue*`);
		const angle = interaction.options.getNumber('angle')

		/* {
			author: interaction.user.id,
			angle: interaction.options.getString('angle'),
			channelID: interaction.channelId,
			id: interaction.id,
			status: "queued" (in queue) || "pending" (waiting for response) || "done" (finished, waiting to be sent) || "completed" (sent to user)
		} */

		const obj = {
			author: authorID,
			angle: angle,
			channelID: interaction.channelId,
			id: interaction.id,
			status: "queued"
		}
		dbQueue.insert(obj, async (err) => {
			if (err) return interaction.reply("Error happened while adding your request into queue:\n" + err)
			if (!limiter[authorID]) limiter[authorID] = 0;
			limiter[authorID]++
			limiter.totalCount++
			await interaction.reply('Alright! You\'ve been placed into a queue. Your position in queue: ' + limiter.totalCount);
		})
		emitter.emit('start');
	},
};
