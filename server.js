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
        // Intentamos añadir la columna 'insight'. 
        await db.query("ALTER TABLE glosario ADD COLUMN insight TEXT NULL");
        console.log("✅ Base de datos actualizada: Columna 'insight' creada con éxito.");
    } catch (error) {
        // Si la columna ya existe, MySQL lanzará un error (Duplicate column). Lo ignoramos tranquilamente.
        if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
            console.log("⚡ La columna 'insight' ya existe en la base de datos. Todo OK.");
        } else {
            console.error("⚠️ Aviso al actualizar DB:", error.message);
        }
    }
}
// Ejecutamos la actualización al iniciar el servidor
upgradeDatabase();

// --- AUTO-INSERTAR EQUIPO NSN ---
async function insertNSNTeam() {
    const ridersJSON = '[{"name":"Stephen Williams","country":"🇬🇧","age":29,"type":"Puncher","typeClass":"spec-classic","stats":{"mnt":82,"spr":90,"tt":78,"lla":90,"res":91,"rec":84,"ovr":86}},{"name":"Alexey Lutsenko","country":"🇰🇿","age":33,"type":"GC","typeClass":"spec-gc","stats":{"mnt":92,"spr":67,"tt":81,"lla":75,"res":89,"rec":91,"ovr":85}},{"name":"Corbin Strong","country":"🇳🇿","age":25,"type":"Puncher","typeClass":"spec-sprinter","stats":{"mnt":76,"spr":85,"tt":80,"lla":90,"res":87,"rec":86,"ovr":84}},{"name":"Ethan Vernon","country":"🇬🇧","age":25,"type":"Sprinter","typeClass":"spec-sprinter","stats":{"mnt":66,"spr":94,"tt":71,"lla":89,"res":81,"rec":78,"ovr":83}},{"name":"Joseph Blackmore","country":"🇬🇧","age":22,"type":"GC","typeClass":"spec-gc","stats":{"mnt":88,"spr":69,"tt":78,"lla":76,"res":86,"rec":87,"ovr":82}},{"name":"George Bennett","country":"🇳🇿","age":35,"type":"Escalador","typeClass":"spec-climber","stats":{"mnt":82,"spr":67,"tt":76,"lla":74,"res":81,"rec":85,"ovr":80}},{"name":"Krists Neilands","country":"🇱🇻","age":31,"type":"Cazaetapas","typeClass":"spec-classic","stats":{"mnt":73,"spr":77,"tt":73,"lla":83,"res":86,"rec":81,"ovr":78}},{"name":"Nick Schultz","country":"🇦🇺","age":31,"type":"Escalador","typeClass":"spec-climber","stats":{"mnt":79,"spr":59,"tt":74,"lla":71,"res":76,"rec":81,"ovr":76}},{"name":"Jake Stewart","country":"🇬🇧","age":26,"type":"Clasicomano","typeClass":"spec-classic","stats":{"mnt":72,"spr":79,"tt":71,"lla":82,"res":78,"rec":77,"ovr":76}},{"name":"Hugo Hofstetter","country":"🇫🇷","age":31,"type":"Sprinter","typeClass":"spec-sprinter","stats":{"mnt":55,"spr":85,"tt":63,"lla":82,"res":73,"rec":68,"ovr":76}},{"name":"Matis Louvel","country":"🇫🇷","age":26,"type":"Clasicomano","typeClass":"spec-classic","stats":{"mnt":67,"spr":77,"tt":70,"lla":78,"res":81,"rec":73,"ovr":75}},{"name":"Simon Clarke","country":"🇦🇺","age":39,"type":"Capitán","typeClass":"spec-domestique","stats":{"mnt":66,"spr":63,"tt":74,"lla":77,"res":73,"rec":72,"ovr":73}},{"name":"Tom Van Asbroeck","country":"🇧🇪","age":35,"type":"Clasicomano","typeClass":"spec-classic","stats":{"mnt":67,"spr":77,"tt":71,"lla":78,"res":77,"rec":72,"ovr":73}},{"name":"Lewis Askey","country":"🇬🇧","age":24,"type":"Clasicomano","typeClass":"spec-classic","stats":{"mnt":70,"spr":74,"tt":65,"lla":79,"res":79,"rec":71,"ovr":72}},{"name":"Jan Hirt","country":"🇨🇿","age":35,"type":"Escalador","typeClass":"spec-climber","stats":{"mnt":76,"spr":55,"tt":68,"lla":62,"res":72,"rec":75,"ovr":72}},{"name":"Ryan Mullen","country":"🇮🇪","age":31,"type":"Rodador","typeClass":"spec-domestique","stats":{"mnt":58,"spr":59,"tt":69,"lla":72,"res":72,"rec":71,"ovr":70}},{"name":"Guillaume Boivin","country":"🇨🇦","age":36,"type":"Rodador","typeClass":"spec-domestique","stats":{"mnt":60,"spr":54,"tt":69,"lla":71,"res":71,"rec":69,"ovr":67}},{"name":"Pier-André Coté","country":"🇨🇦","age":28,"type":"Sprinter","typeClass":"spec-sprinter","stats":{"mnt":50,"spr":76,"tt":59,"lla":69,"res":61,"rec":59,"ovr":67}},{"name":"Itamar Einhorn","country":"🇮🇱","age":28,"type":"Sprinter","typeClass":"spec-sprinter","stats":{"mnt":50,"spr":75,"tt":56,"lla":68,"res":61,"rec":60,"ovr":67}},{"name":"Marco Frigo","country":"🇮🇹","age":25,"type":"Cazaetapas","typeClass":"spec-classic","stats":{"mnt":59,"spr":68,"tt":65,"lla":75,"res":75,"rec":67,"ovr":67}},{"name":"Brady Gilmore","country":"🇦🇺","age":24,"type":"Joven","typeClass":"spec-domestique","stats":{"mnt":69,"spr":69,"tt":66,"lla":68,"res":64,"rec":68,"ovr":67}},{"name":"Oded Kogut","country":"🇮🇱","age":24,"type":"Sprinter","typeClass":"spec-sprinter","stats":{"mnt":50,"spr":74,"tt":60,"lla":74,"res":60,"rec":64,"ovr":67}},{"name":"Pau Martí","country":"🇪🇸","age":21,"type":"Joven","typeClass":"spec-climber","stats":{"mnt":69,"spr":70,"tt":65,"lla":66,"res":65,"rec":65,"ovr":67}},{"name":"Alessandro Pinarello","country":"🇮🇹","age":22,"type":"Joven","typeClass":"spec-classic","stats":{"mnt":69,"spr":70,"tt":65,"lla":64,"res":65,"rec":64,"ovr":67}},{"name":"Nadav Raisberg","country":"🇮🇱","age":24,"type":"Rodador","typeClass":"spec-domestique","stats":{"mnt":59,"spr":60,"tt":64,"lla":69,"res":66,"rec":66,"ovr":67}},{"name":"Dion Smith","country":"🇳🇿","age":32,"type":"Puncher","typeClass":"spec-classic","stats":{"mnt":60,"spr":69,"tt":65,"lla":75,"res":75,"rec":68,"ovr":67}},{"name":"Thomas Stewart","country":"🇬🇧","age":36,"type":"Rodador","typeClass":"spec-domestique","stats":{"mnt":60,"spr":60,"tt":64,"lla":74,"res":66,"rec":67,"ovr":67}},{"name":"Floris Van Tricht","country":"🇧🇪","age":24,"type":"Clasicomano","typeClass":"spec-classic","stats":{"mnt":64,"spr":71,"tt":61,"lla":75,"res":72,"rec":68,"ovr":67}}]';

    const values = [
        17, 
        'NSN Cycling Team', 
        'NSN', 
        '🇨🇭', 
        'assets/equipos/nsn.png', 
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
        console.log("✅ Equipo NSN Cycling Team inyectado correctamente en la base de datos.");
    } catch (e) {
        console.error("⚠️ Error inyectando el equipo NSN:", e.message);
    }
}
// Ejecutar la inserción
insertNSNTeam();


// --- 7. SERVIDOR ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Servidor Velo Admin Universal listo en puerto ${PORT}`); 
});
