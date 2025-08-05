const { Events } = require('discord.js')
const { getVoiceConnection } = require('@discordjs/voice')

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`)

		for (const [guildId, guild] of client.guilds.cache) {
			const botMember = guild.members.me

			if (botMember?.voice?.channel) {
				try {
					const connection = getVoiceConnection(guildId)
					if (connection) {
						connection.destroy()
						console.log(` Destroyed voice connection in ${guild.name}`)
					} else {
						await botMember.voice.disconnect()
						console.log(`Disconnected bot from voice in ${guild.name}`)
					}
				} catch (err) {
					console.error(`Error disconnecting from voice in ${guild.name}:`, err)
				}
			}
		}
	},
}
