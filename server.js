require('dotenv').config(); // 1. Carga las variables de entorno ocultas

const express = require('express');
const mysql = require('mysql2'); 
const cors = require('cors');

const app = express();
app.use(cors());

// 2. Servir los archivos de la web (HTML, CSS, imágenes) desde la carpeta 'public'
app.use(express.static('public'));

// 3. CONEXIÓN A LA BASE DE DATOS (Segura y dinámica)
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) console.error("❌ Error conectando a MySQL:", err);
    else console.log("✅ Conectado a la Base de Datos (vía .env)");
});

// --- RUTAS DE LA API ---

// EQUIPOS
app.get('/api/teams', (req, res) => {
    db.query("SELECT * FROM equipos", (err, results) => {
        if (err) return res.status(500).json(err);
        
        // Convertir el JSON de la columna 'riders'
        const equipos = results.map(row => ({
            ...row,
            riders: typeof row.riders === 'string' ? JSON.parse(row.riders) : row.riders
        }));
        res.json(equipos);
    });
});

// NOTICIAS
app.get('/api/news', (req, res) => {
    db.query("SELECT * FROM noticias ORDER BY id DESC", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// CALENDARIO
app.get('/api/calendar', (req, res) => {
    db.query("SELECT * FROM calendario ORDER BY dateISO ASC", (err, results) => {
        if (err) return res.status(500).json(err);
        const calendar = results.map(row => ({
            ...row,
            details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
        }));
        res.json(calendar);
    });
});

// RANKING
app.get('/api/ranking', (req, res) => {
    db.query("SELECT * FROM ranking ORDER BY rank ASC", (err, results) => {
        if (err) return res.status(500).json(err);
        const ranking = results.map(row => ({
            ...row,
            profile: typeof row.profile === 'string' ? JSON.parse(row.profile) : row.profile
        }));
        res.json(ranking);
    });
});

// GLOSARIO
app.get('/api/glossary', (req, res) => {
    db.query("SELECT * FROM glossary ORDER BY term ASC", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// INICIAR SERVIDOR (Puerto dinámico para despliegue en la nube)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando en el puerto ${PORT}`);
});
