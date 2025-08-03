const SEJM_API_URL = 'https://api.sejm.gov.pl/sejm/term10/MP'

async function getAttendance(id) {
	try {
		const res = await fetch(`https://api.sejm.gov.pl/sejm/term10/MP/${id}/votings/stats`)
		const data = await res.json()

		const totalVotings = data.reduce((sum, item) => sum + item.numVotings, 0)
		const totalMissed = data.reduce((sum, item) => sum + item.numMissed, 0)
		if (totalVotings === 0) {
			return 'Brak głosowań'
		}
		const attendance = ((totalVotings - totalMissed) / totalVotings) * 100
		return `${attendance.toFixed(2)}%`
	} catch (err) {
		console.error(`Błąd dla posła ${id}:`, err)
		return 'Błąd'
	}
}

async function getAllAttendances() {
	const allMPs = await fetch(SEJM_API_URL).then(res => res.json())

	const attendanceResults = await Promise.all(
		allMPs.map(async mp => {
			const frekwencja = await getAttendance(mp.id)
			return { id: mp.id, frekwencja }
		})
	)

	return attendanceResults
}

// Przykładowe użycie
getAllAttendances().then(data => console.log(data))
