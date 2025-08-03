const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js')
const SEJM_API_URL = 'https://api.sejm.gov.pl/sejm/term10/clubs'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('coalition')
		.setDescription('Select clubs and check if they have a majority (231 seats)'),

	async execute(interaction) {
		try {
			const res = await fetch(SEJM_API_URL)
			const clubs = await res.json()

			// ogranicz do max 25 klubów
			const options = clubs.slice(0, 25).map(club => ({
				label: club.id,
				description: club.name.length > 100 ? club.name.slice(0, 96) + '...' : club.name,
				value: club.id,
			}))

			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId('coalition_select')
				.setPlaceholder('Select clubs to form a coalition')
				.setMinValues(1)
				.setMaxValues(options.length)
				.addOptions(options)

			const row = new ActionRowBuilder().addComponents(selectMenu)

			await interaction.reply({
				content: '🗳 Select clubs to check for majority:',
				components: [row],
				ephemeral: true,
			})
		} catch (error) {
			console.error('❌ Coalition error:', error)
			await interaction.reply({
				content: '❌ Failed to load club data from Sejm API.',
				ephemeral: true,
			})
		}
	},
}
