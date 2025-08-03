const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const partyColors = require('../../data/partyColours.json')

const SEJM_API_URL = 'https://api.sejm.gov.pl/sejm/term10/MP'

function normalize(str) {
	return str
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/ł/g, 'l')
}

function findMatches(input, candidates) {
	const inputNorm = normalize(input)

	const exact = candidates.find(mp => {
		const full = normalize(`${mp.firstName} ${mp.lastName}`)
		const reverse = normalize(`${mp.lastName} ${mp.firstName}`)
		return full === inputNorm || reverse === inputNorm
	})

	if (exact) return [exact]

	const inputParts = inputNorm.split(' ')
	return candidates.filter(mp => {
		const full = normalize(`${mp.firstName} ${mp.lastName}`)
		const reverse = normalize(`${mp.lastName} ${mp.firstName}`)
		return (
			full.includes(inputNorm) ||
			reverse.includes(inputNorm) ||
			inputParts.every(part => normalize(mp.firstName).includes(part) || normalize(mp.lastName).includes(part))
		)
	})
}

async function getAttendance(id) {
	try {
		const res = await fetch(`https://api.sejm.gov.pl/sejm/term10/MP/${id}/votings/stats`)
		const data = await res.json()

		const totalVotings = data.reduce((sum, item) => sum + item.numVotings, 0)
		const totalMissed = data.reduce((sum, item) => sum + item.numMissed, 0)
		if (totalVotings == 0) {
			return 'Brak głosowań'
		}
		const attendance = ((totalVotings - totalMissed) / totalVotings) * 100
		return `${attendance.toFixed(2)}%`
	} catch (err) {
		console.error('Błąd:', err)
		return 'Błąd'
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mp')
		.setDescription('Get information about a Polish MP')
		.addStringOption(option =>
			option
				.setName('name')
				.setDescription('Full name or last name of the MP (e.g. Kowalski or Jan Kowalski)')
				.setRequired(true)
		),

	async execute(interaction) {
		const nameInput = interaction.options.getString('name')
		await interaction.deferReply()

		try {
			const response = await fetch(SEJM_API_URL)
			const allMPs = await response.json()

			const matches = findMatches(nameInput, allMPs)

			if (matches.length === 0) {
				await interaction.editReply(`❌ Nie znaleziono posła dla: ${nameInput}`)
				return
			}

			if (matches.length === 1) {
				const found = matches[0]
				const profileLink = `https://www.sejm.gov.pl/Sejm10.nsf/posel.xsp?id=${found.id}`
				const profileImage = `https://api.sejm.gov.pl/sejm/term10/MP/${found.id}/photo`

				// Pobieramy frekwencję
				const attendance = await getAttendance(found.id)

				const embed = new EmbedBuilder()
					.setTitle(`${found.firstName}${found.secondName ? ' ' + found.secondName : ''} ${found.lastName}`)
					.setURL(found.active ? profileLink : null)
					.addFields(
						{ name: '📅 Data urodzenia', value: found.birthDate || 'Brak danych', inline: true },
						{ name: '📌 Miejsce urodzenia', value: found.birthLocation || 'Brak danych', inline: true },
						{ name: '🎓 Wykształcenie', value: found.educationLevel || 'Brak danych', inline: true },
						{ name: '💼 Zawód', value: found.profession || 'Brak danych', inline: true },
						{ name: '📨 Email', value: found.email || 'Brak danych', inline: true },
						{ name: '📊 Liczba głosów', value: found.numberOfVotes?.toString() || 'Brak danych', inline: true },
						{ name: '📈 Frekwencja', value: attendance, inline: true },
						{ name: '🧭 Klub', value: found.club || 'Brak danych', inline: true },
						{ name: '🗺️ Województwo', value: found.voivodeship || 'Brak danych', inline: true },
						{
							name: '📍 Okręg',
							value: `${found.districtName || 'Brak danych'} (nr ${found.districtNum?.toString() || 'Brak'})`,
							inline: true,
						},
						{ name: '✅ Aktywny', value: found.active ? 'Tak' : 'Nie', inline: true }
					)
					.setThumbnail(profileImage)
				const color = found.active === false ? partyColors['Nieaktywny'] : partyColors[found.club] || '#0099ff'

				embed.setColor(color)

				await interaction.editReply({ embeds: [embed] })
				return
			}

			const embed = new EmbedBuilder()
				.setTitle('Znaleziono kilku posłów:')
				.setDescription(
					matches
						.map(mp => {
							const fullName = `${mp.firstName} ${mp.lastName}`
							const profileLink = `https://www.sejm.gov.pl/Sejm10.nsf/posel.xsp?id=${mp.id}`
							const active = mp.active
							return active
								? `• [${fullName}](${profileLink}) — ${mp.club || 'Brak klubu'}`
								: `• ${fullName} — ${mp.club || 'Brak klubu'} (nieaktywny)`
						})
						.join('\n')
				)
				.setColor(0x007acc)

			await interaction.editReply({ embeds: [embed] })
		} catch (error) {
			console.error(error)
			await interaction.editReply('❌ Wystąpił błąd przy pobieraniu danych.')
		}
	},
}
