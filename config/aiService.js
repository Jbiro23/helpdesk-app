const openai = require("./openai");
const db = require("./db");

async function classifyTicket(title, description) {
	const [categories] = await db.query("SELECT id, name FROM categories");
	const categoryList = categories.map((c) => `${c.id}: ${c.name}`).join("\n");

	const prompt = `Analiziraj sljedeću ulaznicu korisničke podrške i odredi najprikladniju kategoriju i prioritet.

Dostupne kategorije (id: naziv):
${categoryList}

Dostupni prioriteti: nizak, srednji, visok, kriticni

Naslov: ${title}
Opis: ${description}

Odgovori isključivo u JSON formatu bez dodatnog teksta, prema obrascu:
{"category_id": broj, "priority": "vrijednost"}`;

	const completion = await openai.chat.completions.create({
		model: "gpt-4o-mini",
		messages: [{ role: "user", content: prompt }],
		response_format: { type: "json_object" },
	});

	const result = JSON.parse(completion.choices[0].message.content);

	const validCategory = categories.find((c) => c.id === result.category_id);
	const validPriorities = ["nizak", "srednji", "visok", "kriticni"];

	return {
		category_id: validCategory ? result.category_id : null,
		priority: validPriorities.includes(result.priority)
			? result.priority
			: "srednji",
	};
}

async function generateReplyDraft(ticket, messages) {
	const conversation = messages
		.map((m) => `${m.role === "agent" ? "Agent" : "Korisnik"}: ${m.content}`)
		.join("\n");

	const prompt = `Ti si agent korisničke podrške. Na temelju ulaznice i dosadašnje komunikacije sastavi prijedlog profesionalnog i ljubaznog odgovora korisniku na hrvatskom jeziku.

Naslov ulaznice: ${ticket.title}
Opis problema: ${ticket.description}

Dosadašnja komunikacija:
${conversation || "Još nema poruka."}

Sastavi samo tekst odgovora korisniku, bez pozdrava tipa potpisa agenta i bez dodatnih objašnjenja.`;

	const completion = await openai.chat.completions.create({
		model: "gpt-4o-mini",
		messages: [{ role: "user", content: prompt }],
	});

	return completion.choices[0].message.content.trim();
}

module.exports = { classifyTicket, generateReplyDraft };
