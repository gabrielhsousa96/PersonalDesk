// Global Page Transitions
document.addEventListener("DOMContentLoaded", () => {
    // Inject CSS for transitions
    const style = document.createElement('style');
    style.textContent = `
        body {
            animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            scroll-behavior: smooth;
            -webkit-font-smoothing: antialiased;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.99) translateY(6px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .page-exit {
            animation: fadeOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        }
        @keyframes fadeOut {
            from { opacity: 1; transform: scale(1) translateY(0); }
            to { opacity: 0; transform: scale(0.99) translateY(6px); }
        }
    `;
    document.head.appendChild(style);

    // Intercept link clicks for exit animation
    document.addEventListener("click", (e) => {
        const link = e.target.closest('a');
        if (link && link.href && link.href.startsWith(window.location.origin) && !link.hasAttribute('download') && link.target !== '_blank') {
            const currentPath = window.location.pathname;
            const linkPath = new URL(link.href).pathname;

            // Only animate if going to a different route
            if (currentPath !== linkPath && !link.href.endsWith('#')) {
                e.preventDefault();
                document.body.classList.add("page-exit");
                setTimeout(() => {
                    window.location.href = link.href;
                }, 280);
            }
        }
    });
});

const API_URL = '/api/tickets';
let currentUserProfile = null;
let currentUsername = null;
let ticketCategories = [];

const columns = {
    "Aguardando atendimento": document.querySelector('[data-status="Aguardando atendimento"]'),
    "Em atendimento": document.querySelector('[data-status="Em atendimento"]'),
    "Aguardando terceiros": document.querySelector('[data-status="Aguardando terceiros"]'),
    "Aguardando testes": document.querySelector('[data-status="Aguardando testes"]'),
    "Concluido": document.querySelector('[data-status="Concluido"]')
};

const statusIdsMap = {
    "Aguardando atendimento": 1,
    "Em atendimento": 2,
    "Aguardando terceiros": 3,
    "Aguardando testes": 4,
    "Concluido": 5
};

let dndInitialized = false;

// Elements
const modal = document.getElementById('modal');
const btnNewTicket = document.getElementById('btnNewTicket');
const closeBtn = document.querySelector('.close-btn');
const ticketForm = document.getElementById('ticketForm');

// Auth token
function getToken() {
    return localStorage.getItem('access_token');
}

// Load tickets
async function fetchTickets() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        // Fetch current user profile if we don't have it yet
        if (!currentUserProfile) {
            const meResponse = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (meResponse.ok) {
                const user = await meResponse.json();
                currentUserProfile = user.profile.name;
                currentUsername = user.username;
                currentUsername = user.username;

                // Hide New Ticket button for Operador
                if (currentUserProfile === 'Operador' && btnNewTicket) {
                    btnNewTicket.style.display = 'none';
                }

                // Show Users link in footer for Admins and Operadores
                const navUsersBtn = document.getElementById('navUsersBtn');
                if (navUsersBtn && (currentUserProfile === 'Administrator' || currentUserProfile === 'Operador')) {
                    navUsersBtn.style.display = 'flex';
                }

                // Show Config link in footer for Admins
                const navConfigBtn = document.getElementById('navConfigBtn');
                if (navConfigBtn && currentUserProfile === 'Administrator') {
                    navConfigBtn.style.display = 'flex';
                }
            }
        }

        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = '/login';
            return;
        }

        const tickets = await response.json();
        renderTickets(tickets);

        if (!dndInitialized && Object.values(columns).some(c => c !== null)) {
            initDragAndDrop();
            dndInitialized = true;
        }
    } catch (error) {
        console.error("Error fetching tickets:", error);
    }
}

async function fetchCategories() {
    try {
        const response = await fetch('/api/categories', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (response.ok) {
            ticketCategories = await response.json();
            populateCategoryDropdown();
        }
    } catch (error) {
        console.error("Error fetching categories:", error);
    }
}

function populateCategoryDropdown() {
    const categorySelect = document.getElementById('ticketCategory');
    const typeSelect = document.getElementById('ticketType');
    if (!categorySelect || !typeSelect) return;

    categorySelect.innerHTML = '<option value="" disabled selected>Selecione a categoria</option>';
    typeSelect.innerHTML = '<option value="" disabled selected>Escolha a categoria primeiro</option>';
    typeSelect.disabled = true;

    ticketCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });

    categorySelect.addEventListener('change', (e) => {
        const selectedCatId = parseInt(e.target.value);
        const selectedCat = ticketCategories.find(c => c.id === selectedCatId);

        typeSelect.innerHTML = '<option value="" disabled selected>Selecione o tipo</option>';
        if (selectedCat && selectedCat.types.length > 0) {
            typeSelect.disabled = false;
            selectedCat.types.forEach(type => {
                const opt = document.createElement('option');
                opt.value = type.id;
                opt.textContent = type.name;
                typeSelect.appendChild(opt);
            });
        } else {
            typeSelect.disabled = true;
        }
    });
}

