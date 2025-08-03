const { EmbedBuilder } = require('discord.js')

const SEJM_API_URL = 'https://api.sejm.gov.pl/sejm/term10/clubs'
const ABSOLUTE_MAJORITY = 231
const PRESIDENT_VETO_OVERRIDE = 276
const CONSTITUTIONAL_MAJORITY = 307

module.exports = async interaction => {
	try {
		const selectedIDs = interaction.values

		// ✅ Wbudowany fetch (działa w Node 18+)
		const response = await fetch(SEJM_API_URL)
		if (!response.ok) throw new Error(`Błąd API Sejmu: ${response.status}`)

		const clubs = await response.json()
		const selectedClubs = clubs.filter(club => selectedIDs.includes(club.id))

		const totalSeats = selectedClubs.reduce((sum, club) => sum + club.membersCount, 0)

		const statusLines = [
			totalSeats >= ABSOLUTE_MAJORITY
				? '🟡 **Większość bezwzględna (231)**: ✅ TAK'
				: `🟡 **Większość bezwzględna (231)**: ❌ NIE — brakuje ${ABSOLUTE_MAJORITY - totalSeats}`,

			totalSeats >= PRESIDENT_VETO_OVERRIDE
				? '🔵 **Do odrzucenia weta prezydenta (276)**: ✅ TAK'
				: `🔵 **Do odrzucenia weta prezydenta (276)**: ❌ NIE — brakuje ${PRESIDENT_VETO_OVERRIDE - totalSeats}`,

			totalSeats >= CONSTITUTIONAL_MAJORITY
				? '🟢 **Większość konstytucyjna (307)**: ✅ TAK'
				: `🟢 **Większość konstytucyjna (307)**: ❌ NIE — brakuje ${CONSTITUTIONAL_MAJORITY - totalSeats}`,
		]

		const description =
			selectedClubs.map(club => `• **${club.id}** – ${club.membersCount} mandatów`).join('\n') +
			`\n\n🔢 Łącznie: **${totalSeats}** mandatów\n\n` +
			statusLines.join('\n')

		const embed = new EmbedBuilder()
			.setTitle('🧮 Sprawdzenie poziomów większości')
			.setDescription(description)
			.setColor(
				totalSeats >= CONSTITUTIONAL_MAJORITY
					? 0x1f8b4c
					: totalSeats >= PRESIDENT_VETO_OVERRIDE
					? 0x007bff
					: totalSeats >= ABSOLUTE_MAJORITY
					? 0xf0ad4e
					: 0xdc3545
			)
			.setFooter({ text: 'Źródło: API Sejmu RP' })

		await interaction.update({
			embeds: [embed],
			components: [],
		})
	} catch (error) {
		console.error('❌ Błąd w coalitionSelect:', error)
		await interaction.update({
			content: '❌ Wystąpił błąd podczas sprawdzania większości.',
			components: [],
		})
	}
}
