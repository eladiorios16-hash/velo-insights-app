/* VELO INSIGHTS - LAYOUT ENGINE v7.1 (Calculadora + Tech Lab separados) */

document.addEventListener("DOMContentLoaded", () => {
    injectGlobalStyles(); 
    renderNavbar();       
    renderMenuModal(); 
    renderFooter();        
    injectSearchModal();  
    injectLightbox();     
    initScrollReveal();   
    handleIncomingLinks();
    initNavbarScrollBehavior();
});

function injectGlobalStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* --- REJILLA DE PUNTOS (DOT GRID) --- */
        body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            z-index: -10; 
            pointer-events: none; 
            background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1.5px, transparent 1.5px);
            background-size: 32px 32px; 
            -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%);
            mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%);
        }

        .nav-link { 
            font-size: 11px; 
            font-weight: 800; 
            text-transform: uppercase; 
            letter-spacing: 0.15em; 
            transition: all 0.3s ease; 
            color: #a1a1aa; 
            position: relative;
            padding-bottom: 4px;
        }
        .nav-link:hover { color: white; }
        .nav-link.active { 
            color: #22d3ee; 
            text-shadow: 0 0 20px rgba(34, 211, 238, 0.6);
        }
        .nav-link.active::after {
            content: '';
            position: absolute;
            bottom: 0; left: 0; width: 100%; height: 1px;
            background: #22d3ee; box-shadow: 0 0 10px #22d3ee;
        }

        .nav-capsule {
            background: rgba(15, 15, 17, 0.95);
            backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.1); 
            border-top: 1px solid rgba(255, 255, 255, 0.2); 
            border-radius: 9999px; 
            padding: 0.75rem 2rem;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
            transition: all 0.3s ease;
        }
        .nav-capsule:hover {
            border-color: rgba(34, 211, 238, 0.4);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(34, 211, 238, 0.1);
            transform: translateY(-1px);
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #22d3ee; border-radius: 10px; }
        .search-modal-active { overflow: hidden; }
        
        /* --- ANIMACIONES DEL MENÚ MÓVIL --- */
        #main-menu { 
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease; 
            transform-origin: top center; 
        }
        .menu-hidden { transform: translateY(-20px); opacity: 0; pointer-events: none; }
        .menu-visible { transform: translateY(0); opacity: 1; pointer-events: auto; }

        .nav-item {
            opacity: 0;
            transform: translateX(-20px);
            transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        #main-menu.menu-visible .nav-item { opacity: 1; transform: translateX(0); }
        
        .nav-item:nth-child(1) { transition-delay: 0.05s; }
        .nav-item:nth-child(2) { transition-delay: 0.10s; }
        .nav-item:nth-child(3) { transition-delay: 0.15s; }
        .nav-item:nth-child(4) { transition-delay: 0.20s; }
        .nav-item:nth-child(5) { transition-delay: 0.25s; }
        .nav-item:nth-child(6) { transition-delay: 0.30s; }
        .nav-item:nth-child(7) { transition-delay: 0.35s; }
        .nav-item:nth-child(8) { transition-delay: 0.40s; }

        #main-nav { 
            transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.3s ease, border-color 0.3s ease, padding 0.3s ease;
        }
        #main-nav.nav-hidden { transform: translateY(-100%); }
        
        #main-nav.scrolled {
            background: rgba(5, 5, 5, 0.95);
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-top: 0.8rem; padding-bottom: 0.8rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        }
    `;
    document.head.appendChild(style);
}

function renderNavbar() {
    const path = window.location.pathname;
    const isActive = (name) => {
        if (name === 'home' && (path === '/' || path.includes('index'))) return 'active';
        return path.includes(name) ? 'active' : '';
    };
    
    const nav = document.createElement('nav');
    nav.id = "main-nav";
    nav.className = "fixed top-0 left-0 w-full z-[100] px-4 md:px-6 py-6 flex items-center justify-center transition-all duration-300";
    
    nav.innerHTML = `
        <div class="w-full max-w-7xl mx-auto flex justify-between items-center h-full relative">
            <a href="index.html" class="flex items-center gap-2 group">
                <div class="w-10 h-10 bg-white text-black flex items-center justify-center font-black italic rounded-full text-sm tracking-tighter group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.5)] border-2 border-transparent group-hover:border-cyan-400">VI</div>
                <span class="font-black italic text-white uppercase tracking-tighter text-2xl md:text-3xl ml-1 drop-shadow-lg">VELO<span class="text-cyan-500">INSIGHTS</span></span>
            </a>

            <button onclick="toggleMenu()" class="md:hidden flex items-center gap-2 px-3 py-1.5 text-zinc-400 hover:text-white active:scale-95 transition-all bg-zinc-900/90 backdrop-blur-xl rounded-full border border-zinc-700 shadow-[0_5px_15px_rgba(0,0,0,0.8)] group">
                <span class="text-[10px] font-mono font-bold uppercase tracking-widest pt-0.5 group-hover:text-cyan-400 transition-colors">Menu</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 group-hover:rotate-90 group-hover:text-cyan-400 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
            </button>
            
            <div class="hidden md:flex gap-6 items-center nav-capsule">
                <a href="index.html" class="nav-link ${isActive('home')}">Home</a>
                <a href="noticias.html" class="nav-link ${isActive('noticias')}">Journal</a>
                <a href="calendario.html" class="nav-link ${isActive('calendario')}">Calendario</a>
                <a href="equipos.html" class="nav-link ${isActive('equipos')}">Equipos</a>
                <a href="glosario.html" class="nav-link ${isActive('glosario')}">Glosario</a>
                <a href="labs.html" class="nav-link ${isActive('labs')}">Tech Lab</a>
                <a href="calculadora.html" class="nav-link ${isActive('calculadora')} text-cyan-500">Calculadora</a>
            </div>

            <div class="hidden md:flex items-center">
                <button onclick="toggleSearch()" class="p-3 text-zinc-400 hover:text-cyan-400 bg-black/40 hover:bg-zinc-800 rounded-full transition-all border border-zinc-800 hover:border-cyan-500/50 shadow-lg">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </button>
            </div>
        </div>
    `;
    document.body.prepend(nav);
}

function initNavbarScrollBehavior() {
    let lastScrollTop = 0;
    const nav = document.getElementById('main-nav');
    const menu = document.getElementById('main-menu');
    const delta = 50;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 10 && menu && menu.classList.contains('menu-visible')) {
            toggleMenu();
        }

        if (scrollTop > 20) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        if (scrollTop <= 0) {
            nav.classList.remove('nav-hidden');
            lastScrollTop = 0;
            return;
        }

        if (Math.abs(lastScrollTop - scrollTop) <= delta) return;

        if (scrollTop > lastScrollTop) {
            nav.classList.add('nav-hidden');
        } else {
            nav.classList.remove('nav-hidden');
        }
        
        lastScrollTop = scrollTop;
    });
}

function renderMenuModal() {
    const menu = document.createElement('div');
    menu.id = "main-menu";
    menu.className = "menu-hidden fixed inset-0 w-full h-[100dvh] bg-[#08151b]/60 backdrop-blur-2xl z-[90] flex flex-col pt-28 px-4 pb-10 md:hidden overflow-y-auto";
    
    const icons = {
        home: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 01-1 1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
        news: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>`,
        teams: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
        calendar: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
        glossary: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`,
        lab: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
        calc: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`,
        search: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`
    };

    menu.innerHTML = `
        <div class="flex flex-col gap-3 relative z-10 w-full max-w-sm mx-auto">
            
            <button onclick="toggleMenu(); toggleSearch()" class="nav-item group relative flex items-center justify-between w-full p-4 mb-4 rounded-xl bg-zinc-900/60 border border-zinc-700/50 hover:border-cyan-500/80 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#22d3ee]"></div>
                <div class="flex items-center gap-3">
                    <span class="text-cyan-500">${icons.search}</span>
                    <span class="text-xs font-bold uppercase tracking-widest text-zinc-300 group-hover:text-white transition-colors">Inicializar Búsqueda...</span>
                </div>
            </button>

            <a href="index.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:bg-zinc-800/60 hover:border-cyan-500/40 transition-all">
                <div class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-400 rounded-r opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#22d3ee]"></div>
                <div class="flex items-center gap-4">
                    <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.home}</span>
                    <span class="text-xl font-black italic uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors drop-shadow-lg">Inicio</span>
                </div>
                <span class="text-[10px] font-mono text-zinc-700 group-hover:text-cyan-500/50 transition-colors">01</span>
            </a>

            <a href="noticias.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:bg-zinc-800/60 hover:border-cyan-500/40 transition-all">
                <div class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-400 rounded-r opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#22d3ee]"></div>
                <div class="flex items-center gap-4">
                    <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.news}</span>
                    <span class="text-xl font-black italic uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors drop-shadow-lg">Journal</span>
                </div>
                <span class="text-[10px] font-mono text-zinc-700 group-hover:text-cyan-500/50 transition-colors">02</span>
            </a>

            <a href="equipos.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:bg-zinc-800/60 hover:border-cyan-500/40 transition-all">
                 <div class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-400 rounded-r opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#22d3ee]"></div>
                 <div class="flex items-center gap-4">
                     <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.teams}</span>
                     <span class="text-xl font-black italic uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors drop-shadow-lg">Equipos</span>
                 </div>
                 <span class="text-[10px] font-mono text-zinc-700 group-hover:text-cyan-500/50 transition-colors">03</span>
            </a>

            <a href="calendario.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:bg-zinc-800/60 hover:border-cyan-500/40 transition-all">
                <div class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-400 rounded-r opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#22d3ee]"></div>
                <div class="flex items-center gap-4">
                    <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.calendar}</span>
                    <span class="text-xl font-black italic uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors drop-shadow-lg">Calendario</span>
                </div>
                <span class="text-[10px] font-mono text-zinc-700 group-hover:text-cyan-500/50 transition-colors">04</span>
            </a>

            <a href="glosario.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:bg-zinc-800/60 hover:border-cyan-500/40 transition-all">
                <div class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-400 rounded-r opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#22d3ee]"></div>
                <div class="flex items-center gap-4">
                    <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.glossary}</span>
                    <span class="text-xl font-black italic uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors drop-shadow-lg">Glosario</span>
                </div>
                <span class="text-[10px] font-mono text-zinc-700 group-hover:text-cyan-500/50 transition-colors">05</span>
            </a>

            <a href="labs.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:bg-zinc-800/60 hover:border-cyan-500/40 transition-all">
                <div class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-400 rounded-r opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#22d3ee]"></div>
                <div class="flex items-center gap-4">
                    <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.lab}</span>
                    <span class="text-xl font-black italic uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors drop-shadow-lg">Tech Lab</span>
                </div>
                <span class="text-[10px] font-mono text-zinc-700 group-hover:text-cyan-500/50 transition-colors">06</span>
            </a>

            <a href="calculadora.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:bg-zinc-800/60 hover:border-cyan-500/40 transition-all">
                <div class="absolute left-0 top-1/4 bottom-1/4 w-1 bg-cyan-400 rounded-r opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#22d3ee]"></div>
                <div class="flex items-center gap-4">
                    <span class="text-cyan-500 transition-colors">${icons.calc}</span>
                    <span class="text-xl font-black italic uppercase tracking-wider text-cyan-400 transition-colors drop-shadow-lg">Calculadora</span>
                </div>
                <span class="text-[10px] font-mono text-zinc-700 transition-colors">07</span>
            </a>
        </div>
        
        <div class="mt-auto pt-8 text-center border-t border-zinc-800/50 w-full max-w-sm mx-auto">
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full">
                <div class="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_5px_#22d3ee]"></div>
                <p class="text-[9px] font-bold uppercase tracking-widest text-zinc-500">VeloInsights • Performance Lab</p>
            </div>
        </div>
    `;
    document.body.appendChild(menu);

    document.addEventListener('click', (e) => {
        const isButton = e.target.closest('button[onclick="toggleMenu()"]');
        const isMenu = e.target.closest('#main-menu');
        if (!isButton && !isMenu && menu.classList.contains('menu-visible')) {
            toggleMenu();
        }
    });
}

window.toggleMenu = function() {
    const menu = document.getElementById('main-menu');
    if (menu.classList.contains('menu-hidden')) {
        menu.classList.remove('menu-hidden');
        menu.classList.add('menu-visible');
    } else {
        menu.classList.remove('menu-visible');
        menu.classList.add('menu-hidden');
    }
};

function injectSearchModal() {
    if(document.getElementById('search-modal')) return;
    const modal = document.createElement('div');
    modal.id = "search-modal";
    
    modal.className = "fixed inset-0 z-[300] bg-black/50 backdrop-blur-md hidden flex items-start justify-center pt-24 px-4 md:pt-32 md:px-6 transition-all duration-300";
    
    modal.innerHTML = `
        <div class="w-full max-w-2xl bg-[#09090b]/90 border border-zinc-700/50 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl transform transition-all scale-95 opacity-0" id="search-container">
            <div class="flex items-center justify-between border-b border-zinc-800/80 p-4">
                <svg class="w-5 h-5 text-cyan-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input type="text" id="search-input-global" placeholder="BUSCAR CARRERAS, NOTICIAS, TÉRMINOS..." 
                       class="w-full bg-transparent px-4 text-sm md:text-base text-white outline-none font-bold tracking-wide placeholder-zinc-600 h-10">
                <button onclick="toggleSearch()" class="text-zinc-500 hover:text-white p-2 rounded-full hover:bg-zinc-800 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div id="search-results" class="max-h-[60vh] overflow-y-auto custom-scrollbar p-2 space-y-1"></div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('search-input-global').addEventListener('input', (e) => performSearch(e.target.value));
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape') toggleSearch(); });
}

