require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 

// --- 1. CONFIGURACIÓN IA (VELO COPILOT) ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const app = express();

console.log("Fact: Servidor Velo-Insights Iniciado (Seguridad y SEO Social Activos)");

// 2. CONFIGURACIÓN EXPRESS Y SEGURIDAD BÁSICA
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());

// --- ESCUDO 3: LIMITADOR DE INTENTOS ---
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 500, // Alto para no bloquearte mientras trabajas
    message: '⛔ Demasiados intentos de acceso.'
});

// --- 3. SEGURIDAD DIVIDIDA (LA SOLUCIÓN AL BUCLE) ---

// Guardia 1: Para la página visual (Pide contraseña con ventanita)
const htmlAuthMiddleware = (req, res, next) => {
    const auth = { 
        login: process.env.ADMIN_USER || 'admin', 
        password: process.env.ADMIN_PASS || 'velo2026' 
    }; 
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Area Restringida Velo"');
    res.status(401).send('⛔ ACCESO DENEGADO - Velo Security');
};

// Guardia 2: Para la base de datos (Silencioso, comprueba si ya estás dentro)
const apiAuthMiddleware = (req, res, next) => {
    const referer = req.headers.referer || req.headers.origin || '';
    const fetchSite = req.headers['sec-fetch-site'];
    
    if (referer.includes('/velo-lab-hq') || referer.includes('veloinsights.es') || fetchSite === 'same-origin') {
        return next();
    }
    res.status(403).json({ error: "⛔ Acceso denegado a la API." });
};

