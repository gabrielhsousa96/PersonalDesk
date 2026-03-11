// static/users.js

document.addEventListener('DOMContentLoaded', async () => {
    let allUsers = [];

    async function loadUsers() {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            // Fetch current user first to check permissions
            const meRes = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!meRes.ok) {
                window.location.href = '/login';
                return;
            }
            const meUser = await meRes.json();
            const currentUserProfileName = meUser.profile.name;

            // Solicitantes cannot see this page
            if (currentUserProfileName === 'Solicitante') {
                window.location.href = '/dashboard';
                return;
            }

            // Show or hide Novo Usuário button based on role
            const btnNewUser = document.getElementById('btnNewUser');
            const navConfigBtn = document.getElementById('navConfigBtn');

            if (currentUserProfileName === 'Administrator') {
                if(btnNewUser) btnNewUser.style.display = 'flex';
                if(navConfigBtn) navConfigBtn.style.display = 'flex';
                loadProfiles(token);
            } else {
                if(btnNewUser) btnNewUser.style.display = 'none';
                if(navConfigBtn) navConfigBtn.style.display = 'none';
            }

            // Fetch all users
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                allUsers = await res.json();
                renderUsers(allUsers);
            } else {
                document.getElementById('userListContainer').innerHTML = `<p class="text-red-500 text-center">Permissão Negada ou Erro na API.</p>`;
            }
        } catch (e) {
            console.error("Error connecting to backend.", e);
        }
    }

    function renderUsers(users) {
        const container = document.getElementById('userListContainer');
        container.innerHTML = '';

        if (users.length === 0) {
            container.innerHTML = `<p class="text-slate-500 text-center">Nenhum usuário encontrado.</p>`;
            return;
        }

        users.forEach(user => {
            const role = user.profile.name;
            const letter = user.username.charAt(0).toUpperCase();

            // Define role badge color
            let badgeColor = '';
            let dotColor = '';

            if (role === 'Administrator') {
                badgeColor = 'bg-red-500/10 text-red-500';
                dotColor = 'bg-red-500';
            } else if (role === 'Operador') {
                badgeColor = 'bg-blue-500/10 text-blue-500';
                dotColor = 'bg-blue-500';
            } else {
                badgeColor = 'bg-primary/10 text-primary';
                dotColor = 'bg-primary';
            }

            const cardHTML = `
                <div class="bg-white dark:bg-card-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 group">
                    <div class="flex items-center gap-4 flex-1">
                        <div class="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600 text-xl font-bold text-slate-400">
                            ${letter}
                        </div>
                        <div class="min-w-0">
                            <h3 class="font-semibold truncate">${user.username}</h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 truncate">Cadastro #${user.id}</p>
                        </div>
                    </div>
                    
                    <div class="hidden md:flex flex-col items-start w-32">
                        <span class="text-xs uppercase tracking-wider text-slate-500 font-bold">Cargo</span>
                        <span class="text-sm">${role}</span>
                    </div>

                    <div class="flex items-center gap-4">
                        <span class="${badgeColor} px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <span class="h-1.5 w-1.5 rounded-full ${dotColor}"></span>
                            ${role}
                        </span>
                        <div class="flex items-center gap-1">
                            <button class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors">
                                <span class="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    // Set up search and filters
    const searchInput = document.getElementById('searchInput');
    const filterRole = document.getElementById('filterRole');

    function applyFilters() {
        const search = searchInput.value.toLowerCase();
        const role = filterRole.value;

        const filtered = allUsers.filter(u => {
            const matchSearch = u.username.toLowerCase().includes(search);
            const matchRole = role === 'all' || u.profile.name === role;
            return matchSearch && matchRole;
        });

        renderUsers(filtered);
    }

    searchInput.addEventListener('input', applyFilters);
    filterRole.addEventListener('change', applyFilters);

    // --- User Creation Modal Logic ---
    const modalNewUser = document.getElementById('modalNewUser');
    const btnNewUser = document.getElementById('btnNewUser');
    const closeNewUserBtn = document.getElementById('closeNewUserBtn');
    const newUserForm = document.getElementById('newUserForm');
    const nuProfileSelect = document.getElementById('nuProfile');
    const newUserError = document.getElementById('newUserError');
    const newUserSuccess = document.getElementById('newUserSuccess');

    window.openNewUserModal = function() {
        if(modalNewUser) {
            modalNewUser.classList.remove('hidden');
            newUserError.classList.add('hidden');
            newUserSuccess.classList.add('hidden');
            if(newUserForm) newUserForm.reset();
        }
    };

    window.closeNewUserModal = function() {
        if(modalNewUser) {
            modalNewUser.classList.add('hidden');
        }
    };

    if (btnNewUser && modalNewUser && closeNewUserBtn) {
        btnNewUser.addEventListener('click', window.openNewUserModal);
        closeNewUserBtn.addEventListener('click', window.closeNewUserModal);

        // Close on outside click
        modalNewUser.addEventListener('click', (e) => {
            if (e.target === modalNewUser) {
                window.closeNewUserModal();
            }
        });
    }

    async function loadProfiles(token) {
        try {
            const res = await fetch('/api/profiles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const profiles = await res.json();
                nuProfileSelect.innerHTML = '<option value="" disabled selected>Selecione um perfil...</option>';
                profiles.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p.id;
                    option.textContent = p.name;
                    nuProfileSelect.appendChild(option);
                });
            }
        } catch (e) {
            console.error("Failed to load profiles", e);
        }
    }

    if (newUserForm) {
        newUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            newUserError.classList.add('hidden');
            newUserSuccess.classList.add('hidden');

            const token = localStorage.getItem('access_token');
            const data = {
                username: document.getElementById('nuUsername').value,
                password: document.getElementById('nuPassword').value,
                profile_id: parseInt(document.getElementById('nuProfile').value),
                full_name: document.getElementById('nuFullName').value || null,
                email: document.getElementById('nuEmail').value || null
            };

            try {
                const res = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });

                if (res.ok) {
                    newUserSuccess.classList.remove('hidden');
                    // Add delay to close modal and refresh list
                    setTimeout(() => {
                        modalNewUser.classList.add('hidden');
                        loadUsers();
                    }, 1500);
                } else {
                    const errData = await res.json();
                    newUserError.textContent = errData.detail || "Erro ao criar o usuário.";
                    newUserError.classList.remove('hidden');
                }
            } catch (err) {
                console.error("Error creating user", err);
                newUserError.textContent = "Falha de conexão com o servidor.";
                newUserError.classList.remove('hidden');
            }
        });
    }

    loadUsers();
});