function toggleSearch() {
    const modal = document.getElementById('search-modal');
    const container = document.getElementById('search-container');
    const isHidden = modal.classList.contains('hidden');
    
    if (isHidden) {
        modal.classList.remove('hidden');
        document.body.classList.add('search-modal-active');
        setTimeout(() => {
            container.classList.remove('scale-95', 'opacity-0');
            container.classList.add('scale-100', 'opacity-100');
            document.getElementById('search-input-global').focus();
        }, 10);
    } else {
        container.classList.remove('scale-100', 'opacity-100');
        container.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.classList.remove('search-modal-active');
        }, 200);
    }
}

async function performSearch(term) {
    const container = document.getElementById('search-results');
    if (!term || term.length < 2) { container.innerHTML = ''; return; }
    
    container.innerHTML = `<p class="text-zinc-500 text-center py-8 uppercase text-[10px] font-black tracking-widest animate-pulse">Buscando en la Base de Datos...</p>`;
    
    let results = [];
    const lowerTerm = term.toLowerCase();

    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                      ? 'http://localhost:3000' 
                      : '';

    try {
        const [resNews, resGlossary, resCalendar] = await Promise.all([
            fetch(`${API_BASE}/api/news`).catch(() => null),
            fetch(`${API_BASE}/api/glossary`).catch(() => null),
            fetch(`${API_BASE}/api/calendar`).catch(() => null)
        ]);

        let n = resNews && resNews.ok ? await resNews.json() : [];
        let g = resGlossary && resGlossary.ok ? await resGlossary.json() : [];
        let c = resCalendar && resCalendar.ok ? await resCalendar.json() : [];

        const filteredN = n.filter(i => (i.title || '').toLowerCase().includes(lowerTerm));
        const filteredG = g.filter(i => (i.term || '').toLowerCase().includes(lowerTerm) || (i.def || '').toLowerCase().includes(lowerTerm));
        const filteredC = c.filter(i => (i.name || '').toLowerCase().includes(lowerTerm));
        
        results = [
            ...filteredN.map(x => ({ title: x.title, type: 'NOTICIA', subtitle: x.date, link: `noticias.html?article=${x.id}` })),
            ...filteredG.map(x => ({ title: x.term, type: 'GLOSARIO', subtitle: x.cat, link: `glosario.html?term=${encodeURIComponent(x.term)}` })),
            ...filteredC.map(x => ({ title: x.name, type: 'CARRERA', subtitle: x.date, link: `calendario.html?race=${x.name}` }))
        ];
    } catch (e) {
        console.error("Error en la búsqueda:", e);
    }

    if (results.length === 0) {
        container.innerHTML = `<p class="text-zinc-600 text-center py-8 uppercase text-[10px] font-black tracking-widest">Sin coincidencias</p>`;
        return;
    }

    container.innerHTML = results.map(r => {
        return `
            <a href="${r.link}" class="flex justify-between items-center p-3 hover:bg-zinc-800/50 rounded-xl group transition-colors border border-transparent hover:border-zinc-700">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-colors">
                        ${r.type === 'NOTICIA' ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>' : 
                          r.type === 'CARRERA' ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M3 13V6a2 2 0 012-2h14a2 2 0 012 2v7m-2 0h2m-2-4h2"/></svg>' : 
                          '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>'}
                    </div>
                    <div class="overflow-hidden">
                        <h4 class="text-zinc-200 font-bold text-xs group-hover:text-cyan-400 transition-colors truncate">${r.title}</h4>
                        <p class="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">${r.type} • ${r.subtitle}</p>
                    </div>
                </div>
                <svg class="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
        `;
    }).join('');
}

