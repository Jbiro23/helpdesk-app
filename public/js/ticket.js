requireAuth();

const currentUser = getUser();
document.getElementById("user-name").textContent =
	currentUser.first_name + " " + currentUser.last_name;
document.getElementById("logout-btn").addEventListener("click", logout);

const backLink = document.getElementById("back-link");
backLink.href = currentUser.role === "agent" ? "agent.html" : "tickets.html";

const params = new URLSearchParams(window.location.search);
const ticketId = params.get("id");

const alertBox = document.getElementById("alert");

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

function showAlert(message, type) {
	alertBox.textContent = message;
	alertBox.className = "alert alert-" + type;
}

function formatDate(dateString) {
	const date = new Date(dateString);
	return (
		date.toLocaleDateString("hr-HR") +
		" " +
		date.toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" })
	);
}

async function loadTicket() {
	try {
		const ticket = await apiRequest("/tickets/" + ticketId);

		document.getElementById("ticket-title").textContent = ticket.title;
		document.getElementById("ticket-description").textContent =
			ticket.description;
		document.getElementById("ticket-category").textContent =
			ticket.category || "-";
		document.getElementById("ticket-priority").textContent =
			priorityLabels[ticket.priority];

		const statusBadge = document.getElementById("ticket-status");
		statusBadge.textContent = statusLabels[ticket.status];
		statusBadge.className = "badge " + statusClasses[ticket.status];

		if (currentUser.role === "agent") {
			document.getElementById("ticket-author").textContent =
				ticket.author_first_name + " " + ticket.author_last_name;
		} else {
			document.getElementById("ticket-author-wrap").classList.add("d-none");
		}
	} catch (error) {
		showAlert(error.message, "danger");
	}
}

async function loadMessages() {
	try {
		const messages = await apiRequest("/tickets/" + ticketId + "/messages");
		const container = document.getElementById("messages");
		container.innerHTML = "";

		if (messages.length === 0) {
			container.innerHTML = '<p class="text-muted small">Još nema poruka.</p>';
			return;
		}

		messages.forEach((msg) => {
			const isMine = msg.sender_id === currentUser.id;
			const isAgent = msg.role === "agent";

			const wrapper = document.createElement("div");
			wrapper.className = "card mb-2 " + (isAgent ? "border-primary" : "");

			wrapper.innerHTML = `
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between">
                        <strong class="small">${msg.first_name} ${msg.last_name}${isAgent ? " (agent)" : ""}</strong>
                        <span class="small text-muted">${formatDate(msg.created_at)}</span>
                    </div>
                    <div>${msg.content}</div>
                </div>
            `;

			container.appendChild(wrapper);
		});
	} catch (error) {
		showAlert(error.message, "danger");
	}
}

document.getElementById("send-btn").addEventListener("click", async () => {
	const content = document.getElementById("message-content").value.trim();

	if (!content) {
		showAlert("Poruka ne može biti prazna.", "warning");
		return;
	}

	try {
		await apiRequest("/tickets/" + ticketId + "/messages", "POST", { content });
		document.getElementById("message-content").value = "";
		await loadMessages();
	} catch (error) {
		showAlert(error.message, "danger");
	}
});

loadTicket();
loadMessages();

async function setupAgentControls() {
	if (currentUser.role !== "agent") {
		return;
	}

	const controls = document.getElementById("agent-controls");
	controls.classList.remove("d-none");

	try {
		const categories = await apiRequest("/tickets/meta/categories");
		const categorySelect = document.getElementById("category-select");
		categorySelect.innerHTML = '<option value="">-</option>';
		categories.forEach((cat) => {
			const option = document.createElement("option");
			option.value = cat.id;
			option.textContent = cat.name;
			categorySelect.appendChild(option);
		});

		const ticket = await apiRequest("/tickets/" + ticketId);
		document.getElementById("status-select").value = ticket.status;
		document.getElementById("priority-select").value = ticket.priority;
		if (ticket.category_id) {
			categorySelect.value = ticket.category_id;
		}

		const assignInfo = document.getElementById("assigned-info");
		if (ticket.agent_id) {
			assignInfo.textContent =
				ticket.agent_id === currentUser.id
					? "Dodijeljena vama"
					: "Dodijeljena drugom agentu";
		} else {
			assignInfo.textContent = "Nije dodijeljena";
		}
	} catch (error) {
		showAlert(error.message, "danger");
	}
}

document.getElementById("assign-btn").addEventListener("click", async () => {
	try {
		await apiRequest("/tickets/" + ticketId + "/assign", "PUT");
		showAlert("Ulaznica je preuzeta.", "success");
		await loadTicket();
		await setupAgentControls();
	} catch (error) {
		showAlert(error.message, "danger");
	}
});

document
	.getElementById("save-changes-btn")
	.addEventListener("click", async () => {
		const status = document.getElementById("status-select").value;
		const category_id =
			document.getElementById("category-select").value || null;
		const priority = document.getElementById("priority-select").value;

		try {
			await apiRequest("/tickets/" + ticketId + "/status", "PUT", { status });
			await apiRequest("/tickets/" + ticketId, "PUT", {
				category_id,
				priority,
			});
			showAlert("Promjene su spremljene.", "success");
			await loadTicket();
		} catch (error) {
			showAlert(error.message, "danger");
		}
	});

setupAgentControls();

if (currentUser.role === "agent") {
	const aiDraftBtn = document.getElementById("ai-draft-btn");
	aiDraftBtn.classList.remove("d-none");

	aiDraftBtn.addEventListener("click", async () => {
		const originalText = aiDraftBtn.textContent;
		aiDraftBtn.disabled = true;
		aiDraftBtn.textContent = "Generiram...";

		try {
			const data = await apiRequest(
				"/tickets/" + ticketId + "/ai-draft",
				"POST",
			);
			document.getElementById("message-content").value = data.draft;
		} catch (error) {
			showAlert(error.message, "danger");
		} finally {
			aiDraftBtn.disabled = false;
			aiDraftBtn.textContent = originalText;
		}
	});
}

async function loadNotes() {
	if (currentUser.role !== "agent") {
		return;
	}

	try {
		const notes = await apiRequest("/tickets/" + ticketId + "/notes");
		const list = document.getElementById("notes-list");
		list.innerHTML = "";

		if (notes.length === 0) {
			list.innerHTML = '<p class="text-muted small mb-0">Nema bilješki.</p>';
			return;
		}

		notes.forEach((note) => {
			const div = document.createElement("div");
			div.className = "border-start border-secondary border-3 ps-2 mb-2";
			div.innerHTML = `
                <div class="small text-muted">${note.first_name} ${note.last_name} · ${formatDate(note.created_at)}</div>
                <div class="small">${note.content}</div>
            `;
			list.appendChild(div);
		});
	} catch (error) {
		showAlert(error.message, "danger");
	}
}

if (currentUser.role === "agent") {
	document.getElementById("notes-card").classList.remove("d-none");

	document
		.getElementById("add-note-btn")
		.addEventListener("click", async () => {
			const content = document.getElementById("note-content").value.trim();
			if (!content) {
				showAlert("Bilješka ne može biti prazna.", "warning");
				return;
			}
			try {
				await apiRequest("/tickets/" + ticketId + "/notes", "POST", {
					content,
				});
				document.getElementById("note-content").value = "";
				await loadNotes();
			} catch (error) {
				showAlert(error.message, "danger");
			}
		});

	loadNotes();
}
