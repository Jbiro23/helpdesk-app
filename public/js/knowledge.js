requireAuth();

const currentUser = getUser();

if (currentUser.role !== "agent") {
	window.location.href = "tickets.html";
}

document.getElementById("user-name").textContent =
	currentUser.first_name + " " + currentUser.last_name;
document.getElementById("logout-btn").addEventListener("click", logout);

enableAutoGrow(document.getElementById("kb-content"));

const alertBox = document.getElementById("alert");

function showAlert(message, type) {
	alertBox.textContent = message;
	alertBox.className = "alert alert-" + type;
}

function formatDate(dateString) {
	const date = new Date(dateString);
	return date.toLocaleDateString("hr-HR");
}

async function loadCategories() {
	try {
		const categories = await apiRequest("/tickets/meta/categories");
		const select = document.getElementById("kb-category");
		select.innerHTML = '<option value="">Bez kategorije</option>';
		categories.forEach((cat) => {
			const option = document.createElement("option");
			option.value = cat.id;
			option.textContent = cat.name;
			select.appendChild(option);
		});
	} catch (error) {
		showAlert(error.message, "danger");
	}
}

async function loadArticles() {
	try {
		const articles = await apiRequest("/knowledge");
		const list = document.getElementById("kb-list");
		const empty = document.getElementById("kb-empty");

		if (articles.length === 0) {
			empty.classList.remove("d-none");
			list.innerHTML = "";
			return;
		}

		empty.classList.add("d-none");
		list.innerHTML = "";

		articles.forEach((article) => {
			const card = document.createElement("div");
			card.className = "card mb-2";
			card.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <h6 class="mb-1">${article.title}</h6>
                        <button type="button" class="btn btn-outline-danger btn-sm" data-id="${article.id}">Obriši</button>
                    </div>
                    <div class="small text-muted mb-2">
                        ${article.category ? article.category + " · " : ""}${formatDate(article.created_at)}
                    </div>
                    <div class="small">${article.content}</div>
                </div>
            `;

			card.querySelector("button").addEventListener("click", async () => {
				if (!confirm("Obrisati ovaj članak?")) {
					return;
				}
				try {
					await apiRequest("/knowledge/" + article.id, "DELETE");
					showAlert("Članak je obrisan.", "success");
					await loadArticles();
				} catch (error) {
					showAlert(error.message, "danger");
				}
			});

			list.appendChild(card);
		});
	} catch (error) {
		showAlert(error.message, "danger");
	}
}

document.getElementById("kb-save-btn").addEventListener("click", async () => {
	const title = document.getElementById("kb-title").value.trim();
	const content = document.getElementById("kb-content").value.trim();
	const category_id = document.getElementById("kb-category").value || null;

	if (!title || !content) {
		showAlert("Naslov i sadržaj su obavezni.", "warning");
		return;
	}

	const btn = document.getElementById("kb-save-btn");
	btn.disabled = true;
	btn.textContent = "Spremam...";

	try {
		await apiRequest("/knowledge", "POST", { title, content, category_id });
		showAlert("Članak je spremljen.", "success");
		document.getElementById("kb-title").value = "";
		document.getElementById("kb-content").value = "";
		document.getElementById("kb-category").value = "";
		await loadArticles();
	} catch (error) {
		showAlert(error.message, "danger");
	} finally {
		btn.disabled = false;
		btn.textContent = "Spremi članak";
	}
});

loadCategories();
loadArticles();
