require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db'); // Importamos la conexión del archivo db.js

const app = express();

// 1. CONFIGURACIÓN BÁSICA
app.use(cors());
app.use(express.json()); // Permite recibir JSON en los POST/PUT

// 2. MIDDLEWARE DE SEGURIDAD (EL PORTERO)
const authMiddleware = (req, res, next) => {
    // CAMBIA AQUÍ TU CONTRASEÑA SI QUIERES
    const auth = { login: 'admin', password: 'velo2026' }; 

    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
        return next();
    }

    res.set('WWW-Authenticate', 'Basic realm="Area Restringida Velo"');
    res.status(401).send('⛔ ACCESO DENEGADO: Credenciales incorrectas.');
};

// 3. RUTA DEL PANEL DE ADMIN (PROTEGIDA)
app.get('/admin', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});


// ==========================================
//  API PÚBLICA (SOLO LECTURA - GET)
// ==========================================

// A. NOTICIAS
app.get('/api/news', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM noticias ORDER BY id DESC LIMIT 50");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// B. EQUIPOS (Parsea los ciclistas)
app.get('/api/teams', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM equipos");
        const teams = rows.map(t => ({
            ...t,
            // Intenta leer 'riders_json', si falla usa array vacío
            riders: typeof t.riders_json === 'string' ? JSON.parse(t.riders_json || '[]') : t.riders_json
        }));
        res.json(teams);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// C. CALENDARIO (Parsea etapas/detalles)
app.get('/api/calendar', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM calendario ORDER BY dateISO ASC");
        const calendar = rows.map(c => ({
            ...c,
            details: typeof c.details === 'string' ? JSON.parse(c.details || '{}') : c.details
        }));
        res.json(calendar);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// D. RANKING
app.get('/api/ranking', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM ranking ORDER BY points DESC LIMIT 100");
        const ranking = rows.map(r => ({
            ...r,
            profile: typeof r.profile === 'string' ? JSON.parse(r.profile || '{}') : r.profile
        }));
        res.json(ranking);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// E. GLOSARIO
app.get('/api/glossary', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM glosario ORDER BY term ASC");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==========================================
//  API ADMIN (ESCRITURA - PROTEGIDAS)
// ==========================================

// --- 1. NOTICIAS (Crear, Editar, Borrar) ---
app.post('/api/admin/news', authMiddleware, async (req, res) => {
    const { title, tag, date, image, lead, content, isHero } = req.body;
    try {
        const [result] = await db.query(
            "INSERT INTO noticias (title, tag, date, image, lead, content, isHero) VALUES (?,?,?,?,?,?,?)",
            [title, tag, date, image, lead, content, isHero ? 1 : 0]
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/news/:id', authMiddleware, async (req, res) => {
    const { title, tag, date, image, lead, content, isHero } = req.body;
    try {
        await db.query(
            "UPDATE noticias SET title=?, tag=?, date=?, image=?, lead=?, content=?, isHero=? WHERE id=?",
            [title, tag, date, image, lead, content, isHero ? 1 : 0, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/news/:id', authMiddleware, async (req, res) => {
    try {
        await db.query("DELETE FROM noticias WHERE id=?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- 2. CALENDARIO (Crear, Editar, Borrar) ---
app.post('/api/admin/calendar', authMiddleware, async (req, res) => {
    const { name, date, dateISO, status, category, details } = req.body; // details ya es string JSON
    try {
        const [result] = await db.query(
            "INSERT INTO calendario (name, date, dateISO, status, category, details) VALUES (?,?,?,?,?,?)",
            [name, date, dateISO, status, category, details]
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/calendar/:id', authMiddleware, async (req, res) => {
    const { name, date, dateISO, status, category, details } = req.body;
    try {
        await db.query(
            "UPDATE calendario SET name=?, date=?, dateISO=?, status=?, category=?, details=? WHERE id=?",
            [name, date, dateISO, status, category, details, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/calendar/:id', authMiddleware, async (req, res) => {
    try {
        await db.query("DELETE FROM calendario WHERE id=?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- 3. RANKING (Crear, Editar, Borrar) ---
app.post('/api/admin/ranking', authMiddleware, async (req, res) => {
    const { name, team, points, rank, trend, profile } = req.body;
    try {
        const [result] = await db.query(
            "INSERT INTO ranking (name, team, points, rank, trend, profile) VALUES (?,?,?,?,?,?)",
            [name, team, points, rank, trend, profile] // profile viene como JSON string
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/ranking/:id', authMiddleware, async (req, res) => {
    const { name, team, points, rank, trend, profile } = req.body;
    try {
        await db.query(
            "UPDATE ranking SET name=?, team=?, points=?, rank=?, trend=?, profile=? WHERE id=?",
            [name, team, points, rank, trend, profile, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/ranking/:id', authMiddleware, async (req, res) => {
    try {
        await db.query("DELETE FROM ranking WHERE id=?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- 4. GLOSARIO (Crear, Editar, Borrar) ---
app.post('/api/admin/glossary', authMiddleware, async (req, res) => {
    const { term, cat, definition } = req.body; // Ojo: en BD puede llamarse 'cat' o 'category'
    try {
        const [result] = await db.query(
            "INSERT INTO glosario (term, cat, definition) VALUES (?,?,?)",
            [term, cat, definition]
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/glossary/:id', authMiddleware, async (req, res) => {
    const { term, cat, definition } = req.body;
    try {
        await db.query(
            "UPDATE glosario SET term=?, cat=?, definition=? WHERE id=?",
            [term, cat, definition, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/glossary/:id', authMiddleware, async (req, res) => {
    try {
        await db.query("DELETE FROM glosario WHERE id=?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// 5. STATIC FILES & FALLBACK
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Velo listo en puerto ${PORT}`);
});
