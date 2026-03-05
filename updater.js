const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db'); // Tu archivo actual de conexión a la base de datos

async function updateRanking() {
    console.log("🤖 [Velo Bot] Iniciando extracción de datos (Ranking)...");
    try {
        // 1. Visitamos la web de forma "invisible"
        const { data } = await axios.get('https://www.procyclingstats.com/rankings.php', {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' 
            }
        });
        
        const $ = cheerio.load(data);
        const topRiders = [];

        // 2. Buscamos la tabla principal y extraemos los primeros 10 corredores
        $('.basic tbody tr').slice(0, 10).each((index, element) => {
            const name = $(element).find('td:nth-child(4) a').text().trim();
            const team = $(element).find('td:nth-child(5) a').text().trim() || 'Sin Equipo';
            const pointsStr = $(element).find('td:nth-child(6)').text().trim();
            const points = parseInt(pointsStr.replace(/,/g, '')) || 0;
            
            if (name && points > 0) {
                topRiders.push({ name, team, points });
            }
        });

        // 3. Si hemos conseguido los datos, actualizamos nuestra base de datos
        if (topRiders.length > 0) {
            await db.query("DELETE FROM ranking"); // Vaciamos lo antiguo
            
            for (const rider of topRiders) {
                await db.query(
                    "INSERT INTO ranking (name, team, points) VALUES (?, ?, ?)", 
                    [rider.name, rider.team, rider.points]
                );
            }
            console.log(`✅ [Velo Bot] Ranking actualizado. Top 1: ${topRiders[0].name} (${topRiders[0].points} pts)`);
        } else {
            console.log("⚠️ [Velo Bot] No se encontraron datos en la tabla objetivo.");
        }

    } catch (error) {
        console.error("❌ [Velo Bot] Error al actualizar el ranking:", error.message);
    }
}

// 4. El reloj despertador: Ejecutar todos los días a las 03:00 AM
cron.schedule('0 3 * * *', () => {
    updateRanking();
});

module.exports = { updateRanking };
