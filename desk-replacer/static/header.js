function initTopHeader() {
    const headerPlaceholder = document.getElementById('top-header');
    if (!headerPlaceholder) return;

    const path = window.location.pathname;
    const isPage = (p) => {
        if (p === 'dashboard' && (path === '/' || path === '/dashboard' || path.endsWith('/dashboard.html'))) return true;
        return path.includes(p);
    };

    // Page configurations
    const pages = {
        'dashboard': { title: 'Painel de Chamados', subtitle: 'Gestão DevOps', icon: 'confirmation_number' },
        'sprints': { title: 'Gestão de Sprints', subtitle: 'Agile Management', icon: 'event_note' },
        'reports': { title: 'Relatórios & Insights', subtitle: 'Dados de Performance', icon: 'analytics' },
        'profile': { title: 'Meu Perfil', subtitle: 'Configurações de Usuário', icon: 'person' },
        'config': { title: 'Configurações', subtitle: 'Sistema', icon: 'settings' },
        'users': { title: 'Usuários', subtitle: 'Controle de Acesso', icon: 'group' },
        'categories': { title: 'Categorias', subtitle: 'Organização', icon: 'category' },
        'types': { title: 'Tipos de Chamado', subtitle: 'Classificação', icon: 'label' },
        'api_management': { title: 'Gestão de API', subtitle: 'Chaves e Tokens', icon: 'key' },
        'api_docs': { title: 'Documentação API', subtitle: 'Guia de Integração', icon: 'description' },
        'report_dashboard': { title: 'Detalhamento Técnico', subtitle: 'Métricas Avançadas', icon: 'query_stats' }
    };

    let config = pages['dashboard']; // Fallback
    for (const key in pages) {
        if (isPage(key)) {
            config = pages[key];
            break;
        }
    }
    // Specific overrides for sub-pages
    if (path.includes('report_dashboard')) config = pages['report_dashboard'];
    if (path.includes('api_docs')) config = pages['api_docs'];
    if (path.includes('api_management')) config = pages['api_management'];

    const themes = {
        'dashboard': '#10b77f',
        'sprints': '#d4af37',
        'reports': '#a78bfa',
        'profile': '#6366f1',
        'config': '#0ea5e9'
    };

    let themeColor = themes['dashboard'];
    for (const key in themes) {
        if (isPage(key) || (key === 'config' && (isPage('users') || isPage('categories') || isPage('types')))) {
            themeColor = themes[key];
            break;
        }
    }

    const headerHTML = `
    <header class="sticky top-0 z-50 px-4 py-4 mb-6 border-b border-white/5 bg-black backdrop-blur-xl">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-300" 
                     style="background: ${themeColor}15; border-color: ${themeColor}30;">
                    <span class="material-symbols-outlined" style="color: ${themeColor}">${config.icon}</span>
                </div>
                <div>
                    <h1 class="text-xl font-bold tracking-tight text-white">${config.title}</h1>
                    <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full animate-pulse" style="background-color: ${themeColor}"></span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${config.subtitle}</span>
                    </div>
                </div>
            </div>
            ${isPage('dashboard') ? `
            <button id="btnNewTicket" class="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                <span class="material-symbols-outlined text-lg">add</span>
                <span class="hidden sm:inline">Novo Chamado</span>
            </button>
            ` : ''}
        </div>
    </header>
    `;

    headerPlaceholder.innerHTML = headerHTML;

    // Re-attach listener if New Ticket button exists
    const btnNewTicket = document.getElementById('btnNewTicket');
    if (btnNewTicket && typeof modal !== 'undefined' && modal) {
        btnNewTicket.onclick = () => modal.classList.remove('hidden');
    }
}

// Initializing
document.addEventListener('DOMContentLoaded', initTopHeader);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initTopHeader();
}
window.addEventListener('load', initTopHeader);
