const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const today = new Date();
const dateOffset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
};

const seedStudents = [
    { id: 1, name: "Aarav Sharma", roll: "CS001", dept: "Computer Science", email: "aarav@example.com" },
    { id: 2, name: "Priya Patil", roll: "CS002", dept: "Computer Science", email: "priya@example.com" },
    { id: 3, name: "Rahul Verma", roll: "IT003", dept: "Information Technology", email: "rahul@example.com" },
    { id: 4, name: "Sneha Deshmukh", roll: "CS004", dept: "Computer Science", email: "sneha@example.com" }
];

const seedEvents = [
    { id: 101, title: "CodeFest 2026", category: "Technology", date: dateOffset(5), venue: "Computer Lab", description: "A coding competition for students.", icon: "⌘", cover: "", createdBy: "Admin" },
    { id: 102, title: "Creative Campus", category: "Cultural", date: dateOffset(9), venue: "College Auditorium", description: "Celebrate creativity, music and art.", icon: "✦", cover: "", createdBy: "Admin" },
    { id: 103, title: "Web Development Workshop", category: "Workshop", date: dateOffset(13), venue: "Seminar Hall", description: "Learn the foundations of modern web development.", icon: "◇", cover: "blue-cover", createdBy: "Admin" },
    { id: 104, title: "Campus Sports Day", category: "Sports", date: dateOffset(18), venue: "Sports Ground", description: "A day of games, teamwork and competition.", icon: "⚡", cover: "green-cover", createdBy: "Admin" }
];

function loadData(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (error) {
        console.warn("Could not load", key, error);
    }
    return fallback.map(item => ({ ...item }));
}

let students = loadData("ss_students", seedStudents);
let events = loadData("ss_events", seedEvents);
let registrations = loadData("ss_registrations", []);
let nextStudentId = Math.max(0, ...students.map(s => Number(s.id) || 0)) + 1;
let nextEventId = Math.max(100, ...events.map(e => Number(e.id) || 100)) + 1;
let nextRegistrationId = Math.max(0, ...registrations.map(r => Number(r.id) || 0)) + 1;
let currentModal = null;
let toastTimer;

function persist() {
    try {
        localStorage.setItem("ss_students", JSON.stringify(students));
        localStorage.setItem("ss_events", JSON.stringify(events));
        localStorage.setItem("ss_registrations", JSON.stringify(registrations));
        return true;
    } catch (error) {
        notify("Browser storage is unavailable or full.");
        return false;
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#39;"
    })[char]);
}

function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
}