function handleIncomingLinks() {
    const urlParams = new URLSearchParams(window.location.search);
    const raceName = urlParams.get('race');
    const searchTerm = urlParams.get('term'); 

    if (raceName && window.location.pathname.includes('calendario.html')) {
        setTimeout(() => {
            const items = document.querySelectorAll('h3');
            items.forEach(h3 => {
                if (h3.innerText.toUpperCase().includes(raceName.toUpperCase())) {
                    h3.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const card = h3.closest('.race-card');
                    if(card) {
                        card.classList.add('highlight-race'); 
                        const btn = card.querySelector('button');
                        if(btn) btn.click();
                    }
                }
            });
        }, 800);
    }
    
    if (searchTerm && window.location.pathname.includes('glosario.html')) {
        let attempts = 0;
        const checkInterval = setInterval(() => {
            const input = document.getElementById('term-search');
            const gridHasItems = document.getElementById('dictionary-grid')?.children.length > 0;
            
            if (input && gridHasItems) {
                input.value = decodeURIComponent(searchTerm);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                
                const header = document.querySelector('header');
                if(header) header.scrollIntoView({ behavior: 'smooth' });
                
                clearInterval(checkInterval);
            }
            
            attempts++;
            if (attempts > 20) clearInterval(checkInterval);
        }, 100);
    }
}

