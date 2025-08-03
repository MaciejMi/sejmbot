const id = 400

fetch(`https://api.sejm.gov.pl/sejm/term10/MP/${id}/votings/stats`)
	.then(res => res.json())
	.then(data => {
		const totalVotings = data.reduce((sum, item) => sum + item.numVotings, 0)
		const totalMissed = data.reduce((sum, item) => sum + item.numMissed, 0)
		const attendance = ((totalVotings - totalMissed) / totalVotings) * 100
		console.log(`Frekwencja: ${attendance.toFixed(2)}%`)
	})
	.catch(err => console.error('Błąd:', err))
