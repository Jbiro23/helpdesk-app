requireAuth();

const user = getUser();
document.getElementById("user-name").textContent =
	user.first_name + " " + user.last_name;
document.getElementById("logout-btn").addEventListener("click", logout);

const alertBox = document.getElementById("alert");

function showAlert(message, type) {
	alertBox.textContent = message;
	alertBox.className = "alert alert-" + type;
}

document.getElementById("submit-btn").addEventListener("click", async () => {
	const title = document.getElementById("title").value.trim();
	const description = document.getElementById("description").value.trim();

	if (!title || !description) {
		showAlert("Naslov i opis su obavezni.", "warning");
		return;
	}

	try {
		const data = await apiRequest("/tickets", "POST", { title, description });
		window.location.href = "ticket.html?id=" + data.ticketId;
	} catch (error) {
		showAlert(error.message, "danger");
	}
});