function formatDate(value) {
    const date = new Date(value + "T12:00:00");
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function dateParts(value) {
    const date = new Date(value + "T12:00:00");
    return {
        day: Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("en-IN", { day: "2-digit" }),
        month: Number.isNaN(date.getTime()) ? "---" : date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()
    };
}

function notify(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function showPage(pageId) {
    const page = document.getElementById(pageId);
    if (!page) return;

    $$(".page").forEach(item => item.classList.remove("active-page"));
    page.classList.add("active-page");

    $$(".nav-item[data-page]").forEach(button => {
        button.classList.toggle("active", button.dataset.page === pageId);
    });

    const titles = {
        dashboard: "Dashboard Overview",
        events: "College Events",
        students: "Student Directory",
        registrations: "Event Registrations"
    };

    $("#pageTitle").textContent = titles[pageId] || "StudentSphere";
    $("#sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (pageId === "dashboard") renderDashboard();
    if (pageId === "events") renderEvents();
    if (pageId === "students") renderStudents();
    if (pageId === "registrations") renderRegistrations();
}

function renderDashboard() {
    $("#studentCount").textContent = students.length;
    $("#eventCount").textContent = events.length;
    $("#registrationCount").textContent = registrations.length;
    $("#departmentCount").textContent = new Set(students.map(s => s.dept)).size;

    const upcoming = events
        .filter(event => event.date >= dateOffset(0))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3);

    $("#dashboardEvents").innerHTML = upcoming.length
        ? upcoming.map(event => {
            const parts = dateParts(event.date);
            return `
                <div class="event-row">
                    <div class="event-date"><strong>${parts.day}</strong><span>${parts.month}</span></div>
                    <div class="event-info">
                        <strong>${escapeHTML(event.title)}</strong>
                        <small>${escapeHTML(event.venue)}</small>
                    </div>
                    <span class="category-tag">${escapeHTML(event.category)}</span>
                </div>`;
        }).join("")
        : '<div class="empty-state">No upcoming events. Create one to get started.</div>';
}

function renderEvents() {
    const query = ($("#eventSearch").value || "").trim().toLowerCase();
    const category = $("#eventFilter").value;

    const filtered = events
        .filter(event => {
            const matchesQuery = [event.title, event.description, event.venue, event.category]
                .some(value => String(value || "").toLowerCase().includes(query));
            return matchesQuery && (category === "All" || event.category === category);
        })
        .sort((a, b) => a.date.localeCompare(b.date));

    $("#allEvents").innerHTML = filtered.length
        ? filtered.map(event => `
            <article class="event-card">
                <div class="event-cover ${escapeHTML(event.cover || "")}">
                    ${escapeHTML(event.icon || "✦")}
                </div>
                <div class="event-card-body">
                    <span class="category-tag">${escapeHTML(event.category)}</span>
                    <h3>${escapeHTML(event.title)}</h3>
                    <p>${escapeHTML(event.description)}</p>
                    <div class="event-meta">
                        <span>◷ ${escapeHTML(formatDate(event.date))}</span>
                        <span>⌖ ${escapeHTML(event.venue)}</span>
                    </div>
                    <button class="primary-btn" data-register="${Number(event.id)}">
                        Register for Event ↗
                    </button>
                </div>
            </article>
        `).join("")
        : '<div class="empty-state">No matching events found.</div>';
}

function renderStudents() {
    const query = ($("#studentSearch").value || "").trim().toLowerCase();

    const filtered = students.filter(student =>
        [student.name, student.roll, student.email, student.dept]
            .some(value => String(value || "").toLowerCase().includes(query))
    );

    $("#studentTable").innerHTML = filtered.length
        ? filtered.map(student => `
            <tr>
                <td><div class="person-cell">
                    <span class="person-avatar">${escapeHTML(initials(student.name))}</span>
                    <span><strong>${escapeHTML(student.name)}</strong><small>Student</small></span>
                </div></td>
                <td>${escapeHTML(student.roll)}</td>
                <td>${escapeHTML(student.dept)}</td>
                <td>${escapeHTML(student.email)}</td>
                <td><button class="delete-btn" data-delete-student="${Number(student.id)}">Delete</button></td>
            </tr>
        `).join("")
        : '<tr><td colspan="5">No students found.</td></tr>';
}

function renderRegistrations() {
    $("#registrationTable").innerHTML = registrations.length
        ? [...registrations].reverse().map(registration => `
            <tr>
                <td><div class="person-cell">
                    <span class="person-avatar">${escapeHTML(initials(registration.studentName))}</span>
                    <span><strong>${escapeHTML(registration.studentName)}</strong><small>${escapeHTML(registration.studentEmail)}</small></span>
                </div></td>
                <td>${escapeHTML(registration.eventTitle)}</td>
                <td>${escapeHTML(formatDate(registration.date))}</td>
                <td><span class="status-badge">${escapeHTML(registration.status || "Registered")}</span></td>
                <td><button class="delete-btn" data-delete-registration="${Number(registration.id)}">Remove</button></td>
            </tr>
        `).join("")
        : '<tr><td colspan="5">No registrations yet. Register for an event to see it here.</td></tr>';
}

function openModal(type, eventId = null) {
    currentModal = { type, eventId };
    const fields = $("#formFields");
    const title = $("#modalTitle");

    if (type === "student") {
        title.textContent = "Add New Student";
        fields.innerHTML = `
            <div class="field full"><label for="studentName">Full Name</label><input id="studentName" name="name" required maxlength="80" placeholder="Enter student name"></div>
            <div class="field"><label for="studentRoll">Roll Number</label><input id="studentRoll" name="roll" required maxlength="25" placeholder="e.g. CS005"></div>
            <div class="field"><label for="studentDept">Department</label><select id="studentDept" name="dept" required>
                <option value="">Select department</option>
                <option>Computer Science</option><option>Information Technology</option><option>Commerce</option><option>Science</option><option>Arts</option>
            </select></div>
            <div class="field full"><label for="studentEmail">Email</label><input id="studentEmail" name="email" type="email" required maxlength="120" placeholder="student@example.com"></div>
        `;
    } else if (type === "event") {
        title.textContent = "Create College Event";
        fields.innerHTML = `
            <div class="field full"><label for="eventTitle">Event Name</label><input id="eventTitle" name="title" required maxlength="100" placeholder="Enter event title"></div>
            <div class="field"><label for="eventCategory">Category</label><select id="eventCategory" name="category" required>
                <option>Technology</option><option>Cultural</option><option>Workshop</option><option>Sports</option>
            </select></div>
            <div class="field"><label for="eventDate">Event Date</label><input id="eventDate" name="date" type="date" min="${dateOffset(0)}" required></div>
            <div class="field full"><label for="eventVenue">Venue</label><input id="eventVenue" name="venue" required maxlength="100" placeholder="e.g. Seminar Hall"></div>
            <div class="field full"><label for="eventDescription">Description</label><input id="eventDescription" name="description" required maxlength="220" placeholder="What is this event about?"></div>
        `;
    } else if (type === "register") {
        const event = events.find(item => item.id === eventId);
        if (!event) return notify("This event is no longer available.");

        title.textContent = "Register for Event";
        fields.innerHTML = `
            <div class="field full"><label>Selected Event</label><input value="${escapeHTML(event.title)}" disabled></div>
            <div class="field full"><label for="registerName">Student Name</label><input id="registerName" name="name" required maxlength="80" placeholder="Enter your full name"></div>
            <div class="field full"><label for="registerEmail">Student Email</label><input id="registerEmail" name="email" type="email" required maxlength="120" placeholder="Enter your email"></div>
            <div class="field full"><label for="registerRoll">Roll Number (optional)</label><input id="registerRoll" name="roll" maxlength="25" placeholder="Enter roll number"></div>
        `;
    }

    $("#modalForm").reset();
    $("#modalOverlay").classList.add("show");
    document.body.style.overflow = "hidden";
    setTimeout(() => fields.querySelector("input:not([disabled])")?.focus(), 50);
}

function closeModal() {
    $("#modalOverlay").classList.remove("show");
    document.body.style.overflow = "";
    currentModal = null;
}

$("#modalForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!currentModal) return;

    const data = Object.fromEntries(new FormData(event.currentTarget).entries());

    if (currentModal.type === "student") {
        if (students.some(s => s.roll.toLowerCase() === data.roll.trim().toLowerCase())) {
            return notify("That roll number already exists.");
        }
        if (students.some(s => s.email.toLowerCase() === data.email.trim().toLowerCase())) {
            return notify("That email is already registered.");
        }

        students.push({
            id: nextStudentId++,
            name: data.name.trim(),
            roll: data.roll.trim(),
            dept: data.dept,
            email: data.email.trim()
        });
        persist();
        closeModal();
        renderStudents();
        renderDashboard();
        notify("Student added successfully.");
    }

    if (currentModal.type === "event") {
        if (data.date < dateOffset(0)) return notify("Please choose a future date.");

        events.push({
            id: nextEventId++,
            title: data.title.trim(),
            category: data.category,
            date: data.date,
            venue: data.venue.trim(),
            description: data.description.trim(),
            icon: data.category === "Technology" ? "⌘" :
                  data.category === "Sports" ? "⚡" :
                  data.category === "Workshop" ? "◇" : "✦",
            cover: data.category === "Sports" ? "green-cover" :
                   data.category === "Workshop" ? "blue-cover" :
                   data.category === "Cultural" ? "orange-cover" : "",
            createdBy: "Admin"
        });

        persist();
        closeModal();
        renderEvents();
        renderDashboard();
        notify("Event created successfully.");
    }

    if (currentModal.type === "register") {
        const selectedEvent = events.find(e => e.id === currentModal.eventId);
        if (!selectedEvent) return notify("This event is no longer available.");

        const duplicate = registrations.some(r =>
            r.eventId === selectedEvent.id &&
            r.studentEmail.toLowerCase() === data.email.trim().toLowerCase()
        );

        if (duplicate) return notify("This email is already registered for this event.");

        registrations.push({
            id: nextRegistrationId++,
            eventId: selectedEvent.id,
            eventTitle: selectedEvent.title,
            studentName: data.name.trim(),
            studentEmail: data.email.trim(),
            roll: (data.roll || "").trim(),
            date: dateOffset(0),
            status: "Registered"
        });

        persist();
        closeModal();
        renderRegistrations();
        renderDashboard();
        notify("Registration completed successfully!");
    }
});

function deleteStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    if (!confirm(`Delete ${student.name}? Related event registrations will also be removed.`)) return;

    students = students.filter(s => s.id !== id);
    registrations = registrations.filter(r =>
        !(r.studentEmail.toLowerCase() === student.email.toLowerCase())
    );

    persist();
    renderStudents();
    renderRegistrations();
    renderDashboard();
    notify("Student record deleted.");
}

