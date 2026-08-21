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

	const searchQuery = ticket.title + "\n" + ticket.description;
	const relevantArticles = await findRelevantArticles(searchQuery, 3);

	let knowledgeContext = "";
	if (relevantArticles.length > 0) {
		knowledgeContext = relevantArticles
			.map((a, i) => `Članak ${i + 1} (${a.title}):\n${a.content}`)
			.join("\n\n");
	}

	const prompt = `Ti si agent korisničke podrške. Na temelju ulaznice, dosadašnje komunikacije i relevantnih članaka iz baze znanja sastavi prijedlog profesionalnog i ljubaznog odgovora korisniku na hrvatskom jeziku.

Naslov ulaznice: ${ticket.title}
Opis problema: ${ticket.description}

Dosadašnja komunikacija:
${conversation || "Još nema poruka."}

Relevantni članci iz baze znanja:
${knowledgeContext || "Nema relevantnih članaka."}

Sastavi odgovor korisniku temeljen na informacijama iz baze znanja gdje je to primjenjivo. Vrati samo tekst odgovora, bez potpisa i bez dodatnih objašnjenja.`;

	const completion = await openai.chat.completions.create({
		model: "gpt-4o-mini",
		messages: [{ role: "user", content: prompt }],
	});

	return completion.choices[0].message.content.trim();
}

async function generateEmbedding(text) {
	const response = await openai.embeddings.create({
		model: "text-embedding-3-small",
		input: text,
	});
	return response.data[0].embedding;
}

function cosineSimilarity(vecA, vecB) {
	let dotProduct = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < vecA.length; i++) {
		dotProduct += vecA[i] * vecB[i];
		normA += vecA[i] * vecA[i];
		normB += vecB[i] * vecB[i];
	}
	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function findRelevantArticles(queryText, limit = 3) {
	const [articles] = await db.query(
		"SELECT id, title, content, embedding FROM knowledge_base WHERE embedding IS NOT NULL",
	);

	if (articles.length === 0) {
		return [];
	}

	const queryEmbedding = await generateEmbedding(queryText);

	const scored = articles.map((article) => {
		const articleEmbedding =
			typeof article.embedding === "string"
				? JSON.parse(article.embedding)
				: article.embedding;
		const similarity = cosineSimilarity(queryEmbedding, articleEmbedding);
		return { title: article.title, content: article.content, similarity };
	});

	scored.sort((a, b) => b.similarity - a.similarity);

	return scored.slice(0, limit);
}

module.exports = {
	classifyTicket,
	generateReplyDraft,
	generateEmbedding,
	findRelevantArticles,
};
