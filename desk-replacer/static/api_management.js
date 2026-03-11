document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const apiListContainer = document.querySelector('.space-y-3'); // The div holding the list
    const newTokenBtn = document.querySelector('button.bg-primary');

    // Fetch tokens
    async function loadTokens() {
        try {
            const res = await fetch('/api/tokens', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) {
                window.location.href = '/login';
                return;
            }
            if (!res.ok) throw new Error('Failed to load tokens');
            const tokens = await res.json();
            renderTokens(tokens);
        } catch (err) {
            console.error(err);
        }
    }

    function renderTokens(tokens) {
        // Clear dummy items
        apiListContainer.innerHTML = '';
        
        if (tokens.length === 0) {
            apiListContainer.innerHTML = `
                <div class="text-center py-8 text-slate-500 text-sm">
                    Nenhum token gerado ainda. Clique em "Novo Token".
                </div>
            `;
            return;
        }

        tokens.forEach(t => {
            const dateStr = new Date(t.created_at).toLocaleDateString('pt-BR');
            const itemHTML = `
                <div class="flex items-center gap-4 p-4 bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl hover:border-primary/30 transition-colors group">
                    <div class="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg text-primary">
                        <span class="material-symbols-outlined">key</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <h3 class="font-semibold text-base truncate">${t.name}</h3>
                        </div>
                        <p class="text-primary/70 text-xs font-mono truncate">Criado em: ${dateStr}</p>
                    </div>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="revokeToken(${t.id})" class="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500">
                            <span class="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    </div>
                </div>
            `;
            apiListContainer.insertAdjacentHTML('beforeend', itemHTML);
        });
    }

    // Assign globally to be called from onclick
    window.revokeToken = async (id) => {
        if (!confirm('Tem certeza que deseja revogar este token? Sistemas que o utilizam ficarão sem acesso.')) return;
        try {
            const res = await fetch(`/api/tokens/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                loadTokens();
            } else {
                alert('Erro ao excluir token');
            }
        } catch (err) {
            console.error(err);
        }
    };

    newTokenBtn.addEventListener('click', async () => {
        const name = prompt('Qual o nome para este token? (Ex: Integração ERP)');
        if (!name) return;

        try {
            const res = await fetch('/api/tokens/create', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });
            
            if (res.ok) {
                const data = await res.json();
                loadTokens();
                // Show raw token ONLY once
                alert(`Token Criado com Sucesso!\n\nCopie sua chave, pois ela NÃO SERÁ EXIBIDA NOVAMENTE:\n\n${data.raw_token}`);
            } else {
                alert('Erro ao criar token');
            }
        } catch (err) {
            console.error(err);
        }
    });

    // --- Endpoints Implementation ---
    const endpoints = [
        {
            title: 'Autenticação / Login',
            method: 'POST',
            route: '/api/auth/login',
            desc: 'Geração de tokens JWT e verificação de acesso de sessões.',
            icon: 'lock',
            colorMethod: 'bg-primary',
            textMethod: 'text-primary bg-primary/20',
            fullUrl: window.location.origin + '/api/auth/login',
            headers: 'Content-Type: application/x-www-form-urlencoded',
            params: `username="seu_email"\npassword="sua_senha"`,
            response: `{\n  "access_token": "eyJ...",\n  "token_type": "bearer"\n}`
        },
        {
            title: 'Validar Integridade',
            method: 'GET',
            route: '/api/auth/me',
            desc: 'Retorna os dados autenticados da requisição.',
            icon: 'person',
            colorMethod: 'bg-blue-500',
            textMethod: 'text-blue-500 bg-blue-500/20',
            fullUrl: window.location.origin + '/api/auth/me',
            headers: 'Authorization: Bearer <token>\n(OU) X-API-KEY: <seu_token_api>',
            params: `Nenhum parâmetro de requisição`,
            response: `{\n  "id": 1,\n  "username": "admin",\n  "profile_id": 1,\n  "profile": {\n    "name": "Administrator"\n  }\n}`
        },
        {
            title: 'Criar Chamado',
            method: 'POST',
            route: '/api/tickets',
            desc: 'Abertura de novos tickets de suporte no sistema.',
            icon: 'add_circle',
            colorMethod: 'bg-primary',
            textMethod: 'text-primary bg-primary/20',
            fullUrl: window.location.origin + '/api/tickets',
            headers: 'Authorization: Bearer <token>\nOU X-API-KEY: <seu_token>\nContent-Type: application/json',
            params: `{\n  "title": "Problema de Rede",\n  "description": "Estou sem internet no setor.",\n  "category_id": 1,\n  "type_id": 1\n}`,
            response: `{\n  "id": 12,\n  "title": "Problema de Rede",\n  "status": {\n    "name": "Aberto"\n  }\n}`
        },
        {
            title: 'Listar Chamados',
            method: 'GET',
            route: '/api/tickets',
            desc: 'Lista todos os chamados abertos e resolvidos com base nos filtros.',
            icon: 'view_list',
            colorMethod: 'bg-blue-500',
            textMethod: 'text-blue-500 bg-blue-500/20',
            fullUrl: window.location.origin + '/api/tickets',
            headers: 'Authorization: Bearer <token>\nOU X-API-KEY: <seu_token>',
            params: `QueryParam suportados: nenhum`,
            response: `[\n  {\n    "id": 12,\n    "title": "Problema de Rede"\n  }\n]`
        },
        {
            title: 'Listar Usuários',
            method: 'GET',
            route: '/api/users',
            desc: 'Retorna a base de clientes do sistema.',
            icon: 'group',
            colorMethod: 'bg-blue-500',
            textMethod: 'text-blue-500 bg-blue-500/20',
            fullUrl: window.location.origin + '/api/users',
            headers: 'Authorization: Bearer <token>\nOU X-API-KEY: <seu_token>',
            params: `Nenhum parâmetro na Url ou Corpo`,
            response: `[\n  {\n    "id": 1,\n    "username": "admin",\n    "profile": {"name": "Administrator"}\n  }\n]`
        },
        {
            title: 'Criar Usuário',
            method: 'POST',
            route: '/api/users',
            desc: 'Criação programática de novos credenciais de acesso.',
            icon: 'person_add',
            colorMethod: 'bg-primary',
            textMethod: 'text-primary bg-primary/20',
            fullUrl: window.location.origin + '/api/users',
            headers: 'Authorization: Bearer <token>\nOU X-API-KEY: <seu_admin_token>\nContent-Type: application/json',
            params: `{\n  "username": "joao.silva",\n  "password": "senha_segura",\n  "full_name": "João Silva",\n  "email": "joao@email.com",\n  "area_code": "11",\n  "phone": "999999999",\n  "accepts_email_notifications": true,\n  "profile_id": 2\n}`,
            response: `{\n  "id": 5,\n  "username": "joao.silva",\n  "full_name": "João Silva",\n  "email": "joao@email.com",\n  "profile": {\n    "id": 2,\n    "name": "Solicitante"\n  }\n}`
        },
        {
            title: 'Consultar Categoria',
            method: 'GET',
            route: '/api/categories',
            desc: 'Busca as áreas ou categorias pai de chamados disponíveis.',
            icon: 'layers',
            colorMethod: 'bg-blue-500',
            textMethod: 'text-blue-500 bg-blue-500/20',
            fullUrl: window.location.origin + '/api/categories',
            headers: 'Authorization: Bearer <token>\nOU X-API-KEY: <seu_token>',
            params: `Nenhum`,
            response: `[\n  {\n    "id": 1,\n    "name": "Suporte TI",\n    "types": [\n      {"id": 1, "name": "Internet lenta"}\n    ]\n  }\n]`
        },
        {
            title: 'Criar Categoria',
            method: 'POST',
            route: '/api/categories',
            desc: 'Criação de nova categoria de triagem principal.',
            icon: 'create_new_folder',
            colorMethod: 'bg-primary',
            textMethod: 'text-primary bg-primary/20',
            fullUrl: window.location.origin + '/api/categories',
            headers: 'Authorization: Bearer <token>\nOU X-API-KEY: <seu_admin_token>\nContent-Type: application/json',
            params: `{\n  "name": "Manutenção Predial"\n}`,
            response: `{\n  "id": 10,\n  "name": "Manutenção Predial"\n}`
        },
        {
            title: 'Consultar Tipos',
            method: 'GET',
            route: '/api/types',
            desc: 'Busca o catálogo plano de sub-tipos de chamados.',
            icon: 'label',
            colorMethod: 'bg-blue-500',
            textMethod: 'text-blue-500 bg-blue-500/20',
            fullUrl: window.location.origin + '/api/types',
            headers: 'Authorization: Bearer <token>\nOU X-API-KEY: <seu_token>',
            params: `Nenhum`,
            response: `[\n  {\n    "id": 1,\n    "name": "Internet Lenta",\n    "category": {\n      "id": 1,\n      "name": "Suporte TI"\n    }\n  }\n]`
        },
        {
            title: 'Criar Tipo',
            method: 'POST',
            route: '/api/types',
            desc: 'Criação de um sub-tipo vinculado a alguma categoria.',
            icon: 'new_label',
            colorMethod: 'bg-primary',
            textMethod: 'text-primary bg-primary/20',
            fullUrl: window.location.origin + '/api/types',
            headers: 'Authorization: Bearer <token>\nOU X-API-KEY: <seu_admin_token>\nContent-Type: application/json',
            params: `{\n  "name": "Troca de Lâmpada",\n  "category_id": 10\n}`,
            response: `{\n  "id": 25,\n  "name": "Troca de Lâmpada",\n  "category": {\n      "id": 10,\n      "name": "Manutenção Predial"\n  }\n}`
        },
        {
            title: 'Consultar Status',
            method: 'GET',
            route: '/api/statuses',
            desc: 'Lista as colunas/etapas da esteira Kanban.',
            icon: 'view_column',
            colorMethod: 'bg-blue-500',
            textMethod: 'text-blue-500 bg-blue-500/20',
            fullUrl: window.location.origin + '/api/statuses',
            headers: 'Authorization: Bearer <token>\nOU X-API-KEY: <seu_token>',
            params: `Nenhum`,
            response: `[\n  {\n    "id": 1,\n    "name": "Aguardando atendimento"\n  }\n]`
        },
        {
            title: 'Consultar Chamado Especifico',
            method: 'GET',
            route: '/api/tickets/{id}',
            desc: 'Busca um ticket via ID especifico na URL.',
            icon: 'search',
            colorMethod: 'bg-blue-500',
            textMethod: 'text-blue-500 bg-blue-500/20',
            fullUrl: window.location.origin + '/api/tickets/15',
            headers: 'Authorization: Bearer <token>\nOU X-API-KEY: <seu_token>',
            params: `Nenhum corpo. Passar ID na rota URL`,
            response: `{\n  "id": 15,\n  "title": "Mouse quebrado",\n  "status": {\n      "id": 1,\n      "name": "Aguardando atendimento"\n  }\n}`
        },
        {
            title: 'Consultar Interações no Chamado',
            method: 'GET',
            route: '/api/tickets/{id}/interactions',
            desc: 'Busca a timeline de interações/comentarios de um ticket.',
            icon: 'forum',
            colorMethod: 'bg-blue-500',
            textMethod: 'text-blue-500 bg-blue-500/20',
            fullUrl: window.location.origin + '/api/tickets/15/interactions',
            headers: 'Authorization: Bearer <token>\nOU X-API-KEY: <seu_token>',
            params: `Nenhum corpo. Passar ID do ticket na rota URL`,
            response: `[\n  {\n    "id": 1,\n    "content": "Estou analisando o caso.",\n    "created_at": "2023-10-25T14...Z",\n    "author": {\n      "username": "admin"\n      //...\n    }\n  }\n]`
        },
        {
            title: 'Criar Interação no Chamado',
            method: 'POST',
            route: '/api/tickets/{id}/interactions',
            desc: 'Injeta um novo comentário no timeline do ticket.',
            icon: 'add_comment',
            colorMethod: 'bg-primary',
            textMethod: 'text-primary bg-primary/20',
            fullUrl: window.location.origin + '/api/tickets/15/interactions',
            headers: 'Authorization: Bearer <token>\nOU X-API-KEY: <seu_token>\nContent-Type: application/json',
            params: `{\n  "content": "O provedor informou que resolve até às 18h."\n}`,
            response: `{\n  "id": 2,\n  "content": "O provedor informou que resolve até às 18h.",\n  "created_at": "2023-10-25T15...Z",\n  "author": { ... }\n}`
        }
    ];

    const endpointList = document.getElementById('endpointList');

    function renderEndpoints() {
        endpointList.innerHTML = '';
        endpoints.forEach((ep, index) => {
            const html = `
                <div onclick="openApiModal(${index})" class="flex items-center gap-4 p-4 bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/10 rounded-xl hover:border-primary/30 transition-colors group cursor-pointer shadow-sm">
                    <div class="flex items-center justify-center w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                        <span class="material-symbols-outlined">${ep.icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <h3 class="font-semibold text-base truncate">${ep.title}</h3>
                            <span class="px-2 py-0.5 rounded ${ep.textMethod} text-[10px] font-bold uppercase">${ep.method}</span>
                        </div>
                        <p class="text-primary/70 text-xs font-mono truncate">${ep.route}</p>
                        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">${ep.desc}</p>
                    </div>
                    <div class="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="p-2 hover:bg-primary/10 rounded-lg text-slate-400 hover:text-primary">
                            <span class="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            `;
            endpointList.insertAdjacentHTML('beforeend', html);
        });
    }

    // Modal Logic
    const apiModal = document.getElementById('apiModal');
    
    window.openApiModal = (idx) => {
        const ep = endpoints[idx];
        if (!ep) return;
        
        document.getElementById('modalApiName').innerText = ep.title;
        document.getElementById('modalMethod').innerText = ep.method;
        document.getElementById('modalMethod').className = `text-background-dark px-3 py-1 rounded font-bold text-sm tracking-wider ${ep.colorMethod}`;
        
        document.getElementById('modalTitle').innerText = ep.title;
        document.getElementById('modalRoute').innerText = ep.route;
        
        document.getElementById('modalFullUrl').innerText = ep.fullUrl;
        document.getElementById('modalHeaders').innerText = ep.headers;
        document.getElementById('modalParams').innerText = ep.params;
        document.getElementById('modalResponse').innerText = ep.response;

        apiModal.classList.remove('hidden');
    };

    window.closeApiModal = () => {
        apiModal.classList.add('hidden');
    };

    loadTokens();
    renderEndpoints();
});
