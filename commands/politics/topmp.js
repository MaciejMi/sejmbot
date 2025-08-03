// commands/politics/topmp.js
const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} = require('discord.js')

const SEJM_API_URL = 'https://api.sejm.gov.pl/sejm/term10/MP'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('topmp')
		.setDescription('Wyświetla ranking posłów według liczby głosów')
		.addIntegerOption(option =>
			option.setName('page').setDescription('Numer strony startowej (1, 2, 3...)').setRequired(false)
		),

	execute: async interaction => {
		await interaction.deferReply()

		try {
			const requestedPage = interaction.options.getInteger('page') || 1
			const response = await fetch(SEJM_API_URL)
			const allMPs = await response.json()

			let sorted = [...allMPs]
			sorted = sorted
				.filter(mp => typeof mp.numberOfVotes === 'number')
				.sort((a, b) => b.numberOfVotes - a.numberOfVotes)

			let page = Math.max(requestedPage - 1, 0)
			const pageSize = 10
			const totalPages = Math.ceil(sorted.length / pageSize)

			const getPageContent = () => {
				const slice = sorted.slice(page * pageSize, (page + 1) * pageSize)
				const embeds = slice.map((mp, idx) => {
					const votes = mp.numberOfVotes?.toLocaleString('pl-PL') || 'Brak'
					const label = `📊 Głosy: **${votes}**`
					const party = mp.club || 'Brak'
					const photoUrl = `https://api.sejm.gov.pl/sejm/term10/MP/${mp.id}/photo-mini`
					const profileUrl = `https://www.sejm.gov.pl/Sejm10.nsf/posel.xsp?id=${mp.id}`

					return new EmbedBuilder()
						.setTitle(`${idx + 1 + page * pageSize}. ${mp.firstName} ${mp.lastName}`)
						.setURL(profileUrl)
						.setDescription(`🧭 Klub: **${party}**\n${label}`)
						.setThumbnail(photoUrl)
						.setColor(0x0099ff)
				})

				const rowTop = new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId('prev5')
						.setLabel('⬅️ -5 stron')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(page < 5),
					new ButtonBuilder()
						.setCustomId('prev')
						.setLabel('⬅️ -1 strona')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(page === 0),
					new ButtonBuilder()
						.setCustomId('next')
						.setLabel('➡️ +1 strona')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(page >= totalPages - 1),
					new ButtonBuilder()
						.setCustomId('next5')
						.setLabel('➡️ +5 stron')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(page >= totalPages - 5)
				)

				const rowBottom = new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId('first')
						.setLabel('⏪ Start')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(page === 0),
					new ButtonBuilder()
						.setCustomId('last')
						.setLabel('⏩ Koniec')
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(page >= totalPages - 1)
				)

				return { embeds, rows: [rowTop, rowBottom] }
			}

			let { embeds, rows } = getPageContent()
			const message = await interaction.editReply({ embeds, components: rows })

			const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 })

			collector.on('collect', async i => {
				if (i.user.id !== interaction.user.id)
					return await i.reply({ content: 'Nie możesz używać tego przycisku.', ephemeral: true })
				await i.deferUpdate()

				if (i.customId === 'first') page = 0
				else if (i.customId === 'last') page = totalPages - 1
				else if (i.customId === 'prev' && page > 0) page--
				else if (i.customId === 'next' && page < totalPages - 1) page++
				else if (i.customId === 'prev5' && page >= 5) page -= 5
				else if (i.customId === 'next5' && page <= totalPages - 6) page += 5

				const { embeds, rows } = getPageContent()
				await interaction.editReply({ embeds, components: rows })
			})

			collector.on('end', () => {
				rows.forEach(row => row.components.forEach(btn => btn.setDisabled(true)))
				interaction.editReply({ components: rows }).catch(() => {})
			})
		} catch (error) {
			console.error(error)
			await interaction.editReply('❌ Wystąpił błąd przy pobieraniu danych.')
		}
	},
}
