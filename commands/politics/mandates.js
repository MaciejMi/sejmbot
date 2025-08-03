const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js')
const partyColors = require('../../data/partyColours.json')

const SEJM_API_URL = 'https://api.sejm.gov.pl/sejm/term10/clubs'

function getColorForParty(party) {
	return partyColors[party] || '#888888'
}

function buildChartURL(partyCounts) {
	const sorted = Object.entries(partyCounts).sort((a, b) => b[1] - a[1])
	const labels = sorted.map(([party]) => party)
	const values = sorted.map(([_, count]) => count)
	const colors = sorted.map(([party]) => getColorForParty(party))

	const chartConfig = {
		type: 'bar',
		data: {
			labels,
			datasets: [
				{
					label: 'Mandaty',
					data: values,
					backgroundColor: colors,
				},
			],
		},
		options: {
			indexAxis: 'y',
			layout: {
				padding: { top: 30, bottom: 20, left: 20, right: 30 },
			},
			plugins: {
				legend: { display: false },
				title: {
					display: true,
					text: '📊 Podział mandatów w Sejmie (wg partii)',
					font: { size: 20, weight: 'bold' },
					color: '#000',
					padding: { top: 10, bottom: 30 },
					align: 'center',
				},
				datalabels: {
					anchor: 'end',
					align: 'end',
					formatter: value => `${value}`,
					color: '#000',
					font: { size: 14, weight: 'bold' },
					clip: false,
				},
			},
			scales: {
				x: {
					beginAtZero: true,
					ticks: {
						stepSize: 10,
						color: '#333',
						font: { size: 12 },
					},
					grid: { color: '#eee' },
				},
				y: {
					ticks: {
						color: '#333',
						font: { size: 14, weight: 'bold' },
					},
				},
			},
		},
		plugins: ['chartjs-plugin-datalabels'],
	}

	const encoded = encodeURIComponent(JSON.stringify(chartConfig))
	return `https://quickchart.io/chart?c=${encoded}&format=png&width=900&height=600&backgroundColor=white`
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mandates')
		.setDescription('Displays the number and a chart of active MPs by party.'),

	async execute(interaction) {
		await interaction.deferReply()

		try {
			const response = await fetch(SEJM_API_URL)
			const clubs = await response.json()

			const partyCounts = {}
			let totalActive = 0

			for (const club of clubs) {
				const name = club.id || club.name || 'Nieznany'
				const count = club.membersCount || 0
				partyCounts[name] = count
				totalActive += count
			}

			const ABSOLUTE_MAJORITY = 231
			let absoluteMajorityParty = null

			for (const [party, count] of Object.entries(partyCounts)) {
				if (count >= ABSOLUTE_MAJORITY) {
					absoluteMajorityParty = party
					break
				}
			}

			const chartURL = buildChartURL(partyCounts)
			const chartAttachment = new AttachmentBuilder(chartURL, { name: 'mandates.png' })

			const embed = new EmbedBuilder()
				.setTitle('📊 Podział mandatów w Sejmie')
				.setColor(0x2d8bcf)
				.setDescription(
					[
						`• Łączna liczba członków klubów: **${totalActive}**`,
						`• Większość: **${ABSOLUTE_MAJORITY}** mandatów`,
						absoluteMajorityParty
							? `✅ **${absoluteMajorityParty}** ma samodzielną większość.`
							: '❌ Żaden klub nie ma samodzielnej większości.',
					].join('\n')
				)
				.setFooter({ text: 'Dane z API Sejmu RP / quickchart.io' })

			await interaction.editReply({
				embeds: [embed],
				files: [chartAttachment],
			})
		} catch (err) {
			console.error('Błąd przy /mandates:', err)
			await interaction.editReply('❌ Wystąpił błąd przy pobieraniu danych lub generowaniu wykresu.')
		}
	},
}