// 4. ZONA ADMIN
app.get('/velo-lab-hq', loginLimiter, htmlAuthMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.use('/api/admin', apiAuthMiddleware);

// --- 5. RUTA EXCLUSIVA: VELO COPILOT (INTELIGENCIA ARTIFICIAL) ---
app.post('/api/admin/copilot', async (req, res) => {
    const { prompt, type } = req.body;
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "API Key de IA no configurada en las variables de entorno de Railway." });
    }
    try {
        let systemInstruction = "";
        if (type === 'article') {
            systemInstruction = `
            Eres el Analista Principal de 'Velo Insights', una revista digital de ciclismo de alto rendimiento.
            Tu redacción debe ser magistral, directa y con un tono periodístico de élite. 
            PROHIBIDO usar clichés como "En conclusión", "Es importante destacar" o "El mundo del ciclismo". 
            PROHIBIDO hacer párrafos densos o aburridos. Usa jerga profesional (ir a rueda, capos, VAM, Crr, W/kg).

            Genera el artículo en formato HTML puro (sin <html> ni <body>).
            REGLAS ESTRICTAS DE DISEÑO VISUAL:
            0. COLOR DINÁMICO: Elige UN color al azar para este artículo (elige entre: red, emerald, cyan, violet, pink, amber). Sustituye la etiqueta [COLOR] por esa palabra en todo el código HTML generado para que el diseño combine perfectamente.
            
            1. ARRANQUE ESTILO 'MAGAZINE' (OBLIGATORIO): El artículo DEBE empezar obligatoriamente con este bloque simulando una cabecera premium:
                <div class="border-l-4 border-[COLOR]-500 pl-4 md:pl-6 mb-8 py-2">
                    <div class="flex items-center gap-3 mb-4">
                        <span class="bg-[COLOR]-500/20 text-[COLOR]-400 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">ANÁLISIS TÉCNICO</span>
                        <span class="text-slate-500 text-[10px] font-bold uppercase tracking-widest">VELO INSIGHTS</span>
                    </div>
                    <p class="text-xl md:text-2xl text-slate-200 italic font-medium leading-relaxed">Redacta aquí una entradilla o lead espectacular de 2 líneas que enganche al lector, resumiendo la clave del artículo.</p>
                </div>

            2. LETRA CAPITULAR: Justo después del bloque anterior, el texto normal DEBE arrancar así:
                <p class="drop-cap-[COLOR] text-slate-300 text-base leading-relaxed mb-6">Tu texto y análisis comienza aquí...</p>

            3. SUBTÍTULOS: <h3 class="text-[COLOR]-400 border-b border-[COLOR]-400/30 pb-2 mt-12 mb-6 font-black uppercase tracking-widest text-lg">TITULO AQUÍ</h3>

            4. CITAS ELEGANTES (OPCIONAL): Para romper el texto visualmente, inserta una cita o conclusión clave usando este formato:
                <blockquote class="border-l-4 border-[COLOR]-500 pl-5 py-3 my-10 bg-gradient-to-r from-[COLOR]-500/10 to-transparent italic text-xl text-white font-serif shadow-sm">"Frase impactante o análisis aquí"</blockquote>

            5. HIGHLIGHTS DE DATOS EN EL TEXTO (OBLIGATORIO): Cuando menciones datos técnicos clave (Vatios, W/kg, tiempos, CdA), NO crees cajas separadas. Resáltalos directamente DENTRO del párrafo usando esta etiqueta para que destaquen como marcadores digitales:
                <strong class="text-[COLOR]-400 bg-[COLOR]-950/50 px-2 py-1 rounded font-mono border border-[COLOR]-500/30 text-sm mx-1">X.X W/kg</strong>

            6. TABLA COMPARATIVA (OPCIONAL): Solo ponla si tienes datos reales que comparar (tiempos de varios corredores, etc). Usa este HTML: 
                <div class="overflow-x-auto rounded-xl border border-slate-700 shadow-2xl mb-10 mt-6"><table class="w-full text-left text-sm text-slate-300"><thead class="bg-slate-800 text-slate-200 uppercase font-bold text-xs"><tr><th class="p-4">Métrica</th><th class="p-4">Dato A</th><th class="p-4">Dato B</th></tr></thead><tbody class="divide-y divide-slate-700 bg-slate-900/40"><tr><td class="p-4 font-bold text-[COLOR]-400">Ejemplo</td><td class="p-4">Valor</td><td class="p-4">Valor</td></tr></tbody></table></div>
            `;
        }
        else if (type === 'telemetry') {
            systemInstruction = `
            Genera únicamente el código HTML de una caja 'Telemetry Insight' basada en los datos proporcionados.
            Sustituye la palabra [COLOR] por un color que encaje con el dato (red, cyan, violet, pink, emerald).
            FORMATO ESTRICTO:
            <div class="my-10 p-6 md:p-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[COLOR]-950/60 to-[#050505] border border-[COLOR]-500/30">
            <p class="text-[10px] font-black uppercase text-[COLOR]-400 tracking-widest mb-4">Telemetry Insight // [TIPO DE DATO]</p>
            <p class="text-zinc-300">[TU ANÁLISIS DEL DATO AQUÍ]</p>
            </div>
            `;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.2,
                tools: [{ googleSearch: {} }],
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
                ]
            }
        });
        let cleanText = response.text;
        cleanText = cleanText.replace(/^```html\n?/gm, '').replace(/^```\n?/gm, '').replace(/```$/gm, '');
        res.json({ result: cleanText });
    } catch (error) {
        console.error("Error detallado de Google AI:", error);
        res.status(500).json({ error: error.message || "Error desconocido al conectar con Gemini" });
    }
});

// --- 6. API MAESTRA DE ADMINISTRACIÓN ---
app.delete('/api/admin/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const allowed = ['noticias', 'calendario', 'equipos', 'glosario', 'ranking', 'trending'];
    if (!allowed.includes(table)) return res.status(403).json({error: "Tabla no permitida"});
    try {
        await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    let data = req.body; 
    const allowed = ['noticias', 'calendario', 'equipos', 'glosario', 'ranking', 'trending'];
    if (!allowed.includes(table)) return res.status(403).json({error: "Tabla no permitida"});
    if (table === 'glosario' && data.def !== undefined) { data.definition = data.def; delete data.def; }
    if (data.isHero === '') data.isHero = 0;
    const keys = Object.keys(data);
    const values = Object.values(data);
    if (keys.length === 0) return res.status(400).json({error: "No hay datos"});
    const setClause = keys.map(key => `\`${key}\` = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    try {
        await db.query(sql, [...values, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/create/:table', async (req, res) => {
    const { table } = req.params;
    let data = req.body;
    const allowed = ['noticias', 'calendario', 'equipos', 'glosario', 'trending', 'ranking'];
    if (!allowed.includes(table)) return res.status(403).json({error: "Tabla no permitida"});
    if (table === 'glosario' && data.def !== undefined) { data.definition = data.def; delete data.def; }
    if (data.isHero === '') data.isHero = 0;
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    try {
        const columns = keys.map(key => `\`${key}\``).join(', ');
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        await db.query(sql, values);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 7. APIs PÚBLICAS ---
app.get('/api/news', async (req, res) => {
    try { const [r] = await db.query("SELECT * FROM noticias ORDER BY id DESC"); res.json(r); } catch(e){ res.status(500).json([]); }
});
app.get('/api/teams', async (req, res) => {
    try { 
        const [r] = await db.query("SELECT * FROM equipos"); 
        const data = r.map(t => ({...t, riders: typeof t.riders === 'string' ? JSON.parse(t.riders || '[]') : t.riders}));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});
app.get('/api/calendar', async (req, res) => {
    try { 
        const [rows] = await db.query("SELECT * FROM calendario ORDER BY dateISO ASC");
        const data = rows.map(c => {
            let d = {};
            try { d = typeof c.details === 'string' ? JSON.parse(c.details || '{}') : (c.details || {}); } catch (e) {}
            return { ...c, details: d };
        });
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});
app.get('/api/glossary', async (req, res) => {
    try { 
        const [rows] = await db.query("SELECT * FROM glosario ORDER BY term ASC");
        const data = rows.map(r => ({ id: r.id, term: r.term, cat: r.cat, def: r.definition, insight: r.insight }));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});
app.get('/api/trending', async (req, res) => {
    try { 
        const [rows] = await db.query("SELECT * FROM trending ORDER BY id DESC");
        res.json(rows);
    } catch(e){ res.status(500).json([]); }
});
app.get('/api/ranking', async (req, res) => {
    try { 
        const [rows] = await db.query("SELECT * FROM ranking ORDER BY points DESC");
        res.json(rows);
    } catch(e){ res.status(500).json([]); }
});

// --- SISTEMA DE VATIOS (LIKES) CON PROTECCIÓN DE IP ---
const vatiosTracker = new Set(); // Guarda las IPs en la memoria RAM del servidor temporalmente

app.post('/api/news/:id/vatios', async (req, res) => {
    const articleId = req.params.id;
    // Capturamos la IP real
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const trackKey = `${articleId}_${ip}`; // Ejemplo de clave: "15_192.168.1.1"

    // 1. Control Anti-Spam: Si la IP ya ha votado, bloqueamos
    if (vatiosTracker.has(trackKey)) {
        return res.status(429).json({ error: "Esta IP ya ha inyectado vatios a este artículo." });
    }

    try {
        // Comprobamos que la noticia exista en MySQL
        const [rows] = await db.query("SELECT id, vatios FROM noticias WHERE id = ?", [articleId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Noticia no encontrada" });
        }

        // Generamos los vatios simulados de un "pisotón" (entre 10W y 25W)
        const vatiosGenerados = Math.floor(Math.random() * (25 - 10 + 1)) + 10;
        
        // Sumamos los vatios directamente a la fila de la base de datos
        await db.query("UPDATE noticias SET vatios = COALESCE(vatios, 0) + ? WHERE id = ?", [vatiosGenerados, articleId]);
        
        // Volvemos a leer el dato para enviar el número total real de vuelta al navegador
        const [updatedRows] = await db.query("SELECT vatios FROM noticias WHERE id = ?", [articleId]);
        const totalVatios = updatedRows[0].vatios;

        // 2. Registramos la IP para que no pueda volver a darle F5 y votar
        vatiosTracker.add(trackKey);

        res.json({ success: true, vatios: totalVatios, generados: vatiosGenerados });
    } catch (error) {
        console.error("Error al guardar vatios en DB:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});


// --- 8. ACTUALIZACIÓN AUTOMÁTICA DE BASE DE DATOS ---
async function upgradeDatabase() {
    try { await db.query("ALTER TABLE glosario ADD COLUMN insight TEXT NULL"); } catch (e) {}
    try { await db.query("ALTER TABLE noticias ADD COLUMN vatios INT DEFAULT 0"); } catch (e) {}
    try {
        await db.query(`CREATE TABLE IF NOT EXISTS trending (
            id INT AUTO_INCREMENT PRIMARY KEY, tipo VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, subtitle VARCHAR(255), value VARCHAR(50)
        )`);
    } catch (e) {}
    try {
        await db.query(`CREATE TABLE IF NOT EXISTS ranking (
            id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, team VARCHAR(255), points INT DEFAULT 0
        )`);
    } catch (e) {}
}
upgradeDatabase();

// --- RUTAS SEO PARA REDES SOCIALES (OPEN GRAPH) ---
app.get('/noticias.html', async (req, res, next) => {
    const articleId = req.query.article;
    if (!articleId) return next(); 

    try {
        const [rows] = await db.query("SELECT * FROM noticias WHERE id = ?", [articleId]);
        if (rows.length === 0) return next();

        const noticia = rows[0];
        const htmlPath = path.join(__dirname, 'public', 'noticias.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        const defaultImage = '[https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1200&auto=format&fit=crop](https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1200&auto=format&fit=crop)';
        let imageUrl = noticia.image ? noticia.image : defaultImage;
        
        if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = '[https://veloinsights.es](https://veloinsights.es)' + (imageUrl.startsWith('/') ? '' : '/') + imageUrl;
        }

        const cleanTitle = noticia.title ? noticia.title.replace(/"/g, '&quot;') : 'Velo Insights';
        const cleanDesc = noticia.lead ? noticia.lead.replace(/"/g, '&quot;') : 'Análisis técnico y táctico de ciclismo.';

        const ogTags = `
    <title>${cleanTitle} | Velo Insights</title>
    <meta name="description" content="${cleanDesc}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${cleanTitle}" />
    <meta property="og:description" content="${cleanDesc}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="[https://veloinsights.es/noticias.html?article=$](https://veloinsights.es/noticias.html?article=$){articleId}" />
    <meta property="og:site_name" content="Velo Insights" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${cleanTitle}" />
    <meta name="twitter:description" content="${cleanDesc}" />
    <meta name="twitter:image" content="${imageUrl}" />
        `;

        if (html.includes('')) {
            html = html.replace('', ogTags);
        } else {
            html = html.replace('<head>', '<head>\n' + ogTags);
        }
        
        res.send(html);

    } catch (error) {
        console.error("Error fatal inyectando Open Graph:", error);
        next();
    }
});

// A. Servimos la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

app.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = '[https://veloinsights.es](https://veloinsights.es)'; 

        res.set('Content-Type', 'application/xml');
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        const staticPages = [
            '/', '/noticias.html', '/calendario.html', '/equipos.html', 
            '/labs.html', '/calculadora.html', '/glosario.html', '/privacidad.html'
        ];
        
        staticPages.forEach(page => {
            xml += `  <url>\n    <loc>${baseUrl}${page}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${page === '/' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
        });

        try {
            const [noticias] = await db.query("SELECT id FROM noticias ORDER BY id DESC");
            if (noticias && noticias.length > 0) {
                noticias.forEach(news => {
                    xml += `  <url>\n    <loc>${baseUrl}/noticias.html?article=${news.id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
                });
            }
        } catch (e) {}

        xml += `</urlset>`;
        res.status(200).send(xml);

    } catch (error) {
        res.set('Content-Type', 'application/xml');
        res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>https://veloinsights.es/</loc></url>\n</urlset>`);
    }
});

// C. CIERRE GLOBAL (Debe ir siempre al final)
app.use((req, res) => { 
    res.sendFile(path.join(__dirname, 'public', 'index.html')); 
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Servidor Velo Admin Universal listo en puerto ${PORT}`); 
});
