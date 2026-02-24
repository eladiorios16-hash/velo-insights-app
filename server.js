require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

// --- 1. CONFIGURACIÓN IA (VELO COPILOT) ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // <-- PEGA AQUÍ TU CLAVE DE GOOGLE AI STUDIO
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const app = express();

console.log("Fact: Servidor Velo-Insights Iniciado (Con IA Integrada)");

// 2. CONFIGURACIÓN EXPRESS
app.use(cors());
app.use(express.json());

// 3. SEGURIDAD (Basic Auth)
const authMiddleware = (req, res, next) => {
    const auth = { login: 'admin', password: 'velo2026' }; 
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Area Restringida Velo"');
    res.status(401).send('⛔ ACCESO DENEGADO');
};

// 4. ZONA ADMIN
app.get('/admin', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- 5. RUTA EXCLUSIVA: VELO COPILOT (INTELIGENCIA ARTIFICIAL) ---
app.post('/api/admin/copilot', authMiddleware, async (req, res) => {
    const { prompt, type } = req.body;

    // Usamos process.env para que lo lea de Railway de forma segura
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
            3. SUBTÍTULOS: <h3 class="text-emerald-400 border-b border-emerald-400/30 pb-2 mt-12 mb-6 font-black uppercase tracking-widest text-lg">TITULO AQUÍ</h3>
            4. TABLA COMPARATIVA (OPCIONAL): Solo ponla si tienes datos reales que comparar. Usa este HTML: <div class="overflow-x-auto rounded-xl border border-slate-700 shadow-2xl mb-10 mt-6"><table class="w-full text-left text-sm text-slate-300"><thead class="bg-slate-800 text-slate-200 uppercase font-bold text-xs"><tr><th class="p-4">Métrica</th><th class="p-4">Dato A</th><th class="p-4">Dato B</th></tr></thead><tbody class="divide-y divide-slate-700 bg-slate-900/40"><tr><td class="p-4 font-bold text-emerald-400">Ejemplo</td><td class="p-4">Valor</td><td class="p-4">Valor</td></tr></tbody></table></div>

            5. CIERRE DINÁMICO (MUY IMPORTANTE): NO uses siempre la misma caja final. Elige SOLO UNA de estas tres opciones dependiendo del tema del artículo. Escribe el interior usando listas de puntos (<ul><li>) cortos y directos, NUNCA un párrafo denso.

               OPCIÓN A (Si el tema va de vatios/rendimiento) -> Caja Violeta:
               <div class="my-10 p-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950/60 to-[#050505] border border-violet-500/30">
               <p class="text-[10px] font-black uppercase text-violet-400 tracking-widest mb-4 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span> Telemetry Insight</p>
               <ul class="text-zinc-300 text-sm space-y-2 list-disc pl-4 font-mono"><li>Dato 1 con <strong class="text-violet-300">W/kg</strong></li><li>Dato 2 corto</li></ul></div>

               OPCIÓN B (Si el tema va de estrategia/ataques) -> Caja Ámbar:
               <div class="my-10 p-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/60 to-[#050505] border border-amber-500/30">
               <p class="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-4 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Tactical Board</p>
               <ul class="text-zinc-300 text-sm space-y-2 list-disc pl-4 font-mono"><li>Punto táctico 1</li><li>Punto táctico 2</li></ul></div>

               OPCIÓN C (Si el tema va de bicicletas/aerodinámica) -> Caja Cian:
               <div class="my-10 p-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-950/60 to-[#050505] border border-cyan-500/30">
               <p class="text-[10px] font-black uppercase text-cyan-400 tracking-widest mb-4 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span> Tech Lab</p>
               <ul class="text-zinc-300 text-sm space-y-2 list-disc pl-4 font-mono"><li>Detalle material 1</li><li>Detalle aero 2</li></ul></div>
            `;
        }
         else if (type === 'telemetry') {
            systemInstruction = `
            Genera únicamente el código HTML de una caja 'Telemetry Insight' basada en los datos proporcionados.
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
                // He relajado un poco el filtro a BLOCK_ONLY_HIGH en lugar de BLOCK_NONE 
                // para evitar que Google rechace la petición por permisos de cuenta gratuita.
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
        // ✨ LA MAGIA: Ahora devolverá el mensaje exacto del error de Google
        res.status(500).json({ error: error.message || "Error desconocido al conectar con Gemini" });
    }
});

// --- 6. API MAESTRA DE ADMINISTRACIÓN ---

app.delete('/api/admin/:table/:id', authMiddleware, async (req, res) => {
    const { table, id } = req.params;
    const allowed = ['noticias', 'calendario', 'equipos', 'glosario', 'ranking', 'trending'];
    if (!allowed.includes(table)) return res.status(403).json({error: "Tabla no permitida"});
    try {
        await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/:table/:id', authMiddleware, async (req, res) => {
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

app.post('/api/admin/create/:table', authMiddleware, async (req, res) => {
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

// --- 8. ACTUALIZACIÓN AUTOMÁTICA DE BASE DE DATOS ---
async function upgradeDatabase() {
    try { await db.query("ALTER TABLE glosario ADD COLUMN insight TEXT NULL"); } catch (e) {}
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

// --- 9. SERVIDOR ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Servidor Velo Admin Universal listo en puerto ${PORT}`); 
});
