const express = require("express");
const db = require("../config/db");
const { authenticate, requireAgent } = require("../middleware/auth");
const { generateEmbedding } = require("../config/aiService");

const router = express.Router();

router.get("/", authenticate, requireAgent, async (req, res) => {
	try {
		const [articles] = await db.query(
			`SELECT k.id, k.title, k.content, k.category_id, k.created_at,
                    c.name AS category
             FROM knowledge_base k
             LEFT JOIN categories c ON k.category_id = c.id
             ORDER BY k.created_at DESC`,
		);
		res.json(articles);
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.post("/", authenticate, requireAgent, async (req, res) => {
	const { title, content, category_id } = req.body;

	if (!title || !content) {
		return res.status(400).json({ message: "Title and content are required" });
	}

	try {
		let embedding = null;
		try {
			const vector = await generateEmbedding(title + "\n" + content);
			embedding = JSON.stringify(vector);
		} catch (aiError) {
			console.error("Embedding generation failed:", aiError.message);
		}

		const [result] = await db.query(
			"INSERT INTO knowledge_base (title, content, category_id, embedding) VALUES (?, ?, ?, ?)",
			[title, content, category_id || null, embedding],
		);

		res.status(201).json({
			message: "Article created successfully",
			articleId: result.insertId,
		});
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.delete("/:id", authenticate, requireAgent, async (req, res) => {
	try {
		const [result] = await db.query("DELETE FROM knowledge_base WHERE id = ?", [
			req.params.id,
		]);
		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "Article not found" });
		}
		res.json({ message: "Article deleted successfully" });
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

module.exports = router;
