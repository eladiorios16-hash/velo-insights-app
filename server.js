require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();

// 1. CONFIGURACIÓN
app.use(cors());
app.use(express.json());

// 2. SEGURIDAD
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

// 3. ADMIN PANEL
app.get('/admin', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- RUTA DE REPARACIÓN (CORREGIDA CON COMILLAS ` `) ---
app.get('/setup-tables', async (req, res) => {
    try {
        const queries = [
            // Aquí estaba el error: lead ahora lleva comillas `lead`
            `CREATE TABLE IF NOT EXISTS noticias (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255), 
                tag VARCHAR(50), 
                date VARCHAR(50), 
                image TEXT, 
                \`lead\` TEXT, 
                content TEXT, 
                isHero BOOLEAN DEFAULT 0
            )`,
            `CREATE TABLE IF NOT EXISTS equipos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100), 
                code VARCHAR(10), 
                country VARCHAR(50), 
                jersey TEXT, 
                riders_json LONGTEXT
            )`,
            `CREATE TABLE IF NOT EXISTS calendario (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100), 
                status VARCHAR(20), 
                date VARCHAR(50), 
                dateISO DATE, 
                category VARCHAR(10), 
                details LONGTEXT
            )`,
            // Aquí también: rank lleva comillas `rank`
            `CREATE TABLE IF NOT EXISTS ranking (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100), 
                team VARCHAR(100), 
                points INT, 
                \`rank\` INT, 
                trend VARCHAR(10), 
                profile LONGTEXT
            )`,
            `CREATE TABLE IF NOT EXISTS glosario (
                id INT AUTO_INCREMENT PRIMARY KEY,
                term VARCHAR(100), 
                cat VARCHAR(50), 
                definition TEXT
            )`
        ];
        
        for (const q of queries) await db.query(q);
        res.send("✅ ÉXITO: Tablas creadas correctamente. Las palabras reservadas han sido corregidas.");
    } catch (e) {
        res.status(500).send("❌ Error crítico: " + e.message);
    }
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
app.get('/api/calendar', async (req, res) => {
    try { 
        const [r] = await db.query("SELECT * FROM calendario ORDER BY dateISO ASC");
        const data = r.map(c => ({...c, details: JSON.parse(c.details || '{}')}));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
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

// 1. NOTICIAS
app.post('/api/admin/news', authMiddleware, async (req, res) => {
    const { title, tag, date, image, lead, content, isHero } = req.body;
    // Usamos `lead` con comillas
    try { await db.query("INSERT INTO noticias (title, tag, date, image, `lead`, content, isHero) VALUES (?,?,?,?,?,?,?)", [title, tag, date, image, lead, content, isHero?1:0]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.put('/api/admin/news/:id', authMiddleware, async (req, res) => {
    const { title, tag, date, image, lead, content, isHero } = req.body;
    try { await db.query("UPDATE noticias SET title=?, tag=?, date=?, image=?, `lead`=?, content=?, isHero=? WHERE id=?", [title, tag, date, image, lead, content, isHero?1:0, req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.delete('/api/admin/news/:id', authMiddleware, async (req, res) => {
    try { await db.query("DELETE FROM noticias WHERE id=?", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});

// 2. EQUIPOS
app.post('/api/admin/teams', authMiddleware, async (req, res) => {
    const { name, code, country, jersey, riders } = req.body;
    try { await db.query("INSERT INTO equipos (name, code, country, jersey, riders_json) VALUES (?,?,?,?,?)", [name, code, country, jersey, JSON.stringify(riders)]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.put('/api/admin/teams/:id', authMiddleware, async (req, res) => {
    const { name, code, country, jersey, riders } = req.body;
    try { await db.query("UPDATE equipos SET name=?, code=?, country=?, jersey=?, riders_json=? WHERE id=?", [name, code, country, jersey, JSON.stringify(riders), req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.delete('/api/admin/teams/:id', authMiddleware, async (req, res) => {
    try { await db.query("DELETE FROM equipos WHERE id=?", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});

// 3. CALENDARIO
app.post('/api/admin/calendar', authMiddleware, async (req, res) => {
    const { name, status, date, dateISO, category, details } = req.body;
    try { await db.query("INSERT INTO calendario (name, status, date, dateISO, category, details) VALUES (?,?,?,?,?,?)", [name, status, date, dateISO, category, details]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.put('/api/admin/calendar/:id', authMiddleware, async (req, res) => {
    const { name, status, date, dateISO, category, details } = req.body;
    try { await db.query("UPDATE calendario SET name=?, status=?, date=?, dateISO=?, category=?, details=? WHERE id=?", [name, status, date, dateISO, category, details, req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.delete('/api/admin/calendar/:id', authMiddleware, async (req, res) => {
    try { await db.query("DELETE FROM calendario WHERE id=?", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});

// 4. RANKING
app.post('/api/admin/ranking', authMiddleware, async (req, res) => {
    const { name, team, points, rank, trend, profile } = req.body;
    // Usamos `rank` con comillas
    try { await db.query("INSERT INTO ranking (name, team, points, `rank`, trend, profile) VALUES (?,?,?,?,?,?)", [name, team, points, rank, trend, profile]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.put('/api/admin/ranking/:id', authMiddleware, async (req, res) => {
    const { name, team, points, rank, trend, profile } = req.body;
    try { await db.query("UPDATE ranking SET name=?, team=?, points=?, `rank`=?, trend=?, profile=? WHERE id=?", [name, team, points, rank, trend, profile, req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.delete('/api/admin/ranking/:id', authMiddleware, async (req, res) => {
    try { await db.query("DELETE FROM ranking WHERE id=?", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});

// 5. GLOSARIO
app.post('/api/admin/glossary', authMiddleware, async (req, res) => {
    const { term, cat, definition } = req.body;
    try { await db.query("INSERT INTO glosario (term, cat, definition) VALUES (?,?,?)", [term, cat, definition]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.put('/api/admin/glossary/:id', authMiddleware, async (req, res) => {
    const { term, cat, definition } = req.body;
    try { await db.query("UPDATE glosario SET term=?, cat=?, definition=? WHERE id=?", [term, cat, definition, req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.delete('/api/admin/glossary/:id', authMiddleware, async (req, res) => {
    try { await db.query("DELETE FROM glosario WHERE id=?", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});


// ARCHIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Servidor Velo listo en puerto ${PORT}`); });
