const { SlashCommandBuilder } = require('discord.js')

module.exports = {
	data: new SlashCommandBuilder().setName('randompolitician').setDescription('Send random politician from Sejm API.'),

	async execute(interaction) {
		await interaction.deferReply()

		try {
			const response = await fetch('https://api.sejm.gov.pl/sejm/term10/MP')
			const data = await response.json()

			if (!Array.isArray(data) || data.length === 0) {
				return interaction.editReply('Nie udało się pobrać danych z API.')
			}

			const randomPolitician = data[Math.floor(Math.random() * data.length)]

			const id = randomPolitician.id
			const firstName = randomPolitician.firstName || 'Brak imienia'
			const lastName = randomPolitician.lastName || 'Brak nazwiska'
			const club = randomPolitician.club || 'Brak klubu'

			const profileLink = `https://www.sejm.gov.pl/Sejm10.nsf/posel.xsp?id=${id}`

			await interaction.editReply(
				`🎲 Random Polish politician:\n**${firstName} ${lastName}**\nClub: ${club}\n[Zobacz profil](${profileLink})`
			)
		} catch (error) {
			console.error(error)
			await interaction.editReply('Error related with entering data')
		}
	},
}
