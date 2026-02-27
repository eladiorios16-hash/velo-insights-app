/* VELO INSIGHTS - LAYOUT ENGINE v7.2 (Calculadora + Tech Lab + Analytics) */

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
    initAnalytics(); // Iniciar telemetría
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
                <a href="calculadora.html" class="nav-link ${isActive('calculadora')} text-cyan-400">Calculadora</a>
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
    menu.className = "menu-hidden fixed inset-0 w-full h-[100dvh] bg-[#050505]/95 backdrop-blur-2xl z-[90] flex flex-col pt-28 px-4 pb-10 md:hidden overflow-y-auto";
    
    const icons = {
        home: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 01-1 1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
        news: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>`,
        teams: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
        calendar: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
        glossary: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`,
        lab: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
        calc: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`,
        search: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`
    };

    menu.innerHTML = `
        <div class="flex flex-col gap-3 relative z-10 w-full max-w-sm mx-auto">
            
            <button onclick="toggleMenu(); toggleSearch()" class="nav-item group relative flex items-center justify-between w-full p-4 mb-4 rounded-xl bg-zinc-900/60 border border-zinc-700/50 hover:border-cyan-500/80 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_#22d3ee]"></div>
                <div class="flex items-center gap-3">
                    <span class="text-cyan-500">${icons.search}</span>
                    <span class="text-xs font-bold uppercase tracking-widest text-zinc-300 group-hover:text-white transition-colors">Búsqueda rápida...</span>
                </div>
            </button>

            <a href="index.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 transition-all">
                <div class="flex items-center gap-4">
                    <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.home}</span>
                    <span class="text-xl font-black italic uppercase tracking-wider text-zinc-400 group-hover:text-white">Inicio</span>
                </div>
            </a>

            <a href="noticias.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 transition-all">
                <div class="flex items-center gap-4">
                    <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.news}</span>
                    <span class="text-xl font-black italic uppercase tracking-wider text-zinc-400 group-hover:text-white">Journal</span>
                </div>
            </a>

            <a href="calendario.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 transition-all">
                <div class="flex items-center gap-4">
                    <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.calendar}</span>
                    <span class="text-xl font-black italic uppercase tracking-wider text-zinc-400 group-hover:text-white">Calendario</span>
                </div>
            </a>

            <a href="equipos.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 transition-all">
                 <div class="flex items-center gap-4">
                     <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.teams}</span>
                     <span class="text-xl font-black italic uppercase tracking-wider text-zinc-400 group-hover:text-white">Equipos</span>
                 </div>
            </a>

            <a href="glosario.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 transition-all">
                <div class="flex items-center gap-4">
                    <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.glossary}</span>
                    <span class="text-xl font-black italic uppercase tracking-wider text-zinc-400 group-hover:text-white">Glosario</span>
                </div>
            </a>

            <a href="labs.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 transition-all">
                <div class="flex items-center gap-4">
                    <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.lab}</span>
                    <span class="text-xl font-black italic uppercase tracking-wider text-zinc-400 group-hover:text-white">Tech Lab</span>
                </div>
            </a>

            <a href="calculadora.html" class="nav-item group relative flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 border-l-4 border-l-cyan-500 transition-all">
                <div class="flex items-center gap-4">
                    <span class="text-cyan-400">${icons.calc}</span>
                    <span class="text-xl font-black italic uppercase tracking-wider text-cyan-400">Calculadora</span>
                </div>
            </a>
        </div>
    `;
    document.body.appendChild(menu);
}

