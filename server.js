const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");
const authRoutes = require("./routes/auth");
const { authenticate } = require("./middleware/auth");
const ticketRoutes = require("./routes/tickets");
const knowledgeRoutes = require("./routes/knowledge");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/knowledge", knowledgeRoutes);

app.get("/api/me", authenticate, (req, res) => {
	res.json({ message: "You are authenticated", user: req.user });
});

app.get("/api/health", async (req, res) => {
	try {
		const [rows] = await db.query("SELECT COUNT(*) AS count FROM categories");
		res.json({
			status: "OK",
			message: "Server running and database connected",
			categoryCount: rows[0].count,
		});
	} catch (error) {
		res.status(500).json({
			status: "ERROR",
			message: "Database unavailable",
			details: error.message,
		});
	}
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
