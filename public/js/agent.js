requireAuth();

const currentUser = getUser();

if (currentUser.role !== "agent") {
	window.location.href = "tickets.html";
}

document.getElementById("user-name").textContent =
	currentUser.first_name + " " + currentUser.last_name;
document.getElementById("logout-btn").addEventListener("click", logout);

const alertBox = document.getElementById("alert");
let allTickets = [];
let currentFilter = "all";

const statusLabels = {
	otvorena: "Otvorena",
	u_obradi: "U obradi",
	zatvorena: "Zatvorena",
};
const statusClasses = {
	otvorena: "bg-success",
	u_obradi: "bg-warning text-dark",
	zatvorena: "bg-secondary",
};
const priorityLabels = {
	nizak: "Nizak",
	srednji: "Srednji",
	visok: "Visok",
	kriticni: "Kritični",
};

function formatDate(dateString) {
	const date = new Date(dateString);
	return (
		date.toLocaleDateString("hr-HR") +
		" " +
		date.toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" })
	);
}

function renderTickets() {
	const table = document.getElementById("tickets-table");
	const emptyState = document.getElementById("empty-state");
	const tbody = document.getElementById("tickets-body");

	const filtered =
		currentFilter === "all"
			? allTickets
			: allTickets.filter((t) => t.status === currentFilter);

	if (filtered.length === 0) {
		emptyState.classList.remove("d-none");
		table.classList.add("d-none");
		return;
	}

	emptyState.classList.add("d-none");
	table.classList.remove("d-none");
	tbody.innerHTML = "";

	filtered.forEach((ticket) => {
		const row = document.createElement("tr");
		row.style.cursor = "pointer";
		row.addEventListener("click", () => {
			window.location.href = "ticket.html?id=" + ticket.id;
		});

		const statusBadge = `<span class="badge ${statusClasses[ticket.status]}">${statusLabels[ticket.status]}</span>`;

		row.innerHTML = `
            <td>${ticket.id}</td>
            <td>${ticket.title}</td>
            <td>${ticket.author_first_name} ${ticket.author_last_name}</td>
            <td>${ticket.category || "-"}</td>
            <td>${priorityLabels[ticket.priority]}</td>
            <td>${statusBadge}</td>
            <td>${formatDate(ticket.created_at)}</td>
        `;

		tbody.appendChild(row);
	});
}

document.querySelectorAll("#status-filter button").forEach((button) => {
	button.addEventListener("click", () => {
		document
			.querySelectorAll("#status-filter button")
			.forEach((b) => b.classList.remove("active"));
		button.classList.add("active");
		currentFilter = button.dataset.status;
		renderTickets();
	});
});

async function loadTickets() {
	try {
		allTickets = await apiRequest("/tickets");
		renderTickets();
	} catch (error) {
		alertBox.textContent = error.message;
		alertBox.className = "alert alert-danger";
	}
}

loadTickets();
