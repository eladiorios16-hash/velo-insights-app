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
            Eres el Editor Jefe de 'Velo Insights', una revista digital de ciclismo muy técnica, centrada en datos (W/kg, CdA, Crr), telemetría y táctica.
            Escribe un artículo completo en formato HTML basado en el prompt del usuario.
            REGLAS ESTRICTAS DE FORMATO:
            1. No incluyas etiquetas <html>, <head> o <body>. Solo el contenido puro.
            2. El primer párrafo DEBE empezar con esta clase para la letra gigante: <p class="drop-cap-pink intro-text">
            3. Usa <h3> para los subtítulos, con este formato: <h3 class="text-cyan-400 border-l-4 border-cyan-400 pl-3 mt-12">TITULO</h3>
            4. Resalta nombres de corredores importantes con clases de Tailwind, ej: <strong class="text-white">Pogacar</strong> o <span class="text-pink-400 font-bold">Evenepoel</span>.
            5. Si mencionas datos clave de potencia, mételos en una caja de Telemetry Insight con este código exacto:
               <div class="my-10 p-6 md:p-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-950/60 to-[#050505] border border-cyan-500/30">
               <p class="text-[10px] font-black uppercase text-cyan-400 tracking-widest mb-4">Telemetry Insight</p>
               <p class="text-zinc-300">TEXTO CON DATOS, resaltando vatios en <strong class="text-cyan-400 bg-cyan-950/50 px-2 py-1 rounded">XX W/kg</strong></p>
               </div>
            `;
        } else if (type === 'telemetry') {
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
                temperature: 0.7,
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
