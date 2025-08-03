// commands/politics/guessmp.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')

const SEJM_API_URL = 'https://api.sejm.gov.pl/sejm/term10/MP'

module.exports = {
	data: new SlashCommandBuilder()
		.setName('guessmp')
		.setDescription('Zgadnij, który to polityk na podstawie danych (bez zdjęcia, imienia, nazwiska i e-maila)'),

	async execute(interaction) {
		await interaction.deferReply()

		try {
			const response = await fetch(SEJM_API_URL)
			const allMPs = await response.json()

			let correct = allMPs[Math.floor(Math.random() * allMPs.length)]
			let sameParty = allMPs.filter(mp => mp.club === correct.club && mp.id !== correct.id)

			let shuffled
			if (sameParty.length >= 3) {
				shuffled = sameParty.sort(() => 0.5 - Math.random()).slice(0, 3)
			} else {
				const randomOthers = allMPs
					.filter(mp => mp.id !== correct.id)
					.sort(() => 0.5 - Math.random())
					.slice(0, 3)
				shuffled = randomOthers
			}

			const options = [...shuffled, correct].sort(() => 0.5 - Math.random())

			const embed = new EmbedBuilder()
				.setTitle('🤔 Zgadnij, który to poseł!')
				.setDescription('Na podstawie poniższych danych spróbuj zgadnąć, kim jest ten polityk.')
				.addFields(
					{ name: '📅 Data urodzenia', value: correct.birthDate || 'Brak danych', inline: true },
					{ name: '📌 Miejsce urodzenia', value: correct.birthLocation || 'Brak danych', inline: true },
					{ name: '🎓 Wykształcenie', value: correct.educationLevel || 'Brak danych', inline: true },
					{ name: '💼 Zawód', value: correct.profession || 'Brak danych', inline: true },
					{ name: '📊 Liczba głosów', value: correct.numberOfVotes?.toString() || 'Brak danych', inline: true },
					{ name: '🧭 Klub', value: correct.club || 'Brak danych', inline: true },
					{ name: '🗺️ Województwo', value: correct.voivodeship || 'Brak danych', inline: true },
					{
						name: '📍 Okręg',
						value: `${correct.districtName || 'Brak danych'} (nr ${correct.districtNum?.toString() || 'Brak'})`,
						inline: true,
					},
					{ name: '✅ Aktywny', value: correct.active ? 'Tak' : 'Nie', inline: true }
				)
				.setColor(0xffa500)

			const buttons = new ActionRowBuilder().addComponents(
				options.map(mp =>
					new ButtonBuilder()
						.setCustomId(mp.id.toString())
						.setLabel(`${mp.firstName} ${mp.lastName}`)
						.setStyle(ButtonStyle.Primary)
				)
			)

			const correctId = correct.id.toString()

			const filter = i => {
				i.deferUpdate()
				return i.user.id === interaction.user.id
			}

			await interaction.editReply({ embeds: [embed], components: [buttons] })

			const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000, max: 1 })

			collector.on('collect', async i => {
				const chosenId = i.customId
				const isCorrect = chosenId === correctId
				const chosenOption = options.find(mp => mp.id.toString() === chosenId)
				await interaction.followUp({
					content: isCorrect
						? `✅ Zgadza się! To był **${correct.firstName} ${correct.lastName}**.`
						: `❌ To nie był ten poseł.
🟥 Zaznaczyłeś: **${chosenOption.firstName} ${chosenOption.lastName}**
✅ Poprawna odpowiedź: **${correct.firstName} ${correct.lastName}**.`,
				})
			})

			collector.on('end', collected => {
				if (collected.size === 0) {
					interaction.followUp(`⌛ Czas minął! To był **${correct.firstName} ${correct.lastName}**.`)
				}
			})
		} catch (error) {
			console.error(error)
			await interaction.editReply('❌ Wystąpił błąd przy pobieraniu danych.')
		}
	},
}
