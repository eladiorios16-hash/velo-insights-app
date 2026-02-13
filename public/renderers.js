/* VELO INSIGHTS - RENDER ENGINE
   Centraliza la creación de HTML para asegurar consistencia visual en toda la web.
*/

// --- CONFIGURACIÓN DE ESTILOS ---
const UI_CONFIG = {
    tags: {
        'TECH LAB': 'bg-emerald-500 text-black border-emerald-500/20',
        'AERO LAB': 'bg-pink-500 text-white border-pink-500/20',
        'DATA ANALYSIS': 'bg-violet-500 text-white border-violet-500/20',
        'RACE REPORT': 'bg-cyan-500 text-black border-cyan-500/20',
        'PREVIA': 'bg-yellow-500 text-black border-yellow-500/20',
        'DEFAULT': 'bg-zinc-800 text-white border-zinc-700'
    },
    badges: {
        'montaña': 'bg-red-500/10 text-red-500 border-red-500/30',
        'llano': 'bg-green-500/10 text-green-500 border-green-500/30',
        'tt': 'bg-blue-500/10 text-blue-500 border-blue-500/30',
        'mediamontaña': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
    }
};

// --- RENDERIZADORES DE NOTICIAS ---

/**
 * Genera el HTML de una tarjeta de noticia estándar.
 * Se usa en index.html (Grid) y noticias.html (Feed).
 */
function getNewsCardHTML(news) {
    const tagStyle = UI_CONFIG.tags[news.tag] || UI_CONFIG.tags['DEFAULT'];
    
    return `
    <article class="group cursor-pointer border-b border-zinc-900 pb-8 last:border-0 transition-all reveal-on-scroll" onclick="openArticle(${news.id})">
        <div class="aspect-[21/9] w-full overflow-hidden rounded-2xl mb-6 bg-zinc-900 relative border border-zinc-800 shadow-xl">
            <img src="${news.image}" loading="lazy" decoding="async" class="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000">
            <div class="absolute top-4 left-4">
                 <span class="px-2 py-1 ${tagStyle} text-[9px] font-black uppercase rounded shadow-xl tracking-widest border border-white/10">${news.tag}</span>
            </div>
        </div>
        <div class="flex items-center gap-3 text-[9px] font-black uppercase text-zinc-500 mb-3 tracking-widest">
            <span class="text-cyan-500">${news.date}</span>
            <span class="w-1 h-1 rounded-full bg-zinc-700"></span>
            <span>Technical Journal</span>
        </div>
        <h2 class="text-2xl md:text-3xl font-heading text-white italic uppercase leading-[0.9] mb-3 group-hover:text-cyan-400 transition-colors tracking-tighter">${news.title}</h2>
        <p class="text-zinc-400 text-sm leading-relaxed font-medium line-clamp-3">${news.lead}</p>
    </article>
    `;
}

/**
 * Genera el HTML para la noticia destacada (Hero)
 */
function getHeroNewsHTML(news) {
    const tagStyle = UI_CONFIG.tags[news.tag] || UI_CONFIG.tags['DEFAULT'];
    
    return `
    <a href="noticias.html?article=${news.id}" class="group relative h-[380px] md:h-[450px] w-full rounded-[1.5rem] overflow-hidden border border-zinc-800 block shadow-2xl hover:border-cyan-500/40 transition-colors">
        <img src="${news.image}" class="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-110">
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex items-end p-6 md:p-14 text-left">
            <div class="w-full">
                <div class="flex justify-between items-center mb-3">
                    <span class="${tagStyle} px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-lg">${news.tag}</span>
                    <span class="text-[9px] font-bold text-white uppercase bg-black/60 backdrop-blur px-2 py-0.5 rounded">${news.date}</span>
                </div>
                <h2 class="text-3xl md:text-6xl font-heading text-white italic uppercase leading-[0.9] mb-3 drop-shadow-xl line-clamp-2">${news.title}</h2>
                <p class="text-zinc-300 text-xs md:text-sm border-l-2 border-cyan-500 pl-3 line-clamp-2 max-w-xl font-medium shadow-black drop-shadow-md leading-relaxed">${news.lead}</p>
            </div>
        </div>
    </a>`;
}

// --- RENDERIZADORES DE CALENDARIO ---

/**
 * Genera la tarjeta de carrera pequeña para widgets (Sidebar / Home)
 */
function getRaceWidgetHTML(race) {
    const isLive = race.status === 'Active';
    const dateParts = race.date ? race.date.split(' ') : ['--', ''];
    
    return `
    <a href="calendario.html?race=${encodeURIComponent(race.name)}" class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-zinc-700 group">
        <div class="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center min-w-[40px] group-hover:border-yellow-500 transition-colors">
            <span class="block text-[8px] font-black text-zinc-500 uppercase">${dateParts[0]}</span>
            <span class="block text-[9px] font-bold text-white uppercase leading-none">${dateParts[1] || ''}</span>
        </div>
        <div class="overflow-hidden">
            <h4 class="text-xs md:text-sm font-bold text-white italic uppercase truncate group-hover:text-yellow-500 transition-colors">${race.name}</h4>
            <span class="text-[9px] ${isLive ? 'text-red-500 animate-pulse' : 'text-zinc-500'} font-bold uppercase tracking-wider">
                ${isLive ? '🔴 EN VIVO' : (race.category || 'UCI WT')}
            </span>
        </div>
    </a>
    `;
}

/**
 * Genera la fila de Ranking
 */
function getRankingRowHTML(cyclist, index) {
    return `
    <div class="flex items-center justify-between p-2 rounded-xl border-b border-zinc-800/50 last:border-0 group hover:bg-white/5 transition-colors">
        <div class="flex items-center gap-3">
            <span class="text-[10px] font-mono text-zinc-500 w-4 text-center">0${index + 1}</span>
            <p class="text-xs md:text-sm font-bold text-zinc-300 group-hover:text-white uppercase tracking-tight truncate max-w-[120px]">${cyclist.name}</p>
        </div>
        <p class="text-sm font-mono font-bold text-amber-500 tracking-tighter">${cyclist.points}</p>
    </div>`;
}
