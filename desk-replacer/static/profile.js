// static/profile.js

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (response.ok) {
            const userData = await response.json();

            // 1. Populate Header / Titles
            document.getElementById('profileNameDisplay').textContent = userData.username;
            document.getElementById('profileRoleDisplay').textContent = userData.profile.name;

            // 2. Avatar Letter
            const avatarLetter = (userData.full_name ? userData.full_name : userData.username).charAt(0).toUpperCase();
            document.getElementById('avatarLetter').textContent = avatarLetter;

            // 3. Form Details
            document.getElementById('inputUsername').value = userData.username;
            document.getElementById('profileNameDisplay').textContent = userData.full_name || userData.username;
            document.getElementById('inputFullName').value = userData.full_name || '--';
            document.getElementById('inputEmail').value = userData.email || '--';
            document.getElementById('inputAreaCode').value = userData.area_code || '--';
            document.getElementById('inputPhone').value = userData.phone || '--';
            document.getElementById('checkNotifications').checked = userData.accepts_email_notifications;

            // 4. Registration Details
            document.getElementById('infoUserId').textContent = `#${userData.id.toString().padStart(4, '0')}`;
            document.getElementById('infoRole').textContent = userData.profile.name;

            // 5. Role color dot and Bottom Nav permissions
            const roleDot = document.getElementById('roleDot');
            const navUsersBtn = document.getElementById('navUsersBtn');
            const navConfigBtn = document.getElementById('navConfigBtn');

            if (userData.profile.name === 'Administrator') {
                roleDot.className = 'size-2 rounded-full bg-red-500';
                if(navUsersBtn) navUsersBtn.style.display = 'flex'; // Admins can see Users 
                if(navConfigBtn) navConfigBtn.style.display = 'flex'; // Admins can see Config
            } else if (userData.profile.name === 'Operador') {
                roleDot.className = 'size-2 rounded-full bg-blue-500';
                if(navUsersBtn) navUsersBtn.style.display = 'flex'; // Operators can see Users
                if(navConfigBtn) navConfigBtn.style.display = 'none';
            } else {
                roleDot.className = 'size-2 rounded-full bg-primary';
                if(navUsersBtn) navUsersBtn.style.display = 'none'; // Solicitantes cannot see Users
                if(navConfigBtn) navConfigBtn.style.display = 'none';
            }

        } else {
            console.error("Failed to load profile data.");
        }
    } catch (e) {
        console.error("Error connecting to backend.", e);
    }
});

function logout() {
    localStorage.removeItem('access_token');
    window.location.href = "/login";
}

let currentUserId = null;

// Ensure we capture the ID during the initial load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const response = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
            const userData = await response.json();
            currentUserId = userData.id;
        }
    } catch (e) {}
});

// Edit Profile Logic
const btnEditProfile = document.getElementById('btnEditProfile');
const btnSaveProfile = document.getElementById('btnSaveProfile');
const editInputs = ['inputFullName', 'inputEmail', 'inputAreaCode', 'inputPhone'];
const checkNotifications = document.getElementById('checkNotifications');

if (btnEditProfile) {
    btnEditProfile.addEventListener('click', () => {
        editInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.removeAttribute('readonly');
                el.removeAttribute('disabled');
                el.classList.remove('opacity-70');
                el.classList.add('opacity-100');
            }
        });

        if (checkNotifications) {
            checkNotifications.removeAttribute('readonly');
            checkNotifications.removeAttribute('disabled');
            checkNotifications.classList.remove('opacity-70');
            checkNotifications.classList.add('opacity-100');
        }

        btnEditProfile.classList.add('hidden');
        if (btnSaveProfile) btnSaveProfile.classList.remove('hidden');
    });
}

if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', async () => {
        const payload = {
            full_name: document.getElementById('inputFullName').value || null,
            email: document.getElementById('inputEmail').value || null,
            area_code: document.getElementById('inputAreaCode').value || null,
            phone: document.getElementById('inputPhone').value || null,
            accepts_email_notifications: checkNotifications ? checkNotifications.checked : false
        };

        try {
            const btnOriginalHtml = btnSaveProfile.innerHTML;
            btnSaveProfile.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">sync</span> Salvando...';
            btnSaveProfile.disabled = true;

            const response = await fetch(`/api/users/${currentUserId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const newUserData = await response.json();
                
                // Lock inputs again
                editInputs.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.setAttribute('readonly', 'true');
                        el.setAttribute('disabled', 'true');
                        el.classList.remove('opacity-100');
                        el.classList.add('opacity-70');
                    }
                });

                if (checkNotifications) {
                    checkNotifications.setAttribute('readonly', 'true');
                    checkNotifications.setAttribute('disabled', 'true');
                    checkNotifications.classList.remove('opacity-100');
                    checkNotifications.classList.add('opacity-70');
                }

                btnSaveProfile.classList.add('hidden');
                btnSaveProfile.innerHTML = btnOriginalHtml;
                btnSaveProfile.disabled = false;
                
                if (btnEditProfile) btnEditProfile.classList.remove('hidden');
                
                // Update UI text
                document.getElementById('profileNameDisplay').textContent = newUserData.full_name || newUserData.username;
                const avatarLetter = (newUserData.full_name ? newUserData.full_name : newUserData.username).charAt(0).toUpperCase();
                document.getElementById('avatarLetter').textContent = avatarLetter;
            } else {
                const err = await response.json();
                console.error('Failed to update profile:', err);
                alert('Falha ao atualizar perfil: ' + (err.detail || 'Erro desconhecido'));
                btnSaveProfile.innerHTML = btnOriginalHtml;
                btnSaveProfile.disabled = false;
            }
        } catch (e) {
            console.error('Error updating profile', e);
            alert('Erro de conexão.');
            btnSaveProfile.innerHTML = btnOriginalHtml;
            btnSaveProfile.disabled = false;
        }
    });
}
