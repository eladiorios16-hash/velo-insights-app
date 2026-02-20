require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();

console.log("Fact: Servidor Velo-Insights Iniciado (Version Final Blindada)");

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

// B) EDITAR
app.put('/api/admin/:table/:id', authMiddleware, async (req, res) => {
    const { table, id } = req.params;
    let data = req.body; 
    const allowed = ['noticias', 'calendario', 'equipos', 'glosario', 'ranking'];

    if (!allowed.includes(table)) return res.status(403).json({error: "Tabla no permitida"});

    // Parches
    if (table === 'glosario' && data.def !== undefined) {
        data.definition = data.def; 
        delete data.def;            
    }
    if (data.isHero === '') {
        data.isHero = 0;
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    
    if (keys.length === 0) return res.status(400).json({error: "No hay datos para actualizar"});

    const setClause = keys.map(key => `\`${key}\` = ?`).join(', ');
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

    // Parches
    if (table === 'glosario' && data.def !== undefined) {
        data.definition = data.def;
        delete data.def;
    }
    if (data.isHero === '') {
        data.isHero = 0;
    }

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
        const data = rows.map(r => ({ id: r.id, term: r.term, cat: r.cat, def: r.definition, insight: r.insight }));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});

// --- 6. ACTUALIZACIÓN AUTOMÁTICA DE BASE DE DATOS ---
async function upgradeDatabase() {
    try {
        await db.query("ALTER TABLE glosario ADD COLUMN insight TEXT NULL");
        console.log("✅ Base de datos actualizada: Columna 'insight' creada con éxito.");
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
            console.log("⚡ La columna 'insight' ya existe en la base de datos. Todo OK.");
        } else {
            console.error("⚠️ Aviso al actualizar DB:", error.message);
        }
    }
}
upgradeDatabase();

