require('dotenv').config(); 
const express = require('express');
const mysql = require('mysql2'); 
const cors = require('cors');
const path = require('path');

const app = express();

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 2. ARCHIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, 'public')));

// 3. CONEXIÓN A BASE DE DATOS
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
        const equipos = results.map(row => {
            try {
                return {
                    ...row,
                    riders: typeof row.riders === 'string' ? JSON.parse(row.riders) : row.riders,
                    stats: typeof row.stats === 'string' ? JSON.parse(row.stats) : row.stats
                };
            } catch (e) { return row; }
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

// --- 🛠️ RUTA SECRETA: REPARAR CALENDARIO 2026 ---
// Ejecuta esto una vez visitando /api/fix-calendar
app.get('/api/fix-calendar', (req, res) => {
    const dropQuery = "DROP TABLE IF EXISTS calendario";
    
    const createQuery = `CREATE TABLE calendario (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        dateISO DATE,
        category VARCHAR(50),
        status VARCHAR(50),
        details JSON
    )`;

    const insertQuery = `INSERT INTO calendario (name, dateISO, category, status, details) VALUES 
        ('Santos Tour Down Under', '2026-01-20', 'WT', 'Finished', '{"type":"Stage Race"}'),
        ('Omloop Het Nieuwsblad', '2026-02-28', 'WT', 'Upcoming', '{"type":"Cobbles"}'),
        ('Strade Bianche', '2026-03-07', 'WT', 'Upcoming', '{"type":"Gravel"}'),
        ('Milano - Sanremo', '2026-03-21', 'MONUMENT', 'Upcoming', '{"type":"Classic"}'),
        ('Ronde van Vlaanderen', '2026-04-05', 'MONUMENT', 'Upcoming', '{"type":"Cobbles"}'),
        ('Paris - Roubaix', '2026-04-12', 'MONUMENT', 'Upcoming', '{"type":"Cobbles"}'),
        ('Amstel Gold Race', '2026-04-19', 'WT', 'Upcoming', '{"type":"Hilly"}'),
        ('Liège - Bastogne - Liège', '2026-04-26', 'MONUMENT', 'Upcoming', '{"type":"Hilly"}'),
        ('Giro d\\'Italia', '2026-05-09', 'GT', 'Upcoming', '{"type":"Stage Race"}'),
        ('Tour de France', '2026-06-27', 'GT', 'Upcoming', '{"type":"Stage Race"}'),
        ('La Vuelta a España', '2026-08-22', 'GT', 'Upcoming', '{"type":"Stage Race"}'),
        ('Il Lombardia', '2026-10-10', 'MONUMENT', 'Upcoming', '{"type":"Hilly"}')`;

    // Ejecutamos en cadena: Borrar -> Crear -> Insertar
    pool.query(dropQuery, (err) => {
        if(err) return res.status(500).send("❌ Error borrando tabla: " + err.message);
        
        pool.query(createQuery, (err) => {
            if(err) return res.status(500).send("❌ Error creando tabla: " + err.message);
            
            pool.query(insertQuery, (err) => {
                if(err) return res.status(500).send("❌ Error insertando datos: " + err.message);
                res.send("✅ CALENDARIO 2026 RESTAURADO Y ACTUALIZADO.");
            });
        });
    });
});

// RUTA POR DEFECTO
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando en puerto ${PORT}`);
});
