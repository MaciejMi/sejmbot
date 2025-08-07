const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} = require('discord.js')

const partyColours = require('../../data/partyColours.json')

const SEJM_API_URL = 'https://api.sejm.gov.pl/sejm/term10/MP'

async function getAttendance(id) {
	try {
		const res = await fetch(`https://api.sejm.gov.pl/sejm/term10/MP/${id}/votings/stats`)
		const data = await res.json()
		const totalVotings = data.reduce((sum, item) => sum + item.numVotings, 0)
		const totalMissed = data.reduce((sum, item) => sum + item.numMissed, 0)
		if (totalVotings === 0) return null
		const attendance = ((totalVotings - totalMissed) / totalVotings) * 100
		return attendance
	} catch {
		return null
	}
}

async function getAllAttendances(allMPs) {
	const results = await Promise.all(
		allMPs.map(async mp => {
			const frekwencja = await getAttendance(mp.id)
			return { ...mp, frekwencja }
		})
	)
	return results.filter(mp => typeof mp.frekwencja === 'number')
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('topmp')
		.setDescription(' Displays a ranking of MPs based on votes and activity.')
		.addStringOption(option =>
			option
				.setName('sort')
				.setDescription('Rodzaj sortowania')
				.setRequired(false)
				.addChoices({ name: 'Głosy', value: 'votes' }, { name: 'Frekwencja', value: 'activity' })
		)
		.addIntegerOption(option =>
			option.setName('page').setDescription('Numer strony startowej (1, 2, 3...)').setRequired(false)
		),

	execute: async interaction => {
		await interaction.deferReply()

		try {
			const sortType = interaction.options.getString('sort') || 'votes'
			const requestedPage = interaction.options.getInteger('page') || 1
			const response = await fetch(SEJM_API_URL)
			const allMPs = await response.json()

			let sorted

			if (sortType === 'activity') {
				const withAttendance = await getAllAttendances(allMPs)
				sorted = withAttendance.sort((a, b) => b.frekwencja - a.frekwencja)
			} else {
				sorted = [...allMPs]
					.filter(mp => typeof mp.numberOfVotes === 'number')
					.sort((a, b) => b.numberOfVotes - a.numberOfVotes)
			}

			let page = Math.max(requestedPage - 1, 0)
			const pageSize = 10
			const totalPages = Math.ceil(sorted.length / pageSize)

			const getPageContent = () => {
				const slice = sorted.slice(page * pageSize, (page + 1) * pageSize)
				const embeds = slice.map((mp, idx) => {
					let label

					if (sortType === 'activity') {
						label = `📈 Frekwencja: **${mp.frekwencja.toFixed(2)}%**`
					} else {
						label = `📊 Głosy: **${mp.numberOfVotes?.toLocaleString('pl-PL') || 'Brak'}**`
					}

					if (mp.active === false) {
						label += `\n🔴 **Status: Nieaktywny poseł – nie pełni mandatu**`
					}

					const party = mp.club || 'Brak'
					const photoUrl = `https://api.sejm.gov.pl/sejm/term10/MP/${mp.id}/photo-mini`
					const profileUrl = `https://www.sejm.gov.pl/Sejm10.nsf/posel.xsp?id=${mp.id}`

					const color = mp.active === false ? partyColours['Nieaktywny'] : partyColours[mp.club] || '#0099ff'
					return new EmbedBuilder()
						.setTitle(`${idx + 1 + page * pageSize}. ${mp.firstName} ${mp.lastName}`)
						.setURL(profileUrl)
						.setDescription(`🧭 Klub: **${party}**\n${label}`)
						.setThumbnail(photoUrl)
						.setColor(color)
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
						.setCustomId('page_display')
						.setLabel(`Strona ${page + 1} z ${totalPages}`)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(true), // NIEAKTYWNY
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
