const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	entersState,
	VoiceConnectionStatus,
	AudioPlayerStatus,
} = require('@discordjs/voice')
const playdl = require('play-dl')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('currentdebate')
		.setDescription('Checks the SejmRP live stream and plays the audio in the voice channel.'),

	async execute(interaction) {
		const user = interaction.member
		const voiceChannel = user.voice?.channel

		if (!voiceChannel) {
			return interaction.reply({
				content: '❌ Musisz być na kanale głosowym!',
				flags: MessageFlags.Ephemeral,
			})
		}

		await interaction.deferReply()

		try {
			const searchResults = await playdl.search('channel:@SejmRP_PL', { source: { youtube: 'video' } })

			const liveVideo = searchResults.find(video => video.live)

			if (!liveVideo) {
				return interaction.editReply('🔴 Obecnie brak transmisji na żywo na kanale SejmRP.')
			}

			const liveUrl = liveVideo.url

			const stream = await playdl.stream(liveUrl, { quality: 1 })
			const resource = createAudioResource(stream.stream, {
				inputType: stream.type,
			})

			console.log('Stream type:', stream.type)
			console.log('Stream URL:', liveUrl)

			const connection = joinVoiceChannel({
				channelId: voiceChannel.id,
				guildId: voiceChannel.guild.id,
				adapterCreator: voiceChannel.guild.voiceAdapterCreator,
			})

			connection.on('stateChange', (oldState, newState) => {
				console.log(`Connection state changed: ${oldState.status} -> ${newState.status}`)
			})

			await entersState(connection, VoiceConnectionStatus.Ready, 10_000)
			const player = createAudioPlayer()
			player.play(resource)
			connection.subscribe(player)

			player.on('error', error => {
				console.error('Player error:', error)
				interaction.editReply('❌ Wystąpił błąd podczas odtwarzania dźwięku.')
				connection.destroy()
			})

			player.on(AudioPlayerStatus.Idle, async () => {
				console.log('Player is idle, restarting stream...')

				try {
					const newStream = await playdl.stream(liveUrl)
					const newResource = createAudioResource(newStream.stream, {
						inputType: newStream.type,
					})
					player.play(newResource)
				} catch (err) {
					console.error('Error while restarting stream:', err)
					connection.destroy()
				}
			})

			await interaction.editReply(`✅ Trwa transmisja live: ${liveUrl}`)
		} catch (err) {
			console.error('Error occurred:', err)
			await interaction.editReply('❌ Wystąpił błąd podczas próby odtwarzania transmisji.')
		}
	},
}
