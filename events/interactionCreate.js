const { Events, MessageFlags } = require('discord.js')
const handleCoalitionSelect = require('./menus/coalitionSelect')

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName)

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`)
				return
			}

			try {
				await command.execute(interaction)
			} catch (error) {
				console.error(error)
				const replyOptions = {
					content: 'There was an error while executing this command!',
					flags: MessageFlags.Ephemeral,
				}
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp(replyOptions)
				} else {
					await interaction.reply(replyOptions)
				}
			}
		} else if (interaction.isStringSelectMenu()) {
			if (interaction.customId === 'coalition_select') {
				await handleCoalitionSelect(interaction)
			}
		}
	},
}