function renderFooter() {
    const footer = document.createElement('footer');
    footer.className = "py-10 md:py-20 border-t border-zinc-900 bg-black/80 backdrop-blur-md px-6 text-center mt-20 relative z-10"; 
    footer.innerHTML = `<p class="text-zinc-700 text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-loose">© 2026 VELO INSIGHTS • PERFORMANCE LAB<br><span class="opacity-30 tracking-[0.3em] md:tracking-[0.5em]">DATA DRIVEN CYCLING</span></p>`;
    document.body.appendChild(footer);
}

function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        el.style.opacity = "0";
        el.style.transform = "translateY(20px)";
        el.style.transition = "all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)";
        observer.observe(el);
    });
}

// ==========================================
// SISTEMA DE VISOR DE IMÁGENES CON ZOOM INTERACTIVO
// ==========================================
let lbScale = 1;
let lbPointX = 0;
let lbPointY = 0;
let lbStartX = 0;
let lbStartY = 0;
let lbIsDragging = false;
let lbInitialPinchDistance = null;
let lbInitialScale = 1;
let lbLastTap = 0;

function injectLightbox() {
    if(document.getElementById('vi-lightbox')) return;
    
    const lightbox = document.createElement('div');
    lightbox.id = 'vi-lightbox';
    lightbox.className = 'fixed inset-0 z-[500] bg-[#050505]/98 backdrop-blur-2xl hidden flex-col items-center justify-center opacity-0 transition-opacity duration-300';
    
    lightbox.innerHTML = `
        <button onclick="closeLightbox()" class="absolute top-6 right-6 p-3 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md transition-all z-[510] shadow-2xl border border-white/10">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <div id="vi-lightbox-wrapper" class="relative w-full h-full flex items-center justify-center overflow-hidden touch-none cursor-grab active:cursor-grabbing">
            <img id="vi-lightbox-img" src="" class="max-w-[95%] max-h-[90%] object-contain shadow-[0_0_50px_rgba(255,255,255,0.1)] rounded-xl bg-white origin-center" alt="Vista ampliada">
        </div>
        <div class="absolute bottom-10 text-cyan-400 text-[10px] font-mono uppercase tracking-widest pointer-events-none text-center bg-cyan-900/20 border border-cyan-500/30 px-4 py-2 rounded-full backdrop-blur-md">
            Pellizca para Zoom • Doble toque
        </div>
    `;
    document.body.appendChild(lightbox);

    const wrapper = document.getElementById('vi-lightbox-wrapper');
    const img = document.getElementById('vi-lightbox-img');

    const setTransform = () => {
        img.style.transform = `translate(${lbPointX}px, ${lbPointY}px) scale(${lbScale})`;
    };

    // Eventos Móvil (Pellizco y Arrastre)
    wrapper.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            lbIsDragging = false;
            lbInitialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            lbInitialScale = lbScale;
        } else if (e.touches.length === 1) {
            lbIsDragging = true;
            lbStartX = e.touches[0].clientX - lbPointX;
            lbStartY = e.touches[0].clientY - lbPointY;
        }
    }, { passive: false });

    wrapper.addEventListener('touchmove', (e) => {
        e.preventDefault(); 
        if (e.touches.length === 2) {
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            lbScale = Math.min(Math.max(1, lbInitialScale * (currentDistance / lbInitialPinchDistance)), 4);
            setTransform();
        } else if (e.touches.length === 1 && lbIsDragging && lbScale > 1) {
            lbPointX = e.touches[0].clientX - lbStartX;
            lbPointY = e.touches[0].clientY - lbStartY;
            setTransform();
        }
    }, { passive: false });

    wrapper.addEventListener('touchend', (e) => {
        lbIsDragging = false;
        if (e.touches.length < 2) {
            lbInitialPinchDistance = null;
        }
        
        // Doble Toque Rápido
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lbLastTap;
        if (tapLength < 300 && tapLength > 0 && e.touches.length === 0) {
            img.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
            if (lbScale > 1) {
                lbScale = 1; lbPointX = 0; lbPointY = 0;
            } else {
                lbScale = 2.5; lbPointX = 0; lbPointY = 0;
            }
            setTransform();
            setTimeout(() => img.style.transition = 'none', 300);
        }
        lbLastTap = currentTime;
    });

    // Eventos PC (Rueda del ratón y Arrastre)
    wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const xs = (e.clientX - lbPointX) / lbScale;
        const ys = (e.clientY - lbPointY) / lbScale;
        const delta = -e.deltaY;
        
        (delta > 0) ? (lbScale *= 1.1) : (lbScale /= 1.1);
        lbScale = Math.min(Math.max(1, lbScale), 4);
        
        lbPointX = e.clientX - xs * lbScale;
        lbPointY = e.clientY - ys * lbScale;
        
        if(lbScale === 1) { lbPointX = 0; lbPointY = 0; }
        setTransform();
    }, { passive: false });
    
    wrapper.addEventListener('mousedown', (e) => {
        if(lbScale > 1) {
            lbIsDragging = true;
            lbStartX = e.clientX - lbPointX;
            lbStartY = e.clientY - lbPointY;
        }
    });
    wrapper.addEventListener('mousemove', (e) => {
        if(!lbIsDragging) return;
        lbPointX = e.clientX - lbStartX;
        lbPointY = e.clientY - lbStartY;
        setTransform();
    });
    wrapper.addEventListener('mouseup', () => lbIsDragging = false);
    wrapper.addEventListener('mouseleave', () => lbIsDragging = false);

    // Cerrar al tocar fuera o presionar Escape
    document.addEventListener('keydown', (e) => { 
        if(e.key === 'Escape' && !document.getElementById('vi-lightbox').classList.contains('hidden')) closeLightbox(); 
    });
    wrapper.addEventListener('click', (e) => {
        if (e.target === wrapper && lbScale === 1) closeLightbox();
    });
}

window.openLightbox = function(src) {
    const lb = document.getElementById('vi-lightbox');
    const img = document.getElementById('vi-lightbox-img');
    
    lbScale = 1; lbPointX = 0; lbPointY = 0;
    img.style.transition = 'none';
    img.style.transform = 'translate(0px, 0px) scale(1)';
    img.src = src;
    
    lb.classList.remove('hidden');
    lb.classList.add('flex');
    document.body.style.overflow = 'hidden'; 
    
    setTimeout(() => {
        lb.classList.remove('opacity-0');
        lb.classList.add('opacity-100');
    }, 10);
};

window.closeLightbox = function() {
    const lb = document.getElementById('vi-lightbox');
    lb.classList.remove('opacity-100');
    lb.classList.add('opacity-0');
    
    setTimeout(() => {
        lb.classList.add('hidden');
        lb.classList.remove('flex');
        document.getElementById('vi-lightbox-img').src = ''; 
        document.body.style.overflow = ''; 
    }, 300);
};
