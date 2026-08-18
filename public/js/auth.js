const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const loginView = document.getElementById("login-view");
const registerView = document.getElementById("register-view");
const alertBox = document.getElementById("alert");

function showAlert(message, type) {
	alertBox.textContent = message;
	alertBox.className = "alert alert-" + type;
}

function hideAlert() {
	alertBox.className = "alert d-none";
}

loginTab.addEventListener("click", () => {
	loginTab.classList.add("active");
	registerTab.classList.remove("active");
	loginView.classList.remove("d-none");
	registerView.classList.add("d-none");
	hideAlert();
});

registerTab.addEventListener("click", () => {
	registerTab.classList.add("active");
	loginTab.classList.remove("active");
	registerView.classList.remove("d-none");
	loginView.classList.add("d-none");
	hideAlert();
});

function redirectByRole(user) {
	if (user.role === "agent") {
		window.location.href = "agent.html";
	} else {
		window.location.href = "tickets.html";
	}
}

document.getElementById("login-btn").addEventListener("click", async () => {
	const email = document.getElementById("login-email").value;
	const password = document.getElementById("login-password").value;

	if (!email || !password) {
		showAlert("Unesite email i lozinku.", "warning");
		return;
	}

	try {
		const data = await apiRequest("/auth/login", "POST", { email, password });
		saveAuth(data.token, data.user);
		redirectByRole(data.user);
	} catch (error) {
		showAlert(error.message, "danger");
	}
});

document.getElementById("register-btn").addEventListener("click", async () => {
	const first_name = document.getElementById("reg-first-name").value;
	const last_name = document.getElementById("reg-last-name").value;
	const email = document.getElementById("reg-email").value;
	const password = document.getElementById("reg-password").value;

	if (!first_name || !last_name || !email || !password) {
		showAlert("Popunite sva polja.", "warning");
		return;
	}

	try {
		await apiRequest("/auth/register", "POST", {
			email,
			password,
			first_name,
			last_name,
		});
		showAlert("Registracija uspješna. Sada se možete prijaviti.", "success");
		registerView
			.querySelectorAll("input")
			.forEach((input) => (input.value = ""));
	} catch (error) {
		showAlert(error.message, "danger");
	}
});

document.getElementById("login-password").addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault();
		document.getElementById("login-btn").click();
	}
});

document.getElementById("reg-password").addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault();
		document.getElementById("register-btn").click();
	}
});
