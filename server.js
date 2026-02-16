require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();

// --- VALIDACIÓN DE VARIABLES ---
console.log("Fact: Comprobando configuración de base de datos...");
console.log(`Fact: Host: ${process.env.MYSQLHOST || 'No definido'}`);
console.log(`Fact: Port: ${process.env.MYSQLPORT || 'No definido'}`);

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

// 3. RUTAS DE SISTEMA
app.get('/admin', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- RUTA DE REPARACIÓN DE TABLAS ---
app.get('/setup-tables', async (req, res) => {
    try {
        console.log("Fact: Iniciando creación de tablas...");
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
        for (const q of queries) {
            await db.query(q);
        }
        res.send("✅ Tablas reparadas correctamente.");
    } catch (e) { 
        console.error("Error en setup-tables:", e.message);
        res.status(500).send("❌ Error: " + e.message); 
    }
});

// --- RUTA DE RESTAURACIÓN DE NOTICIAS (NUEVA) ---
app.get('/restore-news', async (req, res) => {
    try {
        // 1. Limpiamos la tabla para no duplicar
        await db.query("TRUNCATE TABLE noticias");
        
        // 2. Insertamos los datos que pediste
        const sql = `
            INSERT INTO noticias (id, title, date, tag, image, \`lead\`, content, isHero) VALUES
            (3, 'El Fin de la Transmisión Mecánica: Análisis de Eficiencia 2026', '04 FEB 2026', 'TECH LAB', 'assets/Transmision bici.png', 'El fin de la transmisión mecánica', '<div class=\"space-y-6 text-zinc-300 leading-relaxed\"><p class=\"text-xl font-medium text-white italic border-l-4 border-emerald-500 pl-6\">¿Es la nostalgia el único argumento que le queda al cable de acero? Los laboratorios de fricción confirman que el ecosistema electrónico no solo es más rápido, sino que ahorra vatios por precisión pura.</p><h2 class=\"text-2xl font-heading italic uppercase text-emerald-400 mt-10\">La Micro-Precisión y la Fricción de Cadena</h2><p>A diferencia de los sistemas mecánicos, donde el desgaste del cable o la mínima desalineación aumentan la fricción lateral, los sistemas electrónicos modernos realizan micro-ajustes en tiempo real. Esto mantiene la cadena en un ángulo de ataque perfecto respecto a los dientes del casete.</p><div class=\"my-10 overflow-hidden border border-zinc-800 rounded-2xl bg-zinc-900/30\"><table class=\"w-full text-left text-xs\"><thead class=\"bg-zinc-800/50 text-emerald-500 uppercase font-black\"><tr><th class=\"p-4\">Factor</th><th class=\"p-4\">Mecánico (Dura-Ace 9100)</th><th class=\"p-4\">Electrónico (Di2 / AXS 2026)</th></tr></thead><tbody class=\"divide-y divide-zinc-800\"><tr><td class=\"p-4 font-bold text-white uppercase\">Pérdida por Desalineación</td><td class=\"p-4\">1.2W - 2.5W</td><td class=\"p-4 text-emerald-400\">< 0.4W</td></tr><tr><td class=\"p-4 font-bold text-white uppercase\">Velocidad de Cambio (ms)</td><td class=\"p-4\">~250ms (Variable)</td><td class=\"p-4 text-emerald-400\">45ms (Constante)</td></tr><tr><td class=\"p-4 font-bold text-white uppercase\">Mantenimiento CDA</td><td class=\"p-4\">Bajo (Cables externos)</td><td class=\"p-4 text-emerald-400\">Máximo (Integración total)</td></tr></tbody></table></div><h3 class=\"text-xl font-bold text-white uppercase tracking-tighter\">Integración vs. Reparabilidad</h3><p>El dilema de 2026 no es el peso (ya igualado), sino la integración. Los cuadros diseñados exclusivamente para grupos electrónicos eliminan puertos de entrada de cables, mejorando la rigidez de la pipa de dirección en un <strong>7%</strong> y reduciendo las turbulencias en la zona frontal.</p><div class=\"bg-zinc-900 p-6 rounded-2xl border border-zinc-800 my-8\"><p class=\"text-sm text-zinc-400 italic\">\"La consistencia del cambio bajo carga máxima (sprint a +1200W) es donde el sistema electrónico dicta sentencia. Un salto de cadena en mecánico es una pérdida de inercia; en electrónico, es inexistente.\"</p></div></div>', 0),
            (4, 'VAM VS Vatios', '05 FEB 2026', 'TECH LAB', 'assets/vatios.png', 'VAM VS VATIOS', '<div class=\"space-y-6 text-zinc-300 leading-relaxed\"><p class=\"text-xl font-medium text-white italic border-l-4 border-violet-500 pl-6\">En las rampas del 10%, la física es implacable. Analizamos por qué un ciclista de 60kg con menos vatios puede destrozar a uno de 80kg con un FTP superior.</p><h2 class=\"text-2xl font-heading italic uppercase text-violet-400 mt-10\">La Ecuación del Escalador</h2><p>La VAM (Velocidad Ascensional Media) es el barómetro definitivo en puertos de montaña. Mientras que en llano el factor determinante es el <strong>W/CdA</strong> (Vatios/Aerodinámica), en subidas por encima del 7% el único dato que importa es el <strong>W/Kg</strong>.</p><div class=\"grid grid-cols-1 md:grid-cols-2 gap-6 my-10\"><div class=\"p-6 bg-violet-500/10 border border-violet-500/30 rounded-2xl text-center\"><h4 class=\"text-violet-400 font-black uppercase text-[10px] tracking-widest mb-2\">Ciclista A (Potencia)</h4><p class=\"text-white text-sm mb-1\">Peso: 80kg</p><p class=\"text-white text-sm mb-4\">FTP: 400W</p><div class=\"text-2xl font-heading italic text-white\">5.0 W/Kg</div></div><div class=\"p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-center\"><h4 class=\"text-cyan-400 font-black uppercase text-[10px] tracking-widest mb-2\">Ciclista B (Eficiencia)</h4><p class=\"text-white text-sm mb-1\">Peso: 60kg</p><p class=\"text-white text-sm mb-4\">FTP: 330W</p><div class=\"text-2xl font-heading italic text-white\">5.5 W/Kg</div></div></div><h3 class=\"text-xl font-bold text-white uppercase tracking-tighter\">El Punto de Inflexión: El 6%</h3><p>Nuestros datos confirman que el \"punto de cruce\" se encuentra en el 6.2% de inclinación. Por debajo de esta cifra, el Ciclista A ganará por inercia y potencia bruta. Por encima, el Ciclista B se alejará irremediablemente.</p><ul class=\"list-disc pl-6 space-y-2 text-sm text-zinc-400\"><li><strong>VAM Pro:</strong> > 1600 m/h (Nivel WorldTour)</li><li><strong>VAM Amateur Pro:</strong> 1100 - 1300 m/h</li><li><strong>VAM Cicloturista:</strong> 600 - 800 m/h</li></ul><div class=\"bg-violet-500/5 border border-violet-500/20 p-6 rounded-2xl text-center mt-12\"><p class=\"text-xs uppercase font-black text-zinc-500 tracking-widest mb-2\">Conclusión para tu entrenamiento</p><p class=\"text-white font-medium\">No busques vatios infinitos. Busca el equilibrio donde tu ratio peso/potencia sea sostenible durante 40 minutos.</p></div></div>', 0),
            (5, 'Bessèges: El impacto de los monoplatos en la CRI final', '08 feb 2026', 'TECH LAB', 'assets/crono.png', 'Analizamos cómo la tendencia del monoplato de 60T ha dominado la contrarreloj final de Alès, ahorrando hasta 8 vatios.', '<p class=\"mb-4\">La contrarreloj final de la <strong>Etoile de Bessèges 2026</strong> ha confirmado el cambio de paradigma técnico. El Top 5 de la etapa utilizó exclusivamente configuraciones de plato único (1x), con desarrollos masivos de <strong>60 dientes</strong> combinados con cassettes 11-34 para optimizar la línea de cadena.</p><div class=\"my-6 p-4 bg-zinc-900/50 border-l-2 border-emerald-500 rounded-r-lg\"><span class=\"text-emerald-400 font-bold text-xs block mb-1 uppercase tracking-widest\">DATA INSIGHT</span><p class=\"text-zinc-300 italic\">\"Al eliminar el desviador delantero y mantener la cadena en la zona central del cassette el 94% del tiempo, reducimos la fricción mecánica en 3.5W y la turbulencia aerodinámica en la zona del eje de pedalier.\"</p></div><p>Otro factor clave fue la gestión de las vibraciones en la subida final a l\\'Ermitage. Los datos de los potenciómetros mostraron que los corredores con presiones inferiores a <strong>3.9 bar</strong> (montando tubeless de 30mm) mantuvieron una transferencia de potencia más constante sobre el pavés rugoso, mitigando las pérdidas por impedancia del terreno.</p>', 1),
            (6, 'Pogacar vs Vingegaard: El Duelo', '09 feb 2026', 'DATA ANALYSIS', 'assets/visma.png', 'El Duelo que Está Redefiniendo el Ciclismo Mundial.', '<section style=\"font-family: Arial, sans-serif; max-width: 900px; margin: auto; line-height: 1.6;\"><h1 style=\"text-align:center; color:#e63946; font-size: 2.5em;\">⚡ Pogacar vs Vingegaard ⚡</h1><p style=\"font-size:1.2em;\">Desde 2020, el Tour de Francia vive una era dorada gracias a dos titanes. Su rivalidad no es solo deportiva: es una batalla de estilos.</p></section>', 0),
            (7, 'EL JUICIO FINAL: HAUTACAM 2025', '09 feb 2026', 'RACE REPORT', 'assets/visma.png', 'Pogacar desmantela al Visma', '<p>Se esperaba una batalla de tres semanas, pero el Tour de Francia 2025 se decidió en Hautacam. Pogačar lanzó un ataque seco a falta de 4.5 km.</p>', 0);
        `;
        
        await db.query(sql);
        res.send("✅ Noticias importadas correctamente.");
    } catch (e) { 
        console.error(e);
        res.status(500).send("❌ Error cargando noticias: " + e.message); 
    }
});

// --- API PÚBLICA ---
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
            try {
                detailsParsed = typeof c.details === 'string' ? JSON.parse(c.details || '{}') : (c.details || {});
            } catch (e) {
                detailsParsed = { error: "JSON no válido" };
            }
            return { ...c, details: detailsParsed };
        });
        res.json(data);
    } catch(e){ 
        console.error("Error en API Calendar:", e.message);
        res.status(500).json([]); 
    }
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

// INICIO DEL SERVIDOR
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => { 
    console.log(`🚀 Servidor Velo listo en puerto ${PORT}`); 
});
