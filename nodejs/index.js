splash();
require('console-stamp')(console);
const { Collection, Events, AttachmentBuilder, REST, Routes } = require('discord.js'),
	{ client, mosquitto, dbQueue, limiter } = require('./exports.js'),
	fs = require("fs"),
	config = require('./.cfg.json'),
	prefix = config.prefix;

// Commands init
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

// Slash commands init
const slashcommands = [];
client.slashcmds = new Collection();
const slashcmdFiles = fs.readdirSync('./slashcmds').filter(file => file.endsWith('.js'));
for (const file of slashcmdFiles) {
	const command = require(`./slashcmds/${file}`);
	client.slashcmds.set(command.data.name, command);
	slashcommands.push(command);
}

const rest = new REST({ version: '10' }).setToken(config.dcToken);
const { exec } = require('child_process');
const { inspect } = require('util');

client.on(Events.ClientReady, async () => {
	console.info(`Logged in as ${client.user.tag}!`);
	client?.channels?.cache?.get('894203532092264458')?.send('ivt started!');
	client.user.setPresence({
		activities: [{
			name: "maturitní projekt",
			type: 1,
		}],
		status: "dnd",
	});
	setTimeout(() => {
		if (limiter.totalCount > 0) emitter.emit("start")
	}, 4000);
});

console.log("started connecting to mqtt...")
mosquitto.on('connect', () => {
	console.log("connected.")
	mosquitto.subscribe(config.mqttTopic, function (err) {
		if (err) {
			throw console.error(err)
		}
		console.log("subscribed to the topic")
		// mosquitto.publish('test', JSON.stringify(exampleJSON), {
		//   retain: false, // will show as a latest message
		// })
		// console.log("json sent")
	})
})

mosquitto.on('message', function (topic, message) {
	console.log("message in topic \"" + topic + "\": " + message.toString())
})

const { EventEmitter } = require('events');
const emitter = new EventEmitter();
let emitterRunning = false

emitter.on('start', () => {
	if (emitterRunning) return;
	emitterRunning = true;
	console.log('Mechanism started');
	dbQueue.find({}, function (err, docs) {
		if (err) return console.log(err);
		if (docs.length < 1) return emitterRunning = false;
		console.log(docs)
		return cleanup(docs)
	})
});

function cleanup(docs) {
	dbQueue.remove({ _id: docs[0]._id });
	emitterRunning = false;
	if (limiter.totalCount > 0) limiter.totalCount--
	if (limiter[docs[0].author] > 0) limiter[docs[0].author]--

	setTimeout(() => {
		// loop if needed
		if (docs.length < 2) return;
		return emitter.emit("start")
	}, 3000)
	
}

