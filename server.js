require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();

console.log("Fact: Servidor Velo-Insights Iniciado");

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

// 3. ZONA ADMIN
app.get('/admin', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- 4. API MAESTRA DE ADMINISTRACIÓN ---

// A) BORRAR
app.delete('/api/admin/:table/:id', authMiddleware, async (req, res) => {
    const { table, id } = req.params;
    const allowed = ['noticias', 'calendario', 'equipos', 'glosario', 'ranking'];
    
    if (!allowed.includes(table)) return res.status(403).json({error: "Tabla no permitida"});

    try {
        await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
        res.json({ success: true, msg: `Elemento ${id} borrado de ${table}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// B) EDITAR (CON CORRECCIÓN PARA GLOSARIO)
app.put('/api/admin/:table/:id', authMiddleware, async (req, res) => {
    const { table, id } = req.params;
    let data = req.body; // Usamos 'let' para poder modificar los datos
    const allowed = ['noticias', 'calendario', 'equipos', 'glosario', 'ranking'];

    if (!allowed.includes(table)) return res.status(403).json({error: "Tabla no permitida"});

    // --- PARCHE DE TRADUCCIÓN (SOLUCIÓN AL ERROR) ---
    // Si estamos en glosario y llega 'def', lo cambiamos a 'definition'
    if (table === 'glosario' && data.def !== undefined) {
        data.definition = data.def; // Copiamos el valor a la columna correcta
        delete data.def;            // Borramos la columna incorrecta
    }
    // ------------------------------------------------

    const keys = Object.keys(data);
    const values = Object.values(data);
    
    if (keys.length === 0) return res.status(400).json({error: "No hay datos para actualizar"});

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;

    try {
        await db.query(sql, [...values, id]);
        res.json({ success: true, msg: `Elemento ${id} actualizado en ${table}` });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// C) CREAR
app.post('/api/admin/create/:table', authMiddleware, async (req, res) => {
    const { table } = req.params;
    let data = req.body;
    const allowed = ['noticias', 'calendario', 'equipos', 'glosario'];
    if (!allowed.includes(table)) return res.status(403).json({error: "Tabla no permitida"});

    // Parche también para crear
    if (table === 'glosario' && data.def !== undefined) {
        data.definition = data.def;
        delete data.def;
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    try {
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        await db.query(sql, values);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


// --- 5. APIs PÚBLICAS ---

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
        const data = rows.map(r => ({ id: r.id, term: r.term, cat: r.cat, def: r.definition }));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});

// --- 6. SERVIDOR ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Servidor Velo Admin Universal listo en puerto ${PORT}`); 
});
