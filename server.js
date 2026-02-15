require('dotenv').config(); 
const express = require('express');
const mysql = require('mysql2'); 
const cors = require('cors');
const path = require('path');

const app = express();

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 2. ARCHIVOS ESTÁTICOS (HTML, CSS, JS)
// IMPORTANTE: Debes mover tus .html, .css y carpetas 'assets' dentro de una carpeta llamada 'public'
app.use(express.static(path.join(__dirname, 'public')));

// 3. CONEXIÓN A BASE DE DATOS (Robustez para Railway)
// Usamos 'createPool' en lugar de 'createConnection' para que no se corte la conexión
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

// Prueba de conexión inicial
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Error FATAL conectando a MySQL:", err.code, err.message);
    } else {
        console.log("✅ Conectado a la Base de Datos correctamente.");
        connection.release();
    }
});

// --- RUTAS DE LA API ---

// 1. EQUIPOS
app.get('/api/teams', (req, res) => {
    pool.query("SELECT * FROM equipos", (err, results) => {
        if (err) {
            console.error("Error en equipos:", err);
            return res.status(500).json({ error: "Error obteniendo equipos" });
        }
        
        // Procesamos los campos JSON de forma segura
        const equipos = results.map(row => {
            try {
                return {
                    ...row,
                    riders: typeof row.riders === 'string' ? JSON.parse(row.riders) : row.riders,
                    stats: typeof row.stats === 'string' ? JSON.parse(row.stats) : row.stats
                };
            } catch (e) {
                console.warn(`Error parseando JSON para equipo ${row.id}`);
                return row;
            }
        });
        res.json(equipos);
    });
});

// 2. NOTICIAS
app.get('/api/news', (req, res) => {
    pool.query("SELECT * FROM noticias ORDER BY date DESC LIMIT 20", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 3. CALENDARIO
app.get('/api/calendar', (req, res) => {
    pool.query("SELECT * FROM calendario ORDER BY dateISO ASC", (err, results) => {
        if (err) return res.status(500).json(err);
        
        const calendar = results.map(row => {
            try {
                return {
                    ...row,
                    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
                };
            } catch (e) { return row; }
        });
        res.json(calendar);
    });
});

// 4. RANKING
app.get('/api/ranking', (req, res) => {
    // Asumimos que la columna de puntos se llama 'points' o 'puntos'
    pool.query("SELECT * FROM ranking ORDER BY points DESC LIMIT 50", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 5. GLOSARIO
app.get('/api/glossary', (req, res) => {
    pool.query("SELECT * FROM glossary ORDER BY term ASC", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// RUTA POR DEFECTO (Para evitar errores 404 en la raíz)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Velo Insights rodando en puerto ${PORT}`);
});
