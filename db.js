require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();

// 1. CONFIGURACIÓN
app.use(cors());
app.use(express.json());

// 2. SEGURIDAD (Basic Auth)
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

// 3. RUTAS DE SISTEMA
app.get('/admin', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- RUTA DE REPARACIÓN DE TABLAS ---
app.get('/setup-tables', async (req, res) => {
    try {
        const queries = [
            `CREATE TABLE IF NOT EXISTS noticias (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255), tag VARCHAR(50), date VARCHAR(50), 
                image TEXT, \`lead\` TEXT, content TEXT, isHero BOOLEAN DEFAULT 0
            )`,
            `CREATE TABLE IF NOT EXISTS equipos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100), code VARCHAR(10), country VARCHAR(50), 
                jersey TEXT, riders_json LONGTEXT
            )`,
            `CREATE TABLE IF NOT EXISTS calendario (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100), status VARCHAR(20), date VARCHAR(50), 
                dateISO DATE, endDateISO DATE, category VARCHAR(10), details LONGTEXT, winner VARCHAR(100)
            )`,
            `CREATE TABLE IF NOT EXISTS ranking (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100), team VARCHAR(100), points INT, 
                \`rank\` INT, trend VARCHAR(10), profile LONGTEXT
            )`,
            `CREATE TABLE IF NOT EXISTS glosario (
                id INT AUTO_INCREMENT PRIMARY KEY,
                term VARCHAR(100), cat VARCHAR(50), definition TEXT
            )`
        ];
        for (const q of queries) await db.query(q);
        res.send("✅ Tablas reparadas correctamente.");
    } catch (e) { res.status(500).send("❌ Error: " + e.message); }
});

// --- RUTA DE RESTAURACIÓN DE CALENDARIO (UNO A UNO) ---
app.get('/restore-calendar-backup', async (req, res) => {
    try {
        await db.query("TRUNCATE TABLE calendario");
        const races = [
            [1, 'Santos Tour Down Under', '20-25 Ene', 'WT', '{"winner":"Jay Vine"}', '2026-01-20', '2026-01-25', 'Jay Vine', 'Finished'],
            [2, 'Cadel Evans Great Ocean Race', '01 Feb', 'WT', '{"winner":"Tobias Andresen"}', '2026-02-01', '2026-02-01', 'Tobias Andresen', 'Finished'],
            [3, 'UAE Tour', '16-22 Feb', 'WT', '{}', '2026-02-16', '2026-02-22', null, 'Upcoming']
            // Puedes añadir aquí el resto de carreras siguiendo este formato
        ];

        for (let race of races) {
            await db.query(
                "INSERT INTO calendario (id, name, date, category, details, dateISO, endDateISO, winner, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                race
            );
        }
        res.send("✅ Datos insertados uno a uno. Prueba /api/calendar ahora.");
    } catch (e) { res.status(500).send("❌ Error en la carga: " + e.message); }
});

// --- API PÚBLICA (GET) ---
app.get('/api/news', async (req, res) => {
    try { const [r] = await db.query("SELECT * FROM noticias ORDER BY id DESC"); res.json(r); } catch(e){ res.status(500).json([]); }
});

app.get('/api/teams', async (req, res) => {
    try { 
        const [r] = await db.query("SELECT * FROM equipos"); 
        const data = r.map(t => ({...t, riders: JSON.parse(t.riders_json || '[]')}));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});

// API CALENDAR BLINDADA CON LOGS
app.get('/api/calendar', async (req, res) => {
    try { 
        console.log("Fact: Intentando leer tabla calendario...");
        const [rows] = await db.query("SELECT * FROM calendario ORDER BY dateISO ASC");
        console.log(`Fact: Filas encontradas en BD: ${rows.length}`);

        const data = rows.map(c => {
            let detailsParsed = {};
            try {
                detailsParsed = typeof c.details === 'string' ? JSON.parse(c.details || '{}') : (c.details || {});
            } catch (e) {
                detailsParsed = { error: "JSON no válido" };
            }
            return { ...c, details: detailsParsed };
        });
        res.json(data);
    } catch(e){ 
        console.error("Error crítico en API Calendar:", e.message);
        res.status(500).json([]); 
    }
});

app.get('/api/ranking', async (req, res) => {
    try { 
        const [r] = await db.query("SELECT * FROM ranking ORDER BY points DESC");
        const data = r.map(k => ({...k, profile: JSON.parse(k.profile || '{}')}));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});

app.get('/api/glossary', async (req, res) => {
    try { const [r] = await db.query("SELECT * FROM glosario ORDER BY term ASC"); res.json(r); } catch(e){ res.status(500).json([]); }
});

// --- API ADMIN (ESCRITURA) ---
app.post('/api/admin/news', authMiddleware, async (req, res) => {
    const { title, tag, date, image, lead, content, isHero } = req.body;
    try { await db.query("INSERT INTO noticias (title, tag, date, image, `lead`, content, isHero) VALUES (?,?,?,?,?,?,?)", [title, tag, date, image, lead, content, isHero?1:0]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});

app.delete('/api/admin/calendar/:id', authMiddleware, async (req, res) => {
    try { await db.query("DELETE FROM calendario WHERE id=?", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});

// STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

// INICIO DEL SERVIDOR
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Servidor Velo listo en puerto ${PORT}`); 
});