function deleteRegistration(id) {
    if (!confirm("Remove this event registration?")) return;
    registrations = registrations.filter(r => r.id !== id);
    persist();
    renderRegistrations();
    renderDashboard();
    notify("Registration removed.");
}

function exportCSV(filename, rows) {
    if (!rows.length) return notify("There is no data to export.");

    const csv = rows.map(row => row.map(value =>
        '"' + String(value ?? "").replace(/"/g, '""') + '"'
    ).join(",")).join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify("CSV file exported.");
}

$$(".nav-item[data-page]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.page));
});

document.addEventListener("click", event => {
    const goto = event.target.closest("[data-goto]");
    if (goto) showPage(goto.dataset.goto);

    const action = event.target.closest("[data-action]");
    if (action) {
        const type = action.dataset.action;
        if (type === "add-student") openModal("student");
        if (type === "add-event") openModal("event");
    }

    const registerButton = event.target.closest("[data-register]");
    if (registerButton) openModal("register", Number(registerButton.dataset.register));

    const deleteStudentButton = event.target.closest("[data-delete-student]");
    if (deleteStudentButton) deleteStudent(Number(deleteStudentButton.dataset.deleteStudent));

    const deleteRegistrationButton = event.target.closest("[data-delete-registration]");
    if (deleteRegistrationButton) deleteRegistration(Number(deleteRegistrationButton.dataset.deleteRegistration));
});

