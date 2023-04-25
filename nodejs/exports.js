const { Client, GatewayIntentBits, Partials } = require('discord.js');
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.DirectMessages,
	],
	partials: [
		// Partials.Message,
		Partials.Channel,
		// Partials.Reaction
	],
	allowedMentions: {
		parse: [ 'users', 'roles' ],
		repliedUser: true,
	},
}),
	config = require('./.cfg.json'),
	Datastore = require('nedb'),
	dbQueue = new Datastore({ filename: './queue.db', autoload: true }),
	mqtt = require('mqtt'),
	mosquitto = mqtt.connect({
		host: config.mqttServer,
		username: config.mqttUsername, 
		password: config.mqttPassword,
		port: config.mqttPort,
		protocol: config.mqttProtocol ?? "mqtt",
		clean: true,
		connectTimeout: 5000,
		clientId: `bot-manager`,
	});

var limiter = {
	totalCount: 0
}

dbQueue.find({}, function (err, docs) {
	for (let i = 0; i < docs.length; i++) {
		const e = docs[i];
		if (e.status !== "completed") {
			if (!limiter[e.author]) limiter[e.author] = 0;
			limiter[e.author]++;
			limiter.totalCount++;
		}
	}
	console.log(limiter);
});

/* 
{
	author: interaction.user.id,
	angle: interaction.options.getString('angle'),
	channel: interaction.channel,
	channelID: interaction.channelId,
	status: "queued" (in queue) || "pending" (waiting for response) || "done" (finished, waiting to be sent) || "completed" (sent to user)
}
*/


exports.client = client;
exports.dbQueue = dbQueue;
exports.mosquitto = mosquitto;
exports.limiter = limiter;
