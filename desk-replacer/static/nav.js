function initBottomNav() {
    const navPlaceholder = document.getElementById('bottom-nav');
    if (!navPlaceholder) return;

    const path = window.location.pathname;
    const isPage = (p) => {
        if (p === 'dashboard' && (path === '/' || path === '/dashboard' || path.endsWith('/dashboard.html'))) return true;
        return path.includes(p);
    };

    // Determine theme color
    const themes = {
        'dashboard': '#10b77f',
        'sprints': '#d4af37',
        'reports': '#a78bfa',
        'profile': '#6366f1',
        'config': '#0ea5e9'
    };

    let activeColor = themes['dashboard'];
    for (const key in themes) {
        if (isPage(key) || (key === 'config' && (isPage('users') || isPage('categories') || isPage('types')))) {
            activeColor = themes[key];
            break;
        }
    }

    const navHTML = `
    <nav class="shrink-0 relative w-full bg-black border-t border-slate-800 safe-area-bottom z-[100] shadow-[0_-4px_25px_-5px_rgba(0,0,0,0.5)]">
        <div class="max-w-md mx-auto flex justify-around py-3 px-2">
            <a class="nav-item flex flex-1 flex-col items-center gap-1 transition-all duration-200 ${isPage('dashboard') ? 'active' : 'text-slate-500 hover:text-slate-300'}" 
               href="/dashboard" 
               style="${isPage('dashboard') ? `color: ${activeColor} !important;` : ''}">
                <span class="material-symbols-outlined" style="${isPage('dashboard') ? 'font-variation-settings: \'FILL\' 1, \'wght\' 400, \'GRAD\' 0, \'opsz\' 24;' : ''}">confirmation_number</span>
                <span class="text-[10px] ${isPage('dashboard') ? 'font-bold' : 'font-medium'} uppercase tracking-tight">Painel</span>
            </a>
            <a class="nav-item flex flex-1 flex-col items-center gap-1 transition-all duration-200 ${isPage('sprints') ? 'active' : 'text-slate-500 hover:text-slate-300'}" 
               href="/sprints"
               style="${isPage('sprints') ? `color: ${activeColor} !important;` : ''}">
                <span class="material-symbols-outlined" style="${isPage('sprints') ? 'font-variation-settings: \'FILL\' 1, \'wght\' 400, \'GRAD\' 0, \'opsz\' 24;' : ''}">event_note</span>
                <span class="text-[10px] ${isPage('sprints') ? 'font-bold' : 'font-medium'} uppercase tracking-tight">Sprints</span>
            </a>
            <a class="nav-item flex flex-1 flex-col items-center gap-1 transition-all duration-200 ${isPage('reports') ? 'active' : 'text-slate-500 hover:text-slate-300'}" 
               href="/reports"
               style="${isPage('reports') ? `color: ${activeColor} !important;` : ''}">
                <span class="material-symbols-outlined" style="${isPage('reports') ? 'font-variation-settings: \'FILL\' 1, \'wght\' 400, \'GRAD\' 0, \'opsz\' 24;' : ''}">bar_chart</span>
                <span class="text-[10px] ${isPage('reports') ? 'font-bold' : 'font-medium'} uppercase tracking-tight">Status</span>
            </a>
            <a class="nav-item flex flex-1 flex-col items-center gap-1 transition-all duration-200 ${isPage('profile') ? 'active' : 'text-slate-500 hover:text-slate-300'}" 
               href="/profile"
               style="${isPage('profile') ? `color: ${activeColor} !important;` : ''}">
                <span class="material-symbols-outlined" style="${isPage('profile') ? 'font-variation-settings: \'FILL\' 1, \'wght\' 400, \'GRAD\' 0, \'opsz\' 24;' : ''}">person</span>
                <span class="text-[10px] ${isPage('profile') ? 'font-bold' : 'font-medium'} uppercase tracking-tight">Perfil</span>
            </a>
            <a id="navAdminLink" class="nav-item flex-col items-center gap-1 transition-all duration-200 hidden ${isPage('config') || isPage('users') || isPage('categories') || isPage('types') ? 'active' : 'text-slate-500 hover:text-slate-300'}" 
               href="/config"
               style="${(isPage('config') || isPage('users') || isPage('categories') || isPage('types')) ? `color: ${activeColor} !important;` : ''}">
                <span class="material-symbols-outlined" style="${(isPage('config') || isPage('users') || isPage('categories') || isPage('types')) ? 'font-variation-settings: \'FILL\' 1, \'wght\' 400, \'GRAD\' 0, \'opsz\' 24;' : ''}">settings</span>
                <span class="text-[10px] ${(isPage('config') || isPage('users') || isPage('categories') || isPage('types')) ? 'font-bold' : 'font-medium'} uppercase tracking-tight">Ajustes</span>
            </a>
        </div>
    </nav>
    `;

    navPlaceholder.innerHTML = navHTML;

    // Permissions check
    const token = localStorage.getItem('access_token');
    if (token) {
        fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.profile && (data.profile.name === 'Administrator' || data.profile.name === 'Operador')) {
                const adminLink = document.getElementById('navAdminLink');
                if (adminLink) {
                    adminLink.style.display = 'flex';
                    adminLink.classList.remove('hidden');
                }
            }
        })
        .catch(err => console.error("Nav permissions error:", err));
    }
}

// Initializing
document.addEventListener('DOMContentLoaded', initBottomNav);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initBottomNav();
}
window.addEventListener('load', initBottomNav);