$("#eventSearch").addEventListener("input", renderEvents);
$("#eventFilter").addEventListener("change", renderEvents);
$("#studentSearch").addEventListener("input", renderStudents);

$("#menuToggle").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
});

$("#themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    try { localStorage.setItem("ss_dark", String(isDark)); } catch {}
    $("#themeToggle").textContent = isDark ? "☀ Switch to Light" : "◐ Change Theme";
});

try {
    if (localStorage.getItem("ss_dark") === "true") {
        document.body.classList.add("dark");
        $("#themeToggle").textContent = "☀ Switch to Light";
    }
} catch {}

$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);

$("#modalOverlay").addEventListener("click", event => {
    if (event.target === $("#modalOverlay")) closeModal();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
});

$("#exportStudents").addEventListener("click", () => {
    exportCSV("students.csv", [
        ["Name", "Roll Number", "Department", "Email"],
        ...students.map(s => [s.name, s.roll, s.dept, s.email])
    ]);
});

$("#exportRegistrations").addEventListener("click", () => {
    exportCSV("event-registrations.csv", [
        ["Student Name", "Email", "Roll Number", "Event", "Registration Date", "Status"],
        ...registrations.map(r => [
            r.studentName, r.studentEmail, r.roll, r.eventTitle, r.date, r.status
        ])
    ]);
});

renderDashboard();
renderEvents();
renderStudents();
renderRegistrations();
