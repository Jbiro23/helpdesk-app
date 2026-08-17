const express = require("express");
const db = require("../config/db");
const { authenticate, requireAgent } = require("../middleware/auth");

const router = express.Router();

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

		res.status(201).json({
			message: "Ticket created successfully",
			ticketId: result.insertId,
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

module.exports = router;