// Render tickets into columns
function renderTickets(tickets) {
    // Clear columns
    Object.values(columns).forEach(col => {
        if (col) col.innerHTML = '';
    });

    // Reset counters
    const counters = {
        "Aguardando atendimento": 0,
        "Em atendimento": 0,
        "Aguardando terceiros": 0,
        "Aguardando testes": 0,
        "Concluido": 0
    };

    tickets.forEach(ticket => {
        const _statusName = ticket.status.name;
        const _statusId = ticket.status.id;
        const col = columns[_statusName];

        if (col) {
            counters[_statusName]++;
            const ticketEl = document.createElement('div');

            ticketEl.className = 'ticket bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border-l-4 hover:shadow-md transition-all flex flex-col focus:outline-none';

            // Set border color based on status
            const statusClass = _statusName.toLowerCase().replace(/ /g, '-');

            const borderColors = {
                "aguardando-atendimento": ["border-slate-400", "dark:border-slate-600"],
                "em-atendimento": ["border-amber-500"],
                "aguardando-terceiros": ["border-purple-500"],
                "aguardando-testes": ["border-blue-500"],
                "concluido": ["border-emerald-500"]
            };

            if (borderColors[statusClass]) {
                ticketEl.classList.add(...borderColors[statusClass]);
            } else {
                ticketEl.classList.add('border-slate-200', 'dark:border-slate-700');
            }

            ticketEl.dataset.ticketId = ticket.id;

            let creatorHTML = ticket.creator ? `<span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">por: ${ticket.creator.username}</span>` : `<span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">#${ticket.id}</span>`;

            let actionHTML = '';

            // Both Solicitante and Operador now just see the static text since Operador drags to change status
            actionHTML = `<span class="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded truncate">${_statusName}</span>`;

            let typeHTML = '';
            if (ticket.type) {
                typeHTML = `<div class="mb-2 self-start px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-primary/10 text-primary border border-primary/20 truncate max-w-full">${ticket.type.category.name} &bull; ${ticket.type.name}</div>`;
            }

            if (currentUserProfile !== 'Solicitante') {
                // Operador/Admin can change status by dragging
                ticketEl.setAttribute('draggable', 'true');
                ticketEl.classList.add('grab-cursor');
                ticketEl.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', ticket.id);
                    // Slight delay to allow visually picking it up before adding transparency
                    setTimeout(() => ticketEl.classList.add('dragging'), 0);
                });
                ticketEl.addEventListener('dragend', () => {
                    ticketEl.classList.remove('dragging');
                });
            }

            ticketEl.innerHTML = `
                ${typeHTML}
                <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">${ticket.title}</h3>
                <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 mb-3 leading-relaxed">${ticket.description}</p>
                <div class="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center gap-2">
                    ${creatorHTML}
                    ${actionHTML}
                </div>
            `;

            // Add click listener to open interactions modal
            ticketEl.addEventListener('click', (e) => {
                // Ignore clicks if the user was just dragging the element
                if (!ticketEl.classList.contains('dragging')) {
                    openTicketDetails(ticket.id);
                }
            });

            col.appendChild(ticketEl);
        }
    });

    // Update counter spans safely
    for (const key of Object.keys(counters)) {
        const queryKey = key.replace(/ /g, '\\ ');
        const countSpan = document.querySelector(`#col-${queryKey} .count`);
        if (countSpan) countSpan.textContent = counters[key];
    }
}

// Drag & Drop Column configuration
function initDragAndDrop() {
    Object.values(columns).forEach(col => {
        if (!col) return;

        col.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allows drop
            col.closest('.column').classList.add('drag-over');
        });

        col.addEventListener('dragleave', (e) => {
            col.closest('.column').classList.remove('drag-over');
        });

        col.addEventListener('drop', (e) => {
            e.preventDefault();
            col.closest('.column').classList.remove('drag-over');

            const ticketId = e.dataTransfer.getData('text/plain');
            const newStatusName = col.getAttribute('data-status');
            const newStatusId = statusIdsMap[newStatusName];

            if (ticketId && newStatusId) {
                // Find existing ticket element in DOM quickly
                const ticketEl = document.querySelector(`.ticket[data-ticket-id="${ticketId}"]`);
                if (ticketEl) {
                    col.appendChild(ticketEl); // Move visually immediately
                }
                updateTicketStatus(ticketId, newStatusId);
            }
        });
    });
}

// Create new ticket
if (ticketForm) {
    ticketForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const type_id = document.getElementById('ticketType').value;

        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    type_id: type_id ? parseInt(type_id) : null
                })
            });

            modal.classList.add('hidden');
            ticketForm.reset();
            const typeSelect = document.getElementById('ticketType');
            if (typeSelect) {
                typeSelect.disabled = true;
                typeSelect.innerHTML = '<option value="" disabled selected>Escolha a categoria</option>';
            }
            fetchTickets();
        } catch (error) {
            console.error("Error creating ticket:", error);
        }
    });
}

