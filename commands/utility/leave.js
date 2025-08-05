const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const { getVoiceConnection } = require('@discordjs/voice')

module.exports = {
	data: new SlashCommandBuilder().setName('leave').setDescription('Disconnects the bot from the voice channel.'),

	async execute(interaction) {
		const guildId = interaction.guild.id
		const connection = getVoiceConnection(guildId)

		if (!connection) {
			return interaction.reply({
				content: '❌ Musisz być na kanale głosowym!',
				flags: MessageFlags.Ephemeral,
			})
		}

		connection.destroy()
		await interaction.reply('👋 Bot został rozłączony z kanału głosowego.')
	},
}
