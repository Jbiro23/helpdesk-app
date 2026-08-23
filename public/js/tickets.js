requireAuth();

const user = getUser();
document.getElementById("user-name").textContent =
	user.first_name + " " + user.last_name;
document.getElementById("logout-btn").addEventListener("click", logout);

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
const priorityClasses = {
	nizak: "bg-light text-dark border",
	srednji: "bg-info text-dark",
	visok: "bg-warning text-dark",
	kriticni: "bg-danger",
};

function formatDate(dateString) {
	const date = new Date(dateString);
	return (
		date.toLocaleDateString("hr-HR") +
		" " +
		date.toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" })
	);
}

function formatDateShort(dateString) {
	const date = new Date(dateString);
	const d = String(date.getDate()).padStart(2, "0");
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const y = date.getFullYear();
	const time = date.toLocaleTimeString("hr-HR", {
		hour: "2-digit",
		minute: "2-digit",
	});
	return `${d}.${m}.${y}. ${time}`;
}

async function loadTickets() {
	try {
		const tickets = await apiRequest("/tickets");

		const table = document.getElementById("tickets-table");
		const emptyState = document.getElementById("empty-state");
		const tbody = document.getElementById("tickets-body");

		if (tickets.length === 0) {
			emptyState.classList.remove("d-none");
			table.classList.add("d-none");
			return;
		}

		emptyState.classList.add("d-none");
		table.classList.remove("d-none");
		tbody.innerHTML = "";

		tickets.forEach((ticket) => {
			const row = document.createElement("tr");
			row.style.cursor = "pointer";
			row.addEventListener("click", () => {
				window.location.href = "ticket.html?id=" + ticket.id;
			});

			const statusBadge = `<span class="badge ${statusClasses[ticket.status]}">${statusLabels[ticket.status]}</span>`;

			row.innerHTML = `
                <td>${ticket.id}</td>
                <td>${ticket.title}</td>
                <td>${ticket.category || "-"}</td>
                <td><span class="badge ${priorityClasses[ticket.priority]}">${priorityLabels[ticket.priority]}</span></td>
                <td>${statusBadge}</td>
                <td class="text-nowrap">${formatDateShort(ticket.created_at)}</td>
            `;

			tbody.appendChild(row);
		});
	} catch (error) {
		const alertBox = document.getElementById("alert");
		alertBox.textContent = error.message;
		alertBox.className = "alert alert-danger";
	}
}

loadTickets();
