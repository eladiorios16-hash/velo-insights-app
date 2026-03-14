// --- BUSCAR EN EL RANKING Y PALMARÉS ---
                const ranking = data.ranking.sort((a,b) => b.points - a.points);
                const riderRankIndex = ranking.findIndex(r => r.name.toLowerCase() === rawName.toLowerCase());
                
                if (riderRankIndex !== -1) {
                    const riderData = ranking[riderRankIndex];
                    document.getElementById('rider-points').innerText = riderData.points;
                    document.getElementById('rider-rank').innerText = `#${riderRankIndex + 1}`;
                    document.getElementById('rider-team').innerText = riderData.team;
                    
                    // --- INYECTAR EL PALMARÉS DEL BOT ---
                    const palmaresContainer = document.querySelector('.bg-grid-pattern > div:last-child');
                    if (riderData.palmares) {
                        try {
                            const wins = JSON.parse(riderData.palmares);
                            if (wins.length > 0) {
                                palmaresContainer.className = "grid grid-cols-1 md:grid-cols-2 gap-4 pt-4";
                                palmaresContainer.innerHTML = wins.map(win => `
                                    <div class="flex items-start gap-3 p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl hover:border-amber-500/30 transition-colors">
                                        <i class="fas fa-medal text-amber-500 mt-1"></i>
                                        <span class="text-sm text-zinc-300 font-medium leading-snug">${win}</span>
                                    </div>
                                `).join('');
                            }
                        } catch(e) {
                            console.error("Error parseando palmarés", e);
                        }
                    } else {
                        palmaresContainer.innerHTML = `<p class="text-sm font-mono text-zinc-500 text-center py-10 italic">Aún no hay grandes victorias registradas en la base de datos central.</p>`;
                    }
                }