// Update ticket status
window.updateTicketStatus = async function (id, newStatusId) {
    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ status_id: newStatusId })
        });
        fetchTickets();
    } catch (error) {
        console.error("Error updating ticket:", error);
    }
};

// Ticket Details & Interactions
let currentOpenTicketId = null;
const ticketDetailsModal = document.getElementById('ticketDetailsModal');
const closeDetailsBtn = document.getElementById('closeDetailsBtn');
const interactionForm = document.getElementById('interactionForm');

if (closeDetailsBtn && ticketDetailsModal) {
    closeDetailsBtn.addEventListener('click', () => {
        ticketDetailsModal.classList.add('hidden');
        currentOpenTicketId = null;
    });
}

async function openTicketDetails(ticketId) {
    currentOpenTicketId = ticketId;
    if (ticketDetailsModal) ticketDetailsModal.classList.remove('hidden');
    document.getElementById('tdmTitle').textContent = 'Carregando...';
    document.getElementById('tdmDescription').textContent = '';
    document.getElementById('tdmMeta').innerHTML = '';
    document.getElementById('tdmInteractionsList').innerHTML = '<div class="text-sm text-slate-500 dark:text-slate-400">Carregando interações...</div>';

    try {
        const response = await fetch(`/api/tickets/${ticketId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (response.ok) {
            const ticket = await response.json();
            document.getElementById('tdmTitle').textContent = ticket.title;
            document.getElementById('tdmDescription').textContent = ticket.description;

            // Meta Badges
            let metaHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">${ticket.status.name}</span>`;
            if (ticket.type) {
                metaHtml += `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 truncate">${ticket.type.category.name} &bull; ${ticket.type.name}</span>`;
            }
            if (ticket.creator) {
                metaHtml += `<span class="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400"><span class="material-symbols-outlined text-[12px] align-middle">person</span> ${ticket.creator.username}</span>`;
            }
            document.getElementById('tdmMeta').innerHTML = metaHtml;

            renderInteractions(ticket.interactions);
        }
    } catch (error) {
        console.error("Error fetching ticket details:", error);
    }
}

// Publish openTicketDetails to global scope so it can be called from dynamically rendered HTML
window.openTicketDetails = openTicketDetails;

function renderInteractions(interactions) {
    const listEl = document.getElementById('tdmInteractionsList');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!interactions || interactions.length === 0) {
        listEl.innerHTML = '<div class="text-sm text-slate-500 dark:text-slate-400 italic">Nenhum comentário adicionado ainda.</div>';
        return;
    }

    interactions.forEach(interaction => {
        const dateObj = new Date(interaction.created_at + 'Z');
        const dateStr = dateObj.toLocaleDateString('pt-BR') + ' às ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const isMe = interaction.author.username === currentUsername;
        const authorName = interaction.author.full_name || interaction.author.username;
        const badgeColor = isMe ? 'text-primary' : 'text-slate-500 dark:text-slate-400';
        const displayAuthor = isMe ? 'Você' : authorName;

        const div = document.createElement('div');
        div.className = "bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm";
        div.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px] ${badgeColor}">account_circle</span> 
                    ${displayAuthor}
                </span>
                <span class="text-[10px] text-slate-500 dark:text-slate-400">${dateStr}</span>
            </div>
            <p class="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">${interaction.content}</p>
        `;
        listEl.appendChild(div);
    });

    // Auto scroll to bottom smoothly
    const tdmBody = document.getElementById('tdmBody');
    if (tdmBody) {
        setTimeout(() => {
            tdmBody.scrollTo({ top: tdmBody.scrollHeight, behavior: 'smooth' });
        }, 50);
    }
}

if (interactionForm) {
    interactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentOpenTicketId) return;

        const contentInput = document.getElementById('interactionContent');
        const content = contentInput.value.trim();
        if (!content) return;

        const btnSubmit = document.getElementById('btnSubmitInteraction');
        if (btnSubmit) btnSubmit.disabled = true;

        try {
            const response = await fetch(`/api/tickets/${currentOpenTicketId}/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                contentInput.value = '';
                // Refresh ticket details to see new comment
                openTicketDetails(currentOpenTicketId);
            }
        } catch (error) {
            console.error("Error adding interaction:", error);
        } finally {
            if (btnSubmit) btnSubmit.disabled = false;
        }
    });
}

// Modals
if (btnNewTicket && closeBtn && modal) {
    btnNewTicket.addEventListener('click', () => modal.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}

// Authentication (Login Page)
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access_token);
                document.body.classList.add("page-exit");
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 280);
            } else {
                loginError.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.classList.remove('hidden');
        }
    });
}

window.logout = function () {
    localStorage.removeItem('access_token');
    document.body.classList.add("page-exit");
    setTimeout(() => {
        window.location.href = '/login';
    }, 280);
};

// Initial load (Dashboard only)
if (window.location.pathname === '/dashboard' || window.location.pathname.endsWith('dashboard.html')) {
    fetchCategories();
    fetchTickets();
}
