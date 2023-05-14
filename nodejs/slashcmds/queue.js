const { SlashCommandBuilder } = require('discord.js');
const { dbQueue } = require('../exports.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("queue")
		.setDescription("Shows queue."),
	async execute(interaction, emitter) {
		const authorID = interaction.user.id;
		if (authorID !== "303108947261259776" && authorID !== "1027333555556196397") return await interaction.reply("You are not permitted to do this action.");
		await interaction.deferReply()
		dbQueue.find({}, async function (err, docs) {
			if (err) return console.log(err);
			if (docs.length < 1) return await interaction.followUp("Queue is empty.");

			const response = ["**Queue:**"];
			var c = 1
			for (i of docs) {
				const request = await `${c}. <@${i.author}> angle: ${i.angle}`
				c++;
				response.push(request);
			}
			return await interaction.followUp({ content: response.join("\n") })
		})
	},
};
