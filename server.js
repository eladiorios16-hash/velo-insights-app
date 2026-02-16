require('dotenv').config(); 
const express = require('express');
const mysql = require('mysql2'); 
const cors = require('cors');
const path = require('path');

const app = express();

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json()); // Vital para recibir datos JSON del admin

// 2. CONEXIÓN A BASE DE DATOS
const pool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
    port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test de conexión
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Error FATAL conectando a MySQL:", err.code, err.message);
    } else {
        console.log("✅ Conectado a la Base de Datos correctamente.");
        connection.release();
    }
});

// --- SEGURIDAD: EL PORTERO (BASIC AUTH) ---
const authMiddleware = (req, res, next) => {
    // CAMBIA AQUÍ TU CONTRASEÑA SI QUIERES
    const auth = { login: 'admin', password: 'velo2026' }; 

    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
        return next(); // Contraseña correcta, pasa
    }

    // Si falla, pide contraseña
    res.set('WWW-Authenticate', 'Basic realm="Area Restringida Velo"');
    res.status(401).send('⛔ ACCESO DENEGADO: Credenciales incorrectas.');
};

// --- RUTA DEL ADMIN (PROTEGIDA) ---
// Importante: admin.html debe estar en la carpeta raíz (junto a server.js), NO en public
app.get('/admin', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});


// --- RUTAS DE LA API (LEER DATOS - PÚBLICAS) ---

// 1. EQUIPOS
app.get('/api/teams', (req, res) => {
    pool.query("SELECT * FROM equipos", (err, results) => {
        if (err) return res.status(500).json({ error: "Error BD" });
        const equipos = results.map(row => {
            try {
                return {
                    ...row,
                    riders: typeof row.riders_json === 'string' ? JSON.parse(row.riders_json) : (row.riders || []),
                    // Fallback por si en la BD se llama riders o riders_json
                };
            } catch (e) { return row; }
        });
        res.json(equipos);
    });
});

// 2. NOTICIAS
app.get('/api/news', (req, res) => {
    pool.query("SELECT * FROM noticias ORDER BY id DESC LIMIT 20", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 3. CALENDARIO
app.get('/api/calendar', (req, res) => {
    pool.query("SELECT * FROM calendario ORDER BY dateISO ASC", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 4. RANKING
app.get('/api/ranking', (req, res) => {
    pool.query("SELECT * FROM ranking ORDER BY points DESC LIMIT 50", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 5. GLOSARIO
app.get('/api/glossary', (req, res) => {
    pool.query("SELECT * FROM glosario ORDER BY term ASC", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});


// --- RUTAS DE ADMINISTRACIÓN (ESCRIBIR DATOS - PROTEGIDAS) ---
// También protegemos estas rutas para que nadie envíe datos falsos con Postman

// A. PUBLICAR NOTICIA
app.post('/api/admin/news', authMiddleware, (req, res) => {
    const { title, tag, date, image, lead } = req.body;
    const sql = "INSERT INTO noticias (title, tag, date, image, lead) VALUES (?, ?, ?, ?, ?)";
    
    pool.query(sql, [title, tag, date, image, lead], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error al guardar noticia" });
        }
        res.json({ success: true, id: result.insertId });
    });
});

// B. AÑADIR EQUIPO
app.post('/api/admin/teams', authMiddleware, (req, res) => {
    const { name, code, country, jersey, riders } = req.body;
    // Aseguramos que riders se guarde como string JSON
    const ridersString = typeof riders === 'object' ? JSON.stringify(riders) : riders;
    
    const sql = "INSERT INTO equipos (name, code, country, jersey, riders_json) VALUES (?, ?, ?, ?, ?)";
    
    pool.query(sql, [name, code, country, jersey, ridersString], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// C. AÑADIR GLOSARIO
app.post('/api/admin/glossary', authMiddleware, (req, res) => {
    const { term, definition } = req.body;
    const sql = "INSERT INTO glosario (term, definition) VALUES (?, ?)";
    
    pool.query(sql, [term, definition], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});


// 3. ARCHIVOS ESTÁTICOS (Frontend público)
// Ponemos esto al final para que no interfiera con las rutas de API
app.use(express.static(path.join(__dirname, 'public')));

// RUTA POR DEFECTO (Para Single Page Apps o 404)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando en puerto ${PORT}`);
});
