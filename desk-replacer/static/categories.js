document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    async function loadCategories() {
        try {
            const res = await fetch('/api/categories', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const categories = await res.json();
                const categoriesTableBody = document.getElementById('categoriesTableBody');
                categoriesTableBody.innerHTML = '';
                
                categories.forEach(cat => {
                    const typesString = cat.types.map(t => t.name).join(', ');
                    
                    let bgBadge = 'bg-slate-100/10 text-slate-400';
                    if (cat.name.includes('Solicitação')) { bgBadge = 'bg-primary/10 text-primary'; }
                    else if (cat.name.includes('Serviço')) { bgBadge = 'bg-blue-500/10 text-blue-400'; }
                    else if (cat.name.includes('Melhoria')) { bgBadge = 'bg-purple-500/10 text-purple-400'; }
                    else if (cat.name.includes('Implementação')) { bgBadge = 'bg-amber-500/10 text-amber-400'; }
                    else if (cat.name.includes('Bug')) { bgBadge = 'bg-red-500/10 text-red-400'; }
                    else if (cat.name.includes('Acesso')) { bgBadge = 'bg-slate-500/20 text-text-secondary'; }
                    else if (cat.name.includes('Alteração')) { bgBadge = 'bg-cyan-500/10 text-cyan-400'; }
                    else if (cat.name.includes('Relatório')) { bgBadge = 'bg-emerald-500/10 text-emerald-400'; }

                    categoriesTableBody.innerHTML += `
                    <tr>
                        <td class="px-4 py-4">
                            <div class="flex flex-col">
                                <span class="text-sm font-medium text-slate-900 dark:text-text-primary">${typesString || 'Nenhum tipo'}</span>
                            </div>
                        </td>
                        <td class="px-4 py-4">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgBadge}">
                                ${cat.name}
                            </span>
                        </td>
                    </tr>
                    `;
                });
            }
        } catch (error) {
            console.error("Error loading categories:", error);
        }
    }

    loadCategories();
});