client.on(Events.MessageCreate, async message => {
	if (!message.content.toLowerCase().startsWith(prefix) || message.author.bot) return;
	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	switch (commandName) {
		case "rpicmd":
			var cmd = args.join(' ').toString();
			message.channel.sendTyping();
			if (!config.admins.includes(message.author.id)) return message.reply("Error 404: Your perms not found.");
			execcall(message.channel, cmd);
			break;
		case "refresh":
			message.channel.sendTyping();
			var commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
			for (const file of commandFiles) {
				const command = require(`./commands/${file}`);
				client.commands.set(command.name, command);
			}
			commandFiles = fs.readdirSync('./slashcmds').filter(file => file.endsWith('.js'));
			for (const file of commandFiles) {
				const command = require(`./slashcmds/${file}`);
				client.slashCollection.set(command.data.name, command);
			}
			message.reply("Command list reloaded.");
			break;
		case "crash": case "fs":
			if (!config.admins.includes(message.author.id)) message.channel.send("Error 404: Your perms not found.");
			const whoasked = message.author.username;
			if (commandName === "fs") { // fs
				message.channel.send('Full Reset...')
					.then(msg => {
						client.destroy();
						console.log(`Shutting down on request of ${whoasked}.`);
						process.exit();
					});
			} else { // crash
				message.channel.send('Oh shit a concrete wall-')
					.then(msg => {
						client.destroy();
						console.log(`Concrete wall built on request of ${whoasked}.`);
						const x = require("./keepAlive.js");
					});
			}
			break;
		case "eval":
			message.channel.sendTyping();
			if (!config.admins.includes(message.author.id)) return message.channel.send("Error 404: Your perms not found.");
			break;
		case "deploy":
			if (!config.admins.includes(message.author.id)) return message.channel.send("How about deploying yourself into a proper employment instead?");
			if (!["global", "local"].includes(args[0])) message.channel.send("Missing argument: local/global (overwrite)");
			message.channel.sendTyping();
			var resp = ['Registering commands in progress...\n'];
			var progressbar = args[1] !== "overwrite" ? await message.reply({ content: resp.join("") }) : undefined;
			if (args[0] === "local") {
				try {
					const slashCommands = [];
					client.slashCollection = new Collection();
					var i = 0;
					const slashFiles = fs.readdirSync('./slashcmds').filter(file => file.endsWith('.js'));
					for (const file of slashFiles) {
						const command = require(`./slashcmds/${file}`);
						client.slashCollection.set(command.data.name, command);
						if (args[1] === "overwrite") slashCommands.push(command.data);
						else {
							await rest.post(Routes.applicationCommands(config.dcAppID, message.guildId), { body: command.data.toJSON() });
							resp.push(command.data.name + " ");
							progressbar.edit(resp.join(""));
						}
						i++;
					}
					console.log(`deploy of ${i} slash commands globally on ${message.author.username}'s request.`);
					if (args[1] === "overwrite") await rest.put(Routes.applicationCommands(config.dcAppID, message.guildId), { body: slashCommands });
					if (!progressbar) message.reply(i + " slash commands deployed successfully on this server~");
					else {
						resp.push(`\n\n${i} slash commands deployed successfully on this server~`);
						progressbar.edit(resp.join(""));
					}
				} catch (error) {
					if (!progressbar) message.channel.send('Could not deploy commands!\n' + error);
					else progressbar.edit('Could not deploy commands!\n' + error);
					console.error(error);
				}
			} else if (args[0] === "global") {
				try {
					const slashPubCommands = [];
					client.slashCollection = new Collection();
					i = 0;
					const slashFiles = fs.readdirSync('./slashcmds').filter(file => file.endsWith('.js'));
					for (const file of slashFiles) {
						const command = require(`./slashcmds/${file}`);
						client.slashCollection.set(command.data.name, command);
						if (!command.developer) {
							if (args[1] === "overwrite") slashPubCommands.push(command.data);
							else {
								await rest.post(Routes.applicationCommands(config.dcAppID), { body: command.data.toJSON() });
								resp.push(command.data.name + " ");
								progressbar.edit(resp.join(""));
							}
							i++;
						}
					}
					console.log(`deploy of ${i} slash commands globally on ${message.author.username}'s request.`);
					if (args[1] === "overwrite") await rest.put(Routes.applicationCommands(config.dcAppID), { body: slashPubCommands });
					if (!progressbar) message.reply(i + " slash commands deployed successfully~\nChanges may take a bit longer to proceed tho...");
					else {
						resp.push(`\n\n${i} slash commands deployed successfully~\nChanges may take a bit longer to proceed tho...`);
						progressbar.edit(resp.join(""));
					}
				} catch (error) {
					if (!progressbar) message.channel.send('Could not deploy commands!\n' + error);
					else progressbar.edit('Could not deploy commands!\n' + error);
					console.error(error);
				}
			}
			break;
	}
	var command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
	if (!command) return;

	if (command.guildOnly && message.channel.isDMBased()) {
		const guildOnlyMessages = ["I'm not gonna respond to this, unless you ask me on a server", "Y'know this one's a server command, right?", "I can't help you here, let's go on server!", "I can't execute that command inside DMs!"];
		const randomGuildOnlyMessage = guildOnlyMessages[Math.floor(Math.random() * guildOnlyMessages.length)];
		return message.reply(randomGuildOnlyMessage);
	}
	// try catch for commands
	try { command.execute(message, args); }
	catch (error) {
		console.error(error);
		return message.channel.send(`Error happened in the main file.\nᴇʀʀᴏʀ: \`${error}\``);
	}
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.slashcmds.get(interaction.commandName);
	try {
		if (!command) return; // Not meant for us
		command.execute(interaction, emitter);
	} catch (error) {
		console.error(error);
		interaction.followUp({
			content: 'There was an error trying to execute that command:\n' + error,
		});
	}
});

