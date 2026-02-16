require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();

// --- 1. CONFIGURACIÓN E INICIO ---
console.log(`Fact: Iniciando servidor en entorno ${process.env.NODE_ENV || 'development'}`);
app.use(cors());
app.use(express.json());

// --- 2. MIDDLEWARE DE SEGURIDAD (ADMIN) ---
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

// --- 3. RUTAS DE SISTEMA Y MANTENIMIENTO ---

// Panel de Administración (HTML)
app.get('/admin', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Verificación de integridad de base de datos (Solo crea si falta algo)
app.get('/setup-tables', async (req, res) => {
    try {
        const queries = [
            `CREATE TABLE IF NOT EXISTS noticias (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), tag VARCHAR(50), date VARCHAR(50), image TEXT, \`lead\` TEXT, content TEXT, isHero BOOLEAN DEFAULT 0)`,
            `CREATE TABLE IF NOT EXISTS equipos (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), code VARCHAR(10), country VARCHAR(50), jersey TEXT, riders LONGTEXT)`,
            `CREATE TABLE IF NOT EXISTS calendario (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), status VARCHAR(20), date VARCHAR(50), dateISO DATE, endDateISO DATE, category VARCHAR(10), details LONGTEXT, winner VARCHAR(100))`,
            `CREATE TABLE IF NOT EXISTS ranking (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), team VARCHAR(100), points INT, \`rank\` INT, trend VARCHAR(10), profile LONGTEXT)`,
            `CREATE TABLE IF NOT EXISTS glosario (id INT AUTO_INCREMENT PRIMARY KEY, term VARCHAR(100), cat VARCHAR(50), definition TEXT)`
        ];
        for (const q of queries) { await db.query(q); }
        res.send("✅ Integridad de base de datos verificada.");
    } catch (e) { 
        console.error(e);
        res.status(500).send("❌ Error en mantenimiento: " + e.message); 
    }
});

// --- 4. APIs PÚBLICAS (Backend de la Web) ---

// Noticias
app.get('/api/news', async (req, res) => {
    try { 
        const [rows] = await db.query("SELECT * FROM noticias ORDER BY id DESC"); 
        res.json(rows); 
    } catch(e){ res.status(500).json({error: e.message}); }
});

// Equipos (Parseando el JSON de corredores)
app.get('/api/teams', async (req, res) => {
    try { 
        const [rows] = await db.query("SELECT * FROM equipos"); 
        const data = rows.map(t => ({
            ...t, 
            riders: typeof t.riders === 'string' ? JSON.parse(t.riders || '[]') : t.riders 
        }));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});

// Calendario (Ordenado por fecha)
app.get('/api/calendar', async (req, res) => {
    try { 
        const [rows] = await db.query("SELECT * FROM calendario ORDER BY dateISO ASC");
        const data = rows.map(c => {
            let detailsParsed = {};
            try { 
                detailsParsed = typeof c.details === 'string' ? JSON.parse(c.details || '{}') : (c.details || {}); 
            } catch (e) { detailsParsed = {}; }
            return { ...c, details: detailsParsed };
        });
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});

// Glosario (Adaptando nombres de columnas para el frontend)
app.get('/api/glossary', async (req, res) => {
    try { 
        const [rows] = await db.query("SELECT * FROM glosario ORDER BY term ASC");
        const data = rows.map(row => ({
            id: row.id,
            term: row.term,
            cat: row.cat,
            def: row.definition // Mapeo clave para que el frontend lo lea
        }));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});

// --- 5. APIs PRIVADAS (Gestión de contenido) ---

app.post('/api/admin/news', authMiddleware, async (req, res) => {
    const { title, tag, date, image, lead, content, isHero } = req.body;
    try { 
        await db.query(
            "INSERT INTO noticias (title, tag, date, image, `lead`, content, isHero) VALUES (?,?,?,?,?,?,?)", 
            [title, tag, date, image, lead, content, isHero ? 1 : 0]
        ); 
        res.json({success: true}); 
    } catch(e){ res.status(500).json(e); }
});

// --- 6. ARCHIVOS ESTÁTICOS Y FALLBACK ---

// Servir la carpeta pública (imágenes, estilos, scripts del frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Cualquier ruta no definida devuelve el index.html (para SPAs)
app.get('*', (req, res) => { 
    res.sendFile(path.join(__dirname, 'public', 'index.html')); 
});

// --- 7. ARRANQUE ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Servidor Velo listo y optimizado en puerto ${PORT}`); 
});