// --- AUTO-INSERTAR EQUIPO LIDL - TREK ---
async function insertLidlTrekTeam() {
    const ridersJSON = JSON.stringify([
        { "name": "Juan Ayuso", "country": "🇪🇸", "age": 23, "type": "GC", "typeClass": "spec-gc", "stats": { "mnt": 92, "spr": 75, "tt": 88, "lla": 80, "res": 90, "rec": 91, "ovr": 90 } },
        { "name": "Mads Pedersen", "country": "🇩🇰", "age": 30, "type": "Clasicomano", "typeClass": "spec-classic", "stats": { "mnt": 75, "spr": 93, "tt": 86, "lla": 95, "res": 94, "rec": 88, "ovr": 92 } },
        { "name": "Jonathan Milan", "country": "🇮🇹", "age": 25, "type": "Sprinter", "typeClass": "spec-sprinter", "stats": { "mnt": 65, "spr": 96, "tt": 82, "lla": 92, "res": 84, "rec": 82, "ovr": 89 } },
        { "name": "Mattias Skjelmose", "country": "🇩🇰", "age": 25, "type": "GC", "typeClass": "spec-gc", "stats": { "mnt": 88, "spr": 78, "tt": 87, "lla": 82, "res": 88, "rec": 86, "ovr": 88 } },
        { "name": "Giulio Ciccone", "country": "🇮🇹", "age": 31, "type": "Escalador", "typeClass": "spec-climber", "stats": { "mnt": 90, "spr": 72, "tt": 65, "lla": 70, "res": 85, "rec": 84, "ovr": 85 } },
        { "name": "Tao Geoghegan Hart", "country": "🇬🇧", "age": 30, "type": "GC", "typeClass": "spec-gc", "stats": { "mnt": 87, "spr": 70, "tt": 82, "lla": 75, "res": 85, "rec": 84, "ovr": 84 } },
        { "name": "Lennard Kämna", "country": "🇩🇪", "age": 29, "type": "Cazaetapas", "typeClass": "spec-climber", "stats": { "mnt": 85, "spr": 68, "tt": 86, "lla": 80, "res": 83, "rec": 82, "ovr": 84 } },
        { "name": "Toms Skujins", "country": "🇱🇻", "age": 34, "type": "Clasicomano", "typeClass": "spec-classic", "stats": { "mnt": 76, "spr": 78, "tt": 78, "lla": 85, "res": 88, "rec": 85, "ovr": 83 } },
        { "name": "Søren Kragh Andersen", "country": "🇩🇰", "age": 31, "type": "Clasicomano", "typeClass": "spec-classic", "stats": { "mnt": 72, "spr": 82, "tt": 83, "lla": 88, "res": 84, "rec": 80, "ovr": 83 } },
        { "name": "Thibau Nys", "country": "🇧🇪", "age": 23, "type": "Puncher", "typeClass": "spec-classic", "stats": { "mnt": 78, "spr": 86, "tt": 72, "lla": 82, "res": 81, "rec": 80, "ovr": 82 } },
        { "name": "Mathias Vacek", "country": "🇨🇿", "age": 23, "type": "All-Rounder", "typeClass": "spec-classic", "stats": { "mnt": 75, "spr": 80, "tt": 84, "lla": 85, "res": 82, "rec": 80, "ovr": 82 } },
        { "name": "Matteo Sobrero", "country": "🇮🇹", "age": 28, "type": "TT", "typeClass": "spec-tt", "stats": { "mnt": 78, "spr": 70, "tt": 86, "lla": 82, "res": 80, "rec": 81, "ovr": 81 } },
        { "name": "Andrea Bagioli", "country": "🇮🇹", "age": 26, "type": "Puncher", "typeClass": "spec-classic", "stats": { "mnt": 80, "spr": 84, "tt": 70, "lla": 78, "res": 82, "rec": 80, "ovr": 81 } },
        { "name": "Simone Consonni", "country": "🇮🇹", "age": 31, "type": "Lanzador", "typeClass": "spec-sprinter", "stats": { "mnt": 60, "spr": 88, "tt": 70, "lla": 82, "res": 75, "rec": 76, "ovr": 80 } },
        { "name": "Patrick Konrad", "country": "🇦🇹", "age": 34, "type": "Escalador", "typeClass": "spec-climber", "stats": { "mnt": 80, "spr": 72, "tt": 74, "lla": 75, "res": 80, "rec": 81, "ovr": 79 } },
        { "name": "Quinn Simmons", "country": "🇺🇸", "age": 24, "type": "Clasicomano", "typeClass": "spec-classic", "stats": { "mnt": 70, "spr": 78, "tt": 75, "lla": 86, "res": 82, "rec": 78, "ovr": 79 } },
        { "name": "Albert Withen Philipsen", "country": "🇩🇰", "age": 19, "type": "Joven", "typeClass": "spec-gc", "stats": { "mnt": 72, "spr": 80, "tt": 82, "lla": 80, "res": 76, "rec": 78, "ovr": 78 } },
        { "name": "Max Walscheid", "country": "🇩🇪", "age": 32, "type": "Rodador", "typeClass": "spec-domestique", "stats": { "mnt": 55, "spr": 84, "tt": 82, "lla": 88, "res": 76, "rec": 72, "ovr": 78 } },
        { "name": "Bauke Mollema", "country": "🇳🇱", "age": 39, "type": "Capitán", "typeClass": "spec-classic", "stats": { "mnt": 78, "spr": 68, "tt": 75, "lla": 76, "res": 82, "rec": 80, "ovr": 78 } },
        { "name": "Sam Oomen", "country": "🇳🇱", "age": 30, "type": "Escalador", "typeClass": "spec-climber", "stats": { "mnt": 80, "spr": 60, "tt": 72, "lla": 74, "res": 80, "rec": 78, "ovr": 77 } },
        { "name": "Carlos Verona", "country": "🇪🇸", "age": 33, "type": "Escalador", "typeClass": "spec-climber", "stats": { "mnt": 82, "spr": 60, "tt": 68, "lla": 70, "res": 80, "rec": 78, "ovr": 77 } },
        { "name": "Edward Theuns", "country": "🇧🇪", "age": 34, "type": "Clasicomano", "typeClass": "spec-classic", "stats": { "mnt": 62, "spr": 82, "tt": 70, "lla": 84, "res": 78, "rec": 75, "ovr": 77 } },
        { "name": "Tim Torn Teutenberg", "country": "🇩🇪", "age": 23, "type": "Sprinter", "typeClass": "spec-sprinter", "stats": { "mnt": 60, "spr": 84, "tt": 74, "lla": 80, "res": 75, "rec": 74, "ovr": 77 } },
        { "name": "Mathias Norsgaard", "country": "🇩🇰", "age": 28, "type": "Rodador", "typeClass": "spec-domestique", "stats": { "mnt": 60, "spr": 65, "tt": 82, "lla": 86, "res": 78, "rec": 75, "ovr": 76 } },
        { "name": "Julien Bernard", "country": "🇫🇷", "age": 33, "type": "Escalador", "typeClass": "spec-climber", "stats": { "mnt": 76, "spr": 65, "tt": 72, "lla": 75, "res": 78, "rec": 76, "ovr": 75 } },
        { "name": "Amanuel Ghebreigzabhier", "country": "🇪🇷", "age": 31, "type": "Escalador", "typeClass": "spec-climber", "stats": { "mnt": 78, "spr": 60, "tt": 68, "lla": 70, "res": 76, "rec": 75, "ovr": 74 } },
        { "name": "Jakob Söderqvist", "country": "🇸🇪", "age": 22, "type": "Rodador", "typeClass": "spec-domestique", "stats": { "mnt": 65, "spr": 65, "tt": 80, "lla": 82, "res": 75, "rec": 74, "ovr": 74 } },
        { "name": "Jacopo Mosca", "country": "🇮🇹", "age": 32, "type": "Gregario", "typeClass": "spec-domestique", "stats": { "mnt": 65, "spr": 65, "tt": 70, "lla": 80, "res": 76, "rec": 74, "ovr": 73 } },
        { "name": "Otto Vergaerde", "country": "🇧🇪", "age": 31, "type": "Gregario", "typeClass": "spec-domestique", "stats": { "mnt": 60, "spr": 65, "tt": 68, "lla": 82, "res": 76, "rec": 74, "ovr": 73 } }
    ]);

    const values = [
        18, 
        'Lidl - Trek', 
        'LTK', 
        '🇺🇸', 
        'assets/equipos/lidl.png', 
        ridersJSON
    ];

    const sql = `
        INSERT INTO equipos (id, name, code, country, jersey, riders) 
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        name = VALUES(name), 
        code = VALUES(code),
        country = VALUES(country),
        jersey = VALUES(jersey),
        riders = VALUES(riders)
    `;

    try {
        await db.query(sql, values);
        console.log("✅ Equipo Lidl - Trek inyectado correctamente en la base de datos.");
    } catch (e) {
        console.error("⚠️ Error inyectando el equipo Lidl - Trek:", e.message);
    }
}
insertLidlTrekTeam();


// --- 7. SERVIDOR ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Servidor Velo Admin Universal listo en puerto ${PORT}`); 
});
