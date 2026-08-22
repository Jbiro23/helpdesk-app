const express = require("express");
const db = require("../config/db");
const { authenticate, requireAgent } = require("../middleware/auth");
const { classifyTicket, generateReplyDraft } = require("../config/aiService");

const router = express.Router();

async function canAccessTicket(ticketId, user) {
	const [tickets] = await db.query("SELECT user_id FROM tickets WHERE id = ?", [
		ticketId,
	]);
	if (tickets.length === 0) {
		return { allowed: false, notFound: true };
	}
	const ticket = tickets[0];
	if (user.role !== "agent" && ticket.user_id !== user.id) {
		return { allowed: false, notFound: false };
	}
	return { allowed: true };
}

router.post("/", authenticate, async (req, res) => {
	const { title, description } = req.body;

	if (!title || !description) {
		return res
			.status(400)
			.json({ message: "Title and description are required" });
	}

	try {
		const [result] = await db.query(
			"INSERT INTO tickets (user_id, title, description) VALUES (?, ?, ?)",
			[req.user.id, title, description],
		);

		const ticketId = result.insertId;

		try {
			const suggestion = await classifyTicket(title, description);
			await db.query(
				"UPDATE tickets SET category_id = ?, priority = ? WHERE id = ?",
				[suggestion.category_id, suggestion.priority, ticketId],
			);
		} catch (aiError) {
			console.error("AI classification failed:", aiError.message);
		}

		res.status(201).json({
			message: "Ticket created successfully",
			ticketId: ticketId,
		});
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.get("/", authenticate, async (req, res) => {
	try {
		let query;
		let params;

		if (req.user.role === "agent") {
			query = `
                SELECT t.id, t.title, t.status, t.priority, t.created_at,
                       c.name AS category,
                       u.first_name AS author_first_name, u.last_name AS author_last_name
                FROM tickets t
                LEFT JOIN categories c ON t.category_id = c.id
                JOIN users u ON t.user_id = u.id
                ORDER BY t.created_at DESC
            `;
			params = [];
		} else {
			query = `
                SELECT t.id, t.title, t.status, t.priority, t.created_at,
                       c.name AS category
                FROM tickets t
                LEFT JOIN categories c ON t.category_id = c.id
                WHERE t.user_id = ?
                ORDER BY t.created_at DESC
            `;
			params = [req.user.id];
		}

		const [tickets] = await db.query(query, params);
		res.json(tickets);
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.get("/:id", authenticate, async (req, res) => {
	try {
		const [tickets] = await db.query(
			`SELECT t.*, c.name AS category,
                    u.first_name AS author_first_name, u.last_name AS author_last_name
             FROM tickets t
             LEFT JOIN categories c ON t.category_id = c.id
             JOIN users u ON t.user_id = u.id
             WHERE t.id = ?`,
			[req.params.id],
		);

		if (tickets.length === 0) {
			return res.status(404).json({ message: "Ticket not found" });
		}

		const ticket = tickets[0];

		if (req.user.role !== "agent" && ticket.user_id !== req.user.id) {
			return res.status(403).json({ message: "Access denied" });
		}

		res.json(ticket);
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.put("/:id/assign", authenticate, requireAgent, async (req, res) => {
	try {
		const [tickets] = await db.query("SELECT id FROM tickets WHERE id = ?", [
			req.params.id,
		]);
		if (tickets.length === 0) {
			return res.status(404).json({ message: "Ticket not found" });
		}

		await db.query(
			"UPDATE tickets SET agent_id = ?, status = 'u_obradi' WHERE id = ?",
			[req.user.id, req.params.id],
		);

		res.json({ message: "Ticket assigned successfully" });
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.put("/:id/status", authenticate, requireAgent, async (req, res) => {
	const { status } = req.body;
	const allowedStatuses = ["otvorena", "u_obradi", "zatvorena"];

	if (!status || !allowedStatuses.includes(status)) {
		return res.status(400).json({ message: "Invalid status value" });
	}

	try {
		const [result] = await db.query(
			"UPDATE tickets SET status = ? WHERE id = ?",
			[status, req.params.id],
		);

		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "Ticket not found" });
		}

		res.json({ message: "Status updated successfully" });
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.put("/:id", authenticate, requireAgent, async (req, res) => {
	const { category_id, priority } = req.body;
	const allowedPriorities = ["nizak", "srednji", "visok", "kriticni"];

	if (priority && !allowedPriorities.includes(priority)) {
		return res.status(400).json({ message: "Invalid priority value" });
	}

	try {
		const [result] = await db.query(
			"UPDATE tickets SET category_id = ?, priority = ? WHERE id = ?",
			[category_id || null, priority || "srednji", req.params.id],
		);

		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "Ticket not found" });
		}

		res.json({ message: "Ticket updated successfully" });
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.get("/:id/messages", authenticate, async (req, res) => {
	try {
		const access = await canAccessTicket(req.params.id, req.user);
		if (access.notFound) {
			return res.status(404).json({ message: "Ticket not found" });
		}
		if (!access.allowed) {
			return res.status(403).json({ message: "Access denied" });
		}

		const [messages] = await db.query(
			`SELECT m.id, m.content, m.is_ai_draft, m.created_at, m.sender_id,
                    u.first_name, u.last_name, u.role
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.ticket_id = ? AND m.is_ai_draft = FALSE
             ORDER BY m.created_at ASC`,
			[req.params.id],
		);

		res.json(messages);
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.post("/:id/messages", authenticate, async (req, res) => {
	const { content } = req.body;

	if (!content || content.trim() === "") {
		return res.status(400).json({ message: "Message content is required" });
	}

	try {
		const access = await canAccessTicket(req.params.id, req.user);
		if (access.notFound) {
			return res.status(404).json({ message: "Ticket not found" });
		}
		if (!access.allowed) {
			return res.status(403).json({ message: "Access denied" });
		}

		const [result] = await db.query(
			"INSERT INTO messages (ticket_id, sender_id, content) VALUES (?, ?, ?)",
			[req.params.id, req.user.id, content],
		);

		res.status(201).json({
			message: "Message sent successfully",
			messageId: result.insertId,
		});
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.get("/meta/categories", authenticate, async (req, res) => {
	try {
		const [categories] = await db.query(
			"SELECT id, name FROM categories ORDER BY name",
		);
		res.json(categories);
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.post("/:id/ai-draft", authenticate, requireAgent, async (req, res) => {
	try {
		const [tickets] = await db.query("SELECT * FROM tickets WHERE id = ?", [
			req.params.id,
		]);
		if (tickets.length === 0) {
			return res.status(404).json({ message: "Ticket not found" });
		}

		const [messages] = await db.query(
			`SELECT m.content, u.role
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.ticket_id = ? AND m.is_ai_draft = FALSE
             ORDER BY m.created_at ASC`,
			[req.params.id],
		);

		const draft = await generateReplyDraft(tickets[0], messages);
		res.json({ draft });
	} catch (error) {
		res
			.status(500)
			.json({ message: "AI draft generation failed", details: error.message });
	}
});

router.get("/:id/notes", authenticate, requireAgent, async (req, res) => {
	try {
		const [notes] = await db.query(
			`SELECT n.id, n.content, n.created_at,
                    u.first_name, u.last_name
             FROM ticket_notes n
             JOIN users u ON n.agent_id = u.id
             WHERE n.ticket_id = ?
             ORDER BY n.created_at ASC`,
			[req.params.id],
		);
		res.json(notes);
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.post("/:id/notes", authenticate, requireAgent, async (req, res) => {
	const { content } = req.body;

	if (!content || content.trim() === "") {
		return res.status(400).json({ message: "Note content is required" });
	}

	try {
		const [result] = await db.query(
			"INSERT INTO ticket_notes (ticket_id, agent_id, content) VALUES (?, ?, ?)",
			[req.params.id, req.user.id, content],
		);
		res.status(201).json({
			message: "Note added successfully",
			noteId: result.insertId,
		});
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

module.exports = router;
