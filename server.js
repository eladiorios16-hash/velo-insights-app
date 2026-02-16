require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();

// --- VALIDACIÓN DE VARIABLES ---
console.log("Fact: Comprobando configuración de base de datos...");
console.log(`Fact: Host: ${process.env.MYSQLHOST || 'No definido'}`);

// 1. CONFIGURACIÓN
app.use(cors());
app.use(express.json());

// 2. SEGURIDAD (Basic Auth para Admin)
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

// 3. RUTAS DE SISTEMA
app.get('/admin', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- RUTA DE MANTENIMIENTO (TABLAS) ---
app.get('/setup-tables', async (req, res) => {
    try {
        const queries = [
            `CREATE TABLE IF NOT EXISTS noticias (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255), tag VARCHAR(50), date VARCHAR(50), 
                image TEXT, \`lead\` TEXT, content TEXT, isHero BOOLEAN DEFAULT 0
            )`,
            `CREATE TABLE IF NOT EXISTS equipos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100), code VARCHAR(10), country VARCHAR(50), 
                jersey TEXT, riders_json LONGTEXT
            )`,
            `CREATE TABLE IF NOT EXISTS calendario (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100), status VARCHAR(20), date VARCHAR(50), 
                dateISO DATE, endDateISO DATE, category VARCHAR(10), details LONGTEXT, winner VARCHAR(100)
            )`,
            `CREATE TABLE IF NOT EXISTS ranking (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100), team VARCHAR(100), points INT, 
                \`rank\` INT, trend VARCHAR(10), profile LONGTEXT
            )`,
            `CREATE TABLE IF NOT EXISTS glosario (
                id INT AUTO_INCREMENT PRIMARY KEY,
                term VARCHAR(100), cat VARCHAR(50), definition TEXT
            )`
        ];
        for (const q of queries) { await db.query(q); }
        res.send("✅ Tablas verificadas/reparadas.");
    } catch (e) { res.status(500).send("❌ Error: " + e.message); }
});

// --- RUTA DE CARGA DE GLOSARIO ---
app.get('/restore-glossary', async (req, res) => {
    try {
        await db.query("TRUNCATE TABLE glosario");
        const sql = `
            INSERT INTO glosario (id, term, cat, definition) VALUES
            (1, 'FTP', 'fisiologia', 'Functional Threshold Power. Estimación de la máxima potencia media (en vatios) que un ciclista puede mantener de forma constante durante una hora. Es un indicador clave de rendimiento.'),
            (2, 'W/kg', 'fisiologia', 'Relación potencia-peso. Clave en montaña.'),
            (3, 'VO2 Max', 'fisiologia', 'El volumen máximo de oxígeno que el cuerpo puede procesar durante el ejercicio intenso. Es un indicador genético del potencial aeróbico de un atleta.'),
            (4, 'VAM', 'fisiologia', 'Velocidad Ascensional Media (m/h). Mide la velocidad vertical pura.'),
            (5, 'Tubeless', 'mecanica', 'Sistema de neumáticos sin cámara de aire interna. Utiliza un líquido sellante para tapar automáticamente pequeños pinchazos y permite rodar a presiones más bajas para mayor tracción.'),
            (6, 'CdA', 'mecanica', 'Coeficiente de resistencia aerodinámica.'),
            (7, 'Hookless', 'mecanica', 'Llantas de paredes rectas sin gancho.'),
            (8, 'Abanico', 'tactica', 'Formación táctica que adopta un grupo de ciclistas para protegerse del viento lateral, escalonándose diagonalmente para reducir la resistencia.'),
            (9, 'Treno', 'tactica', 'Tren de lanzamiento para el sprint.'),
            (10, 'Gregario', 'rol', 'Ciclista cuya función principal es trabajar para el líder de su equipo, protegiéndolo del viento, suministrándole avituallamiento o marcando el ritmo.'),
            (11, 'Puncheur', 'rol', 'Corredor explosivo especializado en muros cortos.'),
            (12, 'Etapa reina', 'tactica', 'La jornada más difícil y prestigiosa de una carrera por etapas, caracterizada por tener los puertos de montaña más duros y decisivos.'),
            (13, 'SPRINT', 'tactica', 'Aceleración explosiva y máxima velocidad que realiza un ciclista en los metros finales de una carrera para disputar la victoria.'),
            (14, 'MAILLOT', 'rol', 'Camiseta técnica de ciclismo. En competición, los colores específicos suelen identificar a los líderes de las distintas clasificaciones (ej. amarillo, verde, arcoíris).'),
            (15, 'PAJARA', 'fisiologia', 'Colapso físico repentino causado por el agotamiento de las reservas de glucógeno en el cuerpo, resultando en una pérdida drástica de energía y fuerza'),
            (16, 'GRUPETO', 'tactica', 'Grupo de ciclistas que se queda rezagado en las etapas de montaña y rueda junto para asegurarse de llegar dentro del tiempo límite de control.'),
            (17, 'ESCAPADA(FUGA)', 'tactica', 'Acción en la que uno o varios ciclistas se adelantan al pelotón principal con la intención de ganar la carrera o una etapa.'),
            (18, 'JEFE DE FILAS ( LIDER)', 'rol', 'Es el ciclista designado para ganar la clasificación general o la carrera. Todo el equipo trabaja para él.'),
            (19, 'ESCALADOR', 'rol', 'Especialista en las etapas de alta montaña. Su objetivo es ganar en cimas o distanciar rivales en pendientes pronunciadas.'),
            (20, 'SPRINTER(VELOCISTA)', 'rol', 'Encargado de disputar las victorias en etapas llanas con llegadas masivas.'),
            (21, 'Lanzador (Lead-out)', 'rol', 'El último hombre del "treno" antes del sprint. Su tarea es colocar al sprinter en la posición perfecta y a máxima velocidad a falta de 200m.'),
            (22, 'RODADOR', 'rol', 'Especialista en terreno llano u ondulado. Mantiene un ritmo alto y constante durante muchos kilómetros.'),
            (23, 'CONTRARELOJISTA', 'rol', 'Especialista en las pruebas contra el crono (individuales o por equipos).'),
            (24, 'CAZA-ETAPAS', 'rol', 'Ciclista combativo que busca constantemente entrar en fugas para ganar una etapa "a la heroica".'),
            (25, 'PELOTON', 'tactica', 'Grupo principal y más numeroso de ciclistas en una carrera.');
        `;
        await db.query(sql);
        res.send("✅ Glosario (25 términos) cargado correctamente.");
    } catch (e) { res.status(500).send("❌ Error cargando glosario: " + e.message); }
});

// --- APIS PÚBLICAS (CORREGIDAS) ---
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
        const [rows] = await db.query("SELECT * FROM calendario ORDER BY dateISO ASC");
        const data = rows.map(c => {
            let detailsParsed = {};
            try { detailsParsed = typeof c.details === 'string' ? JSON.parse(c.details || '{}') : (c.details || {}); } 
            catch (e) { detailsParsed = {}; }
            return { ...c, details: detailsParsed };
        });
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});

// API GLOSARIO CORREGIDA (SOLUCIÓN AL UNDEFINED)
app.get('/api/glossary', async (req, res) => {
    try { 
        const [rows] = await db.query("SELECT * FROM glosario ORDER BY term ASC");
        // Mapeamos 'definition' a 'def' para que el frontend lo lea bien
        const data = rows.map(row => ({
            id: row.id,
            term: row.term,
            cat: row.cat,
            def: row.definition 
        }));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});

// --- API ADMIN ---
app.post('/api/admin/news', authMiddleware, async (req, res) => {
    const { title, tag, date, image, lead, content, isHero } = req.body;
    try { 
        await db.query("INSERT INTO noticias (title, tag, date, image, `lead`, content, isHero) VALUES (?,?,?,?,?,?,?)", [title, tag, date, image, lead, content, isHero?1:0]); 
        res.json({success:true}); 
    } catch(e){ res.status(500).json(e); }
});

// STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

// INICIO
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Servidor Velo listo en puerto ${PORT}`); 
});
