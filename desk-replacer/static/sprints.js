document.addEventListener('DOMContentLoaded', () => {
    fetchSprints();

    const formNewSprint = document.getElementById('formNewSprint');
    if (formNewSprint) {
        formNewSprint.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createSprint();
        });
    }

    const btnNewSprint = document.getElementById('btnNewSprint');
    if (btnNewSprint) {
        btnNewSprint.addEventListener('click', () => {
            document.getElementById('modalNewSprint').classList.remove('hidden');
        });
    }

    // Global state for open sprint
    window.currentSprintId = null;
    window.allTickets = [];
});

function closeSprintModal() {
    document.getElementById('modalNewSprint').classList.add('hidden');
}

function closeDetailsModal() {
    document.getElementById('modalSprintDetails').classList.add('hidden');
    window.currentSprintId = null;
}

async function fetchSprints() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        const response = await fetch('/api/sprints', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        const sprints = await response.json();
        renderSprints(sprints);
    } catch (error) {
        console.error('Erro ao buscar sprints:', error);
    }
}

function renderSprints(sprints) {
    const container = document.getElementById('sprintsContainer');
    const totalCountEl = document.getElementById('totalSprintsCount');
    const progressBar = document.getElementById('generalProgressBar');

    if (totalCountEl) totalCountEl.textContent = sprints ? sprints.length : 0;
    if (progressBar) progressBar.style.width = sprints && sprints.length > 0 ? '100%' : '0%';

    if (!sprints || sprints.length === 0) {
        container.innerHTML = `
            <div class="py-12 text-center text-slate-500 bg-surface-dark border border-border-dark rounded-xl">
                <span class="material-symbols-outlined text-4xl mb-2 text-primary/40">event_busy</span>
                <p>Nenhuma sprint planejada ainda.</p>
                <p class="text-xs">Clique no botão + para começar.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sprints.map(sprint => {
        const start = new Date(sprint.start_date).toLocaleDateString('pt-BR');
        const end = new Date(sprint.end_date).toLocaleDateString('pt-BR');
        
        // Status configuration
        let statusConfig = {
            label: sprint.status,
            color: 'text-primary bg-primary/10',
            icon: 'verified'
        };

        if (sprint.status === "Closed") {
            statusConfig = { label: 'Conclulda', color: 'text-slate-500 bg-slate-500/10', icon: 'check_circle' };
        } else if (sprint.status === "Planned") {
            statusConfig = { label: 'Planejada', color: 'text-amber-500 bg-amber-500/10', icon: 'pending_actions' };
        }

        return `
            <div class="bg-surface-dark border border-border-dark p-5 rounded-2xl flex items-center gap-4 group hover:border-primary/40 transition-all cursor-pointer" onclick="openSprintDetails(${sprint.id})">
                <div class="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined fill text-2xl">${statusConfig.icon}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <h4 class="font-bold text-slate-100 truncate">${sprint.name}</h4>
                        <span class="text-[9px] px-2 py-0.5 rounded ${statusConfig.color} font-bold uppercase tracking-widest">${statusConfig.label}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-xs text-slate-500 flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                            ${start} - ${end}
                        </span>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-2 line-clamp-1 italic">
                        ${sprint.goal || "Sem objetivo definido."}
                    </p>
                </div>
                <span class="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors">chevron_right</span>
            </div>
        `;
    }).join('');
}

async function createSprint() {
    const token = localStorage.getItem('access_token');
    const name = document.getElementById('sprintName').value;
    const start_date = document.getElementById('sprintStart').value;
    const end_date = document.getElementById('sprintEnd').value;
    const goal = document.getElementById('sprintGoal').value;

    try {
        const response = await fetch('/api/sprints', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                start_date: new Date(start_date).toISOString(),
                end_date: new Date(end_date).toISOString(),
                goal
            })
        });

        if (response.ok) {
            closeSprintModal();
            document.getElementById('formNewSprint').reset();
            fetchSprints();
        } else {
            const err = await response.json();
            alert('Erro ao criar sprint: ' + (err.detail || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao criar sprint:', error);
    }
}

async function openSprintDetails(sprintId) {
    const token = localStorage.getItem('access_token');
    window.currentSprintId = sprintId;

    try {
        // Fetch specific sprint
        const sRes = await fetch('/api/sprints', { headers: { 'Authorization': `Bearer ${token}` } });
        const sprints = await sRes.json();
        const sprint = sprints.find(s => s.id === sprintId);

        if (!sprint) return;

        // Populate Modal Fields
        document.getElementById('sdName').value = sprint.name;
        document.getElementById('sdStatus').value = sprint.status;
        document.getElementById('sdStart').value = sprint.start_date.split('T')[0];
        document.getElementById('sdEnd').value = sprint.end_date.split('T')[0];
        document.getElementById('sdGoal').value = sprint.goal || "";

        // UI Label
        const labelEl = document.getElementById('sdStatusLabel');
        labelEl.textContent = sprint.status === 'Active' ? 'Ativa' : (sprint.status === 'Closed' ? 'Concluída' : 'Planejada');
        labelEl.className = `text-[10px] font-bold uppercase tracking-widest ${sprint.status === 'Active' ? 'text-primary' : (sprint.status === 'Closed' ? 'text-slate-500' : 'text-amber-500')}`;

        document.getElementById('modalSprintDetails').classList.remove('hidden');

        // Fetch associated tickets
        await fetchSprintTickets(sprintId);

    } catch (e) { console.error(e); }
}

async function fetchSprintTickets(sprintId) {
    const token = localStorage.getItem('access_token');
    const container = document.getElementById('sdTicketsContainer');
    const countEl = document.getElementById('sdTicketCount');

    try {
        const response = await fetch('/api/tickets', { headers: { 'Authorization': `Bearer ${token}` } });
        const tickets = await response.json();
        const filtered = tickets.filter(t => t.sprint_id === sprintId);

        countEl.textContent = `${filtered.length} CHAMADOS`;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="py-6 text-center text-slate-500 border border-dashed border-border-dark rounded-xl">
                    <p class="text-xs">Nenhum chamado vinculado a esta sprint.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(t => {
            const statusColor = t.status.name === 'Concluido' ? 'text-emerald-500' : 'text-primary';
            return `
                <div class="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-primary/20 transition-all">
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-slate-200 truncate pr-2">${t.title}</p>
                        <p class="text-[9px] uppercase font-bold tracking-tighter ${statusColor}">${t.status.name}</p>
                    </div>
                    <span class="material-symbols-outlined text-slate-600 text-sm">open_in_new</span>
                </div>
            `;
        }).join('');

    } catch (e) { console.error(e); }
}

async function saveSprintChanges() {
    if (!window.currentSprintId) return;
    const token = localStorage.getItem('access_token');

    const data = {
        name: document.getElementById('sdName').value,
        status: document.getElementById('sdStatus').value,
        start_date: new Date(document.getElementById('sdStart').value).toISOString(),
        end_date: new Date(document.getElementById('sdEnd').value).toISOString(),
        goal: document.getElementById('sdGoal').value
    };

    try {
        const response = await fetch(`/api/sprints/${window.currentSprintId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeDetailsModal();
            fetchSprints();
        } else {
            alert('Erro ao salvar sprint.');
        }
    } catch (e) { console.error(e); }
}

function gotoSelectedSprintBoard() {
    if (window.currentSprintId) {
        localStorage.setItem('active_sprint_id', window.currentSprintId);
        window.location.href = '/dashboard';
    }
}

function gotoBoard(sprintId) {
    localStorage.setItem('active_sprint_id', sprintId);
    window.location.href = '/dashboard';
}
