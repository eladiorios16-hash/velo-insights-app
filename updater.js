const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db');

async function updateRanking() {
    console.log("🤖 [Velo Bot] Iniciando extracción de datos desde FirstCycling...");
    try {
        // Apuntamos a FirstCycling, que no bloquea IPs de servidores (Railway)
        const { data } = await axios.get('https://firstcycling.com/ranking.php', {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000 
        });
        
        const $ = cheerio.load(data);
        const topRiders = [];

        // Buscamos la tabla de clasificación de FirstCycling
        $('table.sortable tbody tr').slice(0, 10).each((index, element) => {
            // En FirstCycling: td(0) es Rango, td(1) es Ciclista, td(2) es Equipo, td(3) son Puntos
            const name = $(element).find('td').eq(1).find('a').text().trim();
            const team = $(element).find('td').eq(2).find('a').text().trim() || 'Independiente';
            const pointsStr = $(element).find('td').eq(3).text().trim();
            const points = parseInt(pointsStr.replace(/,/g, '')) || 0;

            if (name && points > 0) {
                topRiders.push({ name, team, points });
            }
        });

        console.log(`🔍 [Velo Bot] Analizados ${topRiders.length} corredores.`);

        // Si tenemos los 10 corredores, actualizamos la base de datos
        if (topRiders.length === 10) {
            await db.query("DELETE FROM ranking"); 
            
            for (const rider of topRiders) {
                await db.query(
                    "INSERT INTO ranking (name, team, points) VALUES (?, ?, ?)", 
                    [rider.name, rider.team, rider.points]
                );
            }
            console.log(`✅ [Velo Bot] ÉXITO. Nuevo N°1: ${topRiders[0].name} (${topRiders[0].points} pts)`);
        } else {
            console.log("⚠️ [Velo Bot] No se pudieron extraer los 10 corredores. Revisa el selector.");
        }

    } catch (error) {
        console.error("❌ [Velo Bot] Error de conexión:", error.message);
    }
}

// El reloj despertador: Ejecutar todos los días a las 03:00 AM
cron.schedule('0 3 * * *', () => {
    updateRanking();
});

module.exports = { updateRanking };
