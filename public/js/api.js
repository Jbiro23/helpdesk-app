const API_BASE = "/api";

function saveAuth(token, user) {
	localStorage.setItem("token", token);
	localStorage.setItem("user", JSON.stringify(user));
}

function getToken() {
	return localStorage.getItem("token");
}

function getUser() {
	const user = localStorage.getItem("user");
	return user ? JSON.parse(user) : null;
}

function logout() {
	localStorage.removeItem("token");
	localStorage.removeItem("user");
	window.location.href = "index.html";
}

function requireAuth() {
	if (!getToken()) {
		window.location.href = "index.html";
	}
}

async function apiRequest(path, method = "GET", body = null) {
	const headers = { "Content-Type": "application/json" };
	const token = getToken();
	if (token) {
		headers["Authorization"] = "Bearer " + token;
	}

	const options = { method, headers };
	if (body) {
		options.body = JSON.stringify(body);
	}

	const response = await fetch(API_BASE + path, options);

	const isAuthEndpoint = path.startsWith("/auth/");

	if (response.status === 401 && !isAuthEndpoint) {
		logout();
		return;
	}

	const data = await response.json();
	if (!response.ok) {
		throw new Error(data.message || "Request failed");
	}
	return data;
}