window.toggleMenu = function() {
    const menu = document.getElementById('main-menu');
    if (menu.classList.contains('menu-hidden')) {
        menu.classList.remove('menu-hidden');
        menu.classList.add('menu-visible');
        document.body.style.overflow = 'hidden';
    } else {
        menu.classList.remove('menu-visible');
        menu.classList.add('menu-hidden');
        document.body.style.overflow = '';
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

    try {
        const [resNews, resGlossary, resCalendar] = await Promise.all([
            fetch(`/api/news`).catch(() => null),
            fetch(`/api/glossary`).catch(() => null),
            fetch(`/api/calendar`).catch(() => null)
        ]);

        let n = resNews && resNews.ok ? await resNews.json() : [];
        let g = resGlossary && resGlossary.ok ? await resGlossary.json() : [];
        let c = resCalendar && resCalendar.ok ? await resCalendar.json() : [];

        results = [
            ...n.filter(i => (i.title || '').toLowerCase().includes(lowerTerm)).map(x => ({ title: x.title, type: 'NOTICIA', subtitle: x.date, link: `noticias.html?article=${x.id}` })),
            ...g.filter(i => (i.term || '').toLowerCase().includes(lowerTerm)).map(x => ({ title: x.term, type: 'GLOSARIO', subtitle: x.cat, link: `glosario.html?term=${encodeURIComponent(x.term)}` })),
            ...c.filter(i => (i.name || '').toLowerCase().includes(lowerTerm)).map(x => ({ title: x.name, type: 'CARRERA', subtitle: x.date, link: `calendario.html?race=${x.name}` }))
        ];
    } catch (e) { console.error(e); }

    if (results.length === 0) {
        container.innerHTML = `<p class="text-zinc-600 text-center py-8 uppercase text-[10px] font-black tracking-widest">Sin coincidencias</p>`;
        return;
    }

    container.innerHTML = results.map(r => `
        <a href="${r.link}" class="flex justify-between items-center p-3 hover:bg-zinc-800/50 rounded-xl group transition-colors border border-transparent hover:border-zinc-700">
            <div class="flex items-center gap-3 overflow-hidden">
                <div class="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </div>
                <div>
                    <h4 class="text-zinc-200 font-bold text-xs group-hover:text-cyan-400 truncate">${r.title}</h4>
                    <p class="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">${r.type} • ${r.subtitle}</p>
                </div>
            </div>
        </a>
    `).join('');
}

function renderFooter() {
    const footer = document.createElement('footer');
    footer.className = "py-10 md:py-20 border-t border-zinc-900 bg-black/80 backdrop-blur-md px-6 text-center mt-20 relative z-10"; 
    footer.innerHTML = `
        <div class="max-w-7xl mx-auto mb-10 grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
            <div>
                <p class="text-white font-black italic text-xl uppercase mb-4">VELO<span class="text-cyan-500">INSIGHTS</span></p>
                <p class="text-zinc-500 text-xs leading-relaxed">Plataforma de análisis técnico y telemetría para el ciclismo WorldTour. Datos reales para aficionados exigentes.</p>
            </div>
            <div class="flex flex-col gap-2">
                <p class="text-zinc-300 font-black uppercase text-[10px] tracking-widest mb-2">Legal</p>
                <a href="privacidad.html" class="text-zinc-500 hover:text-cyan-400 text-xs transition-colors">Privacidad y Cookies</a>
                <a href="privacidad.html#condiciones" class="text-zinc-500 hover:text-cyan-400 text-xs transition-colors">Condiciones de Uso</a>
            </div>
            <div class="flex flex-col gap-2">
                <p class="text-zinc-300 font-black uppercase text-[10px] tracking-widest mb-2">Tech Lab</p>
                <a href="calculadora.html" class="text-zinc-500 hover:text-cyan-400 text-xs transition-colors">Calculadora de Desarrollo</a>
                <a href="labs.html" class="text-zinc-500 hover:text-cyan-400 text-xs transition-colors">Simulador Pro vs Amateur</a>
            </div>
        </div>
        <p class="text-zinc-700 text-[9px] font-black uppercase tracking-widest leading-loose">© 2026 VELO INSIGHTS • PERFORMANCE LAB<br><span class="opacity-30 tracking-[0.3em]">DATA DRIVEN CYCLING</span></p>
    `;
    document.body.appendChild(footer);
}

function initAnalytics() {
    const GA_MEASUREMENT_ID = 'G-83B44ZKJ2B'; 
    if (localStorage.getItem('velo_cookies_consent') !== 'rejected') {
        const gaScript = document.createElement('script');
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        document.head.appendChild(gaScript);

        const inlineScript = document.createElement('script');
        inlineScript.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', { 'anonymize_ip': true });
        `;
        document.head.appendChild(inlineScript);
        console.log("📊 Telemetría activada.");
    }
}

// Re-usar tus funciones de Lightbox y ScrollReveal sin cambios (están perfectas)
function injectLightbox() { /* ... tu código ... */ }
window.openLightbox = function(src) { /* ... tu código ... */ }
window.closeLightbox = function() { /* ... tu código ... */ }
function initScrollReveal() { /* ... tu código ... */ }
function handleIncomingLinks() { /* ... tu código ... */ }
