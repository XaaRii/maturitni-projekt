const { SlashCommandBuilder } = require('discord.js');
const { dbQueue } = require('../exports.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("queue")
		.setDescription("Shows queue."),
	async execute(interaction, emitter) {
		const authorID = interaction.user.id;
		if (authorID !== "303108947261259776" && authorID !== "1027333555556196397") return await interaction.reply("You are not permitted to do this action.");

		dbQueue.find({}, async function (err, docs) {
			if (err) return console.log(err);
			if (docs.length < 1) return await interaction.reply("Queue is empty.");

			const response = ["**Queue:**"];
			const queueList = async () => {
				for (i of docs) {
					const e = docs[i];
					const request = await `${i + 1}. <@${e.author}> angle: ${e.angle}`
					response.push(request);
				}
				return await interaction.followUp({ content: response.join("\n") })
			};
		})
	},
};
