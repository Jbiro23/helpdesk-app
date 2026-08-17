const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
	const authHeader = req.headers["authorization"];

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ message: "No token provided" });
	}

	const token = authHeader.split(" ")[1];

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded;
		next();
	} catch (error) {
		return res.status(401).json({ message: "Invalid or expired token" });
	}
}

function requireAgent(req, res, next) {
	if (req.user.role !== "agent") {
		return res.status(403).json({ message: "Agent access required" });
	}
	next();
}

module.exports = { authenticate, requireAgent };
