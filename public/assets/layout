/* VELO INSIGHTS - LAYOUT ENGINE v6.0 (Full Menu & Smart Search) */

document.addEventListener("DOMContentLoaded", () => {
    injectGlobalStyles(); 
    renderNavbar();       
    renderMenuModal(); 
    renderFooter();       
    injectSearchModal();  
    initScrollReveal();   
    handleIncomingLinks();
    initNavbarScrollBehavior();
});

function injectGlobalStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* Estilos de Navegación */
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

        /* --- DISEÑO CÁPSULA --- */
        .nav-capsule {
            background: rgba(18, 18, 20, 0.85); 
            backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08); 
            border-top: 1px solid rgba(255, 255, 255, 0.15); 
            border-radius: 9999px; 
            padding: 0.75rem 2rem;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
            transition: all 0.3s ease;
        }
        .nav-capsule:hover {
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
            transform: translateY(-1px);
        }

        /* Scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #22d3ee; border-radius: 10px; }
        .search-modal-active { overflow: hidden; }
        
        /* MENU MOVIL */
        #main-menu { 
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease; 
            transform-origin: top right; 
            background: rgba(20, 20, 23, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        }
        .menu-hidden { transform: scale(0.95) translateY(-10px); opacity: 0; pointer-events: none; }
        .menu-visible { transform: scale(1) translateY(0); opacity: 1; pointer-events: auto; }

        /* NAVBAR SCROLL */
        #main-nav { transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
        #main-nav.nav-hidden { transform: translateY(-150%); }
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
    nav.className = "fixed top-6 left-0 w-full z-[100] px-4 md:px-6 flex items-center justify-center transition-transform duration-300";
    
    nav.innerHTML = `
        <div class="w-full max-w-7xl mx-auto flex justify-between items-center h-full relative">
            
            <a href="index.html" class="flex items-center gap-2 group">
                <div class="w-10 h-10 bg-white text-black flex items-center justify-center font-black italic rounded-full text-sm tracking-tighter group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.5)] border-2 border-transparent group-hover:border-cyan-400">VI</div>
                <span class="font-black italic text-white uppercase tracking-tighter text-2xl md:text-3xl ml-1 drop-shadow-lg">VELO<span class="text-cyan-500">INSIGHTS</span></span>
            </a>

            <button onclick="toggleMenu()" class="md:hidden p-2 text-zinc-400 hover:text-white active:scale-95 transition-transform bg-zinc-900/80 backdrop-blur-md rounded-full border border-zinc-800 shadow-lg group">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
            </button>
            
            <div class="hidden md:flex gap-8 items-center nav-capsule">
                <a href="index.html" class="nav-link ${isActive('home')}">Home</a>
                <a href="noticias.html" class="nav-link ${isActive('noticias')}">Journal</a>
                <a href="calendario.html" class="nav-link ${isActive('calendario')}">Calendario</a>
                <a href="equipos.html" class="nav-link ${isActive('equipos')}">Equipos</a>
                <a href="glosario.html" class="nav-link ${isActive('glosario')}">Glosario</a>
                <a href="labs.html" class="nav-link ${isActive('labs')}">Tech Lab</a>
            </div>

            <div class="hidden md:flex items-center">
                <button onclick="toggleSearch()" class="p-3 text-zinc-400 hover:text-cyan-400 bg-black/20 hover:bg-zinc-900/80 rounded-full transition-all border border-transparent hover:border-zinc-700 shadow-sm hover:shadow-cyan-500/20">
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
    menu.className = "menu-hidden fixed top-24 right-4 w-64 border border-white/10 rounded-2xl shadow-2xl z-[110] overflow-hidden p-2 flex flex-col gap-1 md:hidden";
    
    const icons = {
        home: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 01-1 1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
        news: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>`,
        teams: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`,
        calendar: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
        glossary: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`,
        lab: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
        search: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`
    };

    menu.innerHTML = `
        <a href="index.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider group">
            <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.home}</span> Inicio
        </a>
        <a href="noticias.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider group">
            <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.news}</span> Journal
        </a>
        <a href="equipos.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider group">
             <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.teams}</span> Equipos
        </a>
        <a href="calendario.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider group">
            <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.calendar}</span> Calendario
        </a>
        <a href="glosario.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider group">
            <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.glossary}</span> Glosario
        </a>
        <a href="labs.html" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider group">
            <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.lab}</span> Tech Lab
        </a>
        <div class="h-px bg-white/10 my-1 mx-2"></div>
        <button onclick="toggleSearch()" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider text-left w-full group">
            <span class="text-zinc-500 group-hover:text-cyan-400 transition-colors">${icons.search}</span> Buscar
        </button>
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
    
    modal.className = "fixed inset-0 z-[300] bg-black/20 backdrop-blur-sm hidden flex items-start justify-center pt-24 px-4 md:pt-32 md:px-6 transition-all duration-300";
    
    modal.innerHTML = `
        <div class="w-full max-w-2xl bg-[#09090b]/80 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl transform transition-all scale-95 opacity-0" id="search-container">
            <div class="flex items-center justify-between border-b border-zinc-800/50 p-4">
                <svg class="w-5 h-5 text-zinc-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input type="text" id="search-input-global" placeholder="BUSCAR EN LA BASE DE DATOS..." 
                       class="w-full bg-transparent px-4 text-base md:text-lg text-white outline-none font-bold tracking-wide placeholder-zinc-600 h-10">
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

// --- FUNCIÓN DE BÚSQUEDA CORREGIDA (Conexión al servidor 3000) ---
async function performSearch(term) {
    const container = document.getElementById('search-results');
    if (!term || term.length < 2) { container.innerHTML = ''; return; }
    
    // Mostramos estado de carga
    container.innerHTML = `<p class="text-zinc-500 text-center py-8 uppercase text-[10px] font-black tracking-widest animate-pulse">Buscando en la Base de Datos...</p>`;
    
    let results = [];
    const lowerTerm = term.toLowerCase();

    try {
        // Pedimos los datos a nuestro puente Node.js (Puerto 3000)
        // Usamos Promise.all para pedir todo a la vez y que sea rapidísimo
        const [resNews, resGlossary, resCalendar] = await Promise.all([
            fetch('http://localhost:3000/api/news').catch(() => null),
            fetch('http://localhost:3000/api/glossary').catch(() => null),
            fetch('http://localhost:3000/api/calendar').catch(() => null)
        ]);

        let n = resNews && resNews.ok ? await resNews.json() : [];
        let g = resGlossary && resGlossary.ok ? await resGlossary.json() : [];
        let c = resCalendar && resCalendar.ok ? await resCalendar.json() : [];

        // Filtramos las coincidencias (Verificando que los campos no sean nulos)
        const filteredN = n.filter(i => (i.title || '').toLowerCase().includes(lowerTerm));
        const filteredG = g.filter(i => (i.term || '').toLowerCase().includes(lowerTerm) || (i.def || '').toLowerCase().includes(lowerTerm));
        const filteredC = c.filter(i => (i.name || '').toLowerCase().includes(lowerTerm));
        
        // Unificamos y damos formato a los resultados
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

    // Renderizamos los resultados en la lista desplegable
    container.innerHTML = results.map(r => {
        return `
            <a href="${r.link}" class="flex justify-between items-center p-3 hover:bg-white/5 rounded-xl group transition-colors">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-colors">
                        ${r.type === 'NOTICIA' ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>' : 
                          r.type === 'CARRERA' ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M3 13V6a2 2 0 012-2h14a2 2 0 012 2v7m-2 0h2m-2-4h2"/></svg>' : 
                          '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>'}
                    </div>
                    <div class="overflow-hidden">
                        <h4 class="text-zinc-200 font-bold text-xs group-hover:text-cyan-400 transition-colors truncate">${r.title}</h4>
                        <p class="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">${r.type} • ${r.subtitle}</p>
                    </div>
                </div>
                <svg class="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
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
    footer.className = "py-10 md:py-20 border-t border-zinc-900 bg-black px-6 text-center"; 
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