process.on('unhandledRejection', (reason) => {
	console.log(reason);
	if (client.channels.cache.get('735207428299161602') !== undefined) client.channels.cache.get('735207428299161602').send(config.moduleName + ': `Unhandled promise rejection:`\n' + reason);
});

client.login(config.dcToken);

/* FUNCTIONS */
async function splash() {
	return console.log(`
	▄▄▄    ▀█▓      █▌  ▄█▀▒▒▄▄▄   ███▄   ▀█  ██▓▒▀█     █▀▒ ▒ █████ ██▀███   
   ▒████▄  ▓▄█▒    ▓█▌▄█▀▒▓▒████▄   ██▓▀█  █▌▒▓██▒▒▒▀█▄█▀▒░▒ ██▒  ██▒▓██ ▒ ██▒
  ▒██  ▀█▄ ▒█▀░    ▓███▄░▒▒██  ▀█▄ ▓██▒▒▀█ █▌▒▒██▒░░░▄█▀░░░ ▒██░  ██▒▓██ ░▄█ ▒
 ░██▄▄▄▄██ ▒█▄░    ▓█▌ █▄░██▄▄▄▄██ ▓██▒▒▒▐▌█▌░ ██░░▄█▀▀█▄▒  ▒██   ██░▒██▀▀█▄  
  ▓█   ▓██▒░█████▄▒▓█▌▒ █▄▓█   ▓██▒▄██░ ▒▄██▒░ ██▒▄█ ▒ ▒█▄▒  ████▓▒░░ ██▓ ▒██▒
  ▒▒   ▓▒█░░ ▒░░ ▓░▒▒▒▒ ▓▒▒▒   ▓▒█░░░▒░ ░▒▒▒▒░░▓  ▒▒ ▒ ░▒░▓░ ▒░▒░▒░ ░▓▒░ ░▒▓░ 
   ▒   ▒▒ ░░ ░  ▒ ░░ ░▒ ▒░ ▒   ▒▒ ░░ ░   ░ ▒░ ░▒ ░░░ ░  ░▒▒░ ░ ▒ ▒░ ▒▒░  ░ ▒░ 
   ░   ▒     ░  ░  ░ ░░ ░  ░   ▒   ░░      ░   ▒ ░ ░      ░  ░ ░ ▒  ░░     ░  
	   ░  ░       ░░  ░        ░  ░        ░   ░   ░    ░      ░ ░   ░        

					   Ishina Modules: Maturita Proj
`);
}

async function execcall(msgchannel, cmd) {
	const m = await msgchannel.send("Request sent.");
	exec(cmd, function (error, stdout, stderr) {
		if (!stdout) {
			m.edit("Done.");
		} else if (stdout.length >= 1950) {
			const atc = new AttachmentBuilder(Buffer.from(stdout), { name: 'rpicmd.txt' });
			m.edit({ content: "Done! Here are the results:", files: [atc] });
		} else m.edit({ content: "Done! Here are the results:\n" + stdout + stderr });
	});
}

async function evalcall(args, message) {
	let evaled;
	try {
		if (args[0] === "output") {
			evaled = await eval(args.slice(1).join(' '));
			if (evaled !== undefined) {
				if (inspect(evaled).length >= 1970) {
					const atc = new AttachmentBuilder(Buffer.from(inspect(evaled)), { name: 'eval.txt' });
					message.channel.send({ content: "Evaluation too long, so instead i'll send a file containing result.:", files: [atc] });
				} else message.channel.send(inspect(evaled));
				console.log(inspect(evaled));
			} else return message.channel.send("Evaluated.");
		} else {
			evaled = await eval(args.join(' '));
		}
	}
	catch (err) {
		console.error(err);
		message.reply(`There was an error during evaluation. ᴇʀʀᴏʀ: \`${err}\``);
	}
}