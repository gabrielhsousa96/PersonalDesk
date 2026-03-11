document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    async function loadTypes() {
        try {
            const res = await fetch('/api/categories', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const categories = await res.json();
                const typesTableBody = document.getElementById('typesTableBody');
                typesTableBody.innerHTML = '';
                
                // Aggregate all types from categories
                let allTypes = [];
                categories.forEach(cat => {
                    cat.types.forEach(type => {
                        allTypes.push({
                            id: type.id,
                            name: type.name,
                            category: cat.name
                        });
                    });
                });

                allTypes.forEach(t => {
                    // Assign icon/color based on category (mocking UI like original template)
                    let icon = 'label';
                    let bgColor = 'bg-slate-100 dark:bg-slate-800';
                    let textColor = 'text-slate-600 dark:text-slate-300';
                    
                    if (t.category.includes('Solicitação')) { icon = 'receipt_long'; bgColor = 'bg-primary/10'; textColor = 'text-primary'; }
                    else if (t.category.includes('Serviço')) { icon = 'build'; bgColor = 'bg-blue-500/10'; textColor = 'text-blue-500'; }
                    else if (t.category.includes('Melhoria')) { icon = 'extension'; bgColor = 'bg-purple-500/10'; textColor = 'text-purple-500'; }
                    else if (t.category.includes('Implementação')) { icon = 'new_releases'; bgColor = 'bg-amber-500/10'; textColor = 'text-amber-500'; }
                    else if (t.category.includes('Bug')) { icon = 'bug_report'; bgColor = 'bg-red-500/10'; textColor = 'text-red-500'; }
                    else if (t.category.includes('Acesso')) { icon = 'lock_open'; bgColor = 'bg-slate-500/20'; textColor = 'text-slate-400'; }
                    else if (t.category.includes('Alteração')) { icon = 'sync'; bgColor = 'bg-cyan-500/10'; textColor = 'text-cyan-500'; }
                    else if (t.category.includes('Relatório')) { icon = 'bar_chart'; bgColor = 'bg-emerald-500/10'; textColor = 'text-emerald-500'; }


                    typesTableBody.innerHTML += `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td class="px-4 py-4">
                            <div class="w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center ${textColor}">
                                <span class="material-symbols-outlined">${icon}</span>
                            </div>
                        </td>
                        <td class="px-4 py-4">
                            <div class="flex flex-col">
                                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">${t.name}</span>
                                <span class="text-xs text-slate-500 dark:text-slate-400">Categoria: ${t.category}</span>
                            </div>
                        </td>
                        <td class="px-4 py-4 text-right">
                            <div class="flex justify-end gap-2">
                                <button class="p-1.5 text-slate-400 hover:text-primary transition-colors">
                                    <span class="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                                <button class="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                    <span class="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                    `;
                });
            }
        } catch (error) {
            console.error("Error loading types:", error);
        }
    }

    loadTypes();
});
