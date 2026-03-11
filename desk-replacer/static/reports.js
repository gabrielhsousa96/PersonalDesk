document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const headers = { 'Authorization': `Bearer ${token}` };

    // Fetch and render KPIs
    fetch('/api/reports/kpis', { headers })
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('kpiContainer');
            if(container) {
                container.innerHTML = `
                <div class="flex flex-col gap-2 rounded-xl p-5 bg-card-dark border border-border-dark shadow-sm">
                    <div class="flex justify-between items-start">
                        <p class="text-slate-400 text-sm font-medium">Total Chamados</p>
                        <span class="p-1.5 bg-primary/10 rounded-lg text-primary material-symbols-outlined text-xl">confirmation_number</span>
                    </div>
                    <div class="flex items-baseline gap-2">
                        <p class="text-3xl font-bold">${data.total_tickets}</p>
                        <p class="text-emerald-400 text-sm font-semibold flex items-center">
                            <span class="material-symbols-outlined text-xs">trending_up</span> 12%
                        </p>
                    </div>
                </div>
                
                <div class="flex flex-col gap-2 rounded-xl p-5 bg-card-dark border border-border-dark shadow-sm">
                    <div class="flex justify-between items-start">
                        <p class="text-slate-400 text-sm font-medium">Tempo Médio</p>
                        <span class="p-1.5 bg-primary/10 rounded-lg text-primary material-symbols-outlined text-xl">timer</span>
                    </div>
                    <div class="flex items-baseline gap-2">
                        <p class="text-3xl font-bold">${data.avg_minutes}min</p>
                        <p class="text-emerald-400 text-sm font-semibold flex items-center">
                            <span class="material-symbols-outlined text-xs">trending_down</span> 5%
                        </p>
                    </div>
                </div>

                <div class="flex flex-col gap-2 rounded-xl p-5 bg-card-dark border border-border-dark shadow-sm">
                    <div class="flex justify-between items-start">
                        <p class="text-slate-400 text-sm font-medium">Satisfação</p>
                        <span class="p-1.5 bg-primary/10 rounded-lg text-primary material-symbols-outlined text-xl">thumb_up</span>
                    </div>
                    <div class="flex items-baseline gap-2">
                        <p class="text-3xl font-bold">${data.satisfaction}%</p>
                        <p class="text-emerald-400 text-sm font-semibold flex items-center">
                            <span class="material-symbols-outlined text-xs">trending_up</span> 1%
                        </p>
                    </div>
                </div>
                `;
            }
        });

    // Fetch and render Volume (Dynamic SVG Line Chart)
    fetch('/api/reports/volume', { headers })
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('volumeChartContainer');
            if(!container) return;

            // Simple responsive SVG generator based on data
            const maxVal = Math.max(...data.map(d => d.count), 100);
            const width = 400;
            const height = 150;
            const xStep = width / Math.max((data.length - 1), 1);
            
            // Generate path strings
            let dPath = '';
            let labelsHtml = '';

            data.forEach((point, i) => {
                const x = i * xStep;
                // invert Y since SVG 0,0 is top-left
                const y = height - ((point.count / maxVal) * (height * 0.8)); // 80% to leave padding
                
                if (i === 0) {
                    dPath += `M${x},${y} `;
                } else {
                    // Smooth curve approximation (simple)
                    const prevX = (i - 1) * xStep;
                    // dPath += `L${x},${y} `; 
                    dPath += `S${prevX + (xStep/2)},${y} ${x},${y} `;
                }

                labelsHtml += `<span>${point.month}</span>`;
            });

            // For the fill area, we close the path down to the bottom
            const dFill = dPath + ` L${width},${height} L0,${height} Z`;

            container.innerHTML = `
                <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 ${width} ${height}">
                    <defs>
                        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.3"/>
                            <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
                        </linearGradient>
                    </defs>
                    <path d="${dFill}" fill="url(#chartGradient)"></path>
                    <path d="${dPath}" fill="none" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"></path>
                </svg>
                <div class="flex justify-between mt-4 text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                    ${labelsHtml}
                </div>
            `;
        });

    // Fetch and render Operators Ranking
    fetch('/api/reports/operators', { headers })
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('operatorsContainer');
            if(!container) return;

            let html = '';
            data.forEach(op => {
                html += `
                <div class="space-y-1">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="font-medium text-slate-100">${op.name}</span>
                        <span class="text-primary font-bold">${op.count}</span>
                    </div>
                    <div class="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div class="bg-primary h-full rounded-full transition-all duration-1000 ease-out" style="width: 0%" data-target="${op.percentage}%"></div>
                    </div>
                </div>
                `;
            });
            container.innerHTML = html;

            // Trigger animation
            setTimeout(() => {
                const bars = container.querySelectorAll('.bg-primary');
                bars.forEach(bar => {
                    bar.style.width = bar.getAttribute('data-target');
                });
            }, 100);
        });

    // Fetch and render Categories
    fetch('/api/reports/categories', { headers })
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('categoryContainer');
            if(!container) return;

            let html = '';
            const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-cyan-500'];
            
            data.forEach((cat, index) => {
                const color = colors[index % colors.length];
                html += `
                <div class="flex flex-col gap-2 p-3 bg-slate-800/50 rounded-lg border border-border-dark">
                    <div class="size-3 rounded-full ${color}"></div>
                    <span class="text-2xl font-bold text-slate-100">${cat.count}</span>
                    <span class="text-xs text-slate-400 font-medium truncate">${cat.name}</span>
                </div>
                `;
            });
            container.innerHTML = html;
        });
});
