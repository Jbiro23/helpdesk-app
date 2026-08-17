const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

router.post("/register", async (req, res) => {
	const { email, password, first_name, last_name } = req.body;

	if (!email || !password || !first_name || !last_name) {
		return res.status(400).json({ message: "All fields are required" });
	}

	try {
		const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [
			email,
		]);
		if (existing.length > 0) {
			return res.status(409).json({ message: "Email already registered" });
		}

		const passwordHash = await bcrypt.hash(password, 10);

		const [result] = await db.query(
			"INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)",
			[email, passwordHash, first_name, last_name],
		);

		res.status(201).json({
			message: "User registered successfully",
			userId: result.insertId,
		});
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

router.post("/login", async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: "Email and password are required" });
	}

	try {
		const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
			email,
		]);
		if (users.length === 0) {
			return res.status(401).json({ message: "Invalid email or password" });
		}

		const user = users[0];
		const passwordMatch = await bcrypt.compare(password, user.password_hash);
		if (!passwordMatch) {
			return res.status(401).json({ message: "Invalid email or password" });
		}

		const token = jwt.sign(
			{ id: user.id, role: user.role },
			process.env.JWT_SECRET,
			{ expiresIn: "8h" },
		);

		res.json({
			token,
			user: {
				id: user.id,
				email: user.email,
				first_name: user.first_name,
				last_name: user.last_name,
				role: user.role,
			},
		});
	} catch (error) {
		res.status(500).json({ message: "Server error", details: error.message });
	}
});

module.exports = router;
