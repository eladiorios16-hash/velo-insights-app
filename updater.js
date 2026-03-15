const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db');

async function updateRanking() {
    console.log("\n🚀 [VELO BOT] ACTUALIZANDO SOLO PUNTOS UCI (MODO MANUAL ACTIVO)");
    try {
        const { data } = await axios.get('https://firstcycling.com/ranking.php', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0' }, 
            timeout: 15000 
        });
        const $ = cheerio.load(data);
        const targetRiders = [];

        // Cogemos el Top 100 del mundo para tenerlos listos
        $('table tbody tr').each((index, element) => {
            if (targetRiders.length >= 100) return false; 
            let name = $(element).find('a[href*="rider.php"]').text().trim();
            const team = $(element).find('a[href*="team.php"]').text().trim() || 'Independiente';
            const pointsStr = $(element).find('td').last().text().trim().replace(/[\.,\s]/g, '');
            const points = parseInt(pointsStr) || 0;
            
            if (name.match(/^[A-ZÁÉÍÓÚÑÄËÏÖÜ]+ [A-Z]/)) { 
                const parts = name.split(' ');
                const lastName = parts.shift();
                name = `${parts.join(' ')} ${lastName}`;
            }
            if (name && points > 0) targetRiders.push({ name, team, points });
        });

        console.log(`🔍 Actualizando puntos de ${targetRiders.length} corredores...`);

        // IMPORTANTE: Ya NO hacemos "DELETE FROM ranking". Actualizamos fila a fila.
        for (const r of targetRiders) {
            const [rows] = await db.query("SELECT id FROM ranking WHERE name = ?", [r.name]);
            if (rows.length > 0) {
                // Si existe, solo actualizamos puntos y equipo (El palmarés manual se queda INTACTO)
                await db.query("UPDATE ranking SET points = ?, team = ? WHERE id = ?", [r.points, r.team, rows[0].id]);
            } else {
                // Si es nuevo, lo creamos vacío
                await db.query("INSERT INTO ranking (name, team, points, palmares) VALUES (?, ?, ?, NULL)", [r.name, r.team, r.points]);
            }
        }
        console.log("✅ [VELO BOT] Puntos UCI actualizados. Tu Palmarés manual está a salvo.");
        
    } catch (error) { console.error("\n❌ Error Crítico:", error.message); }
}

cron.schedule('0 3 * * *', () => { updateRanking(); });
module.exports = { updateRanking };
