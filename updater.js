const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db');

async function updateRanking() {
    console.log("🤖 [Velo Bot] Analizando código fuente de FirstCycling...");
    try {
        const { data } = await axios.get('https://firstcycling.com/ranking.php', {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            timeout: 10000 
        });
        
        const $ = cheerio.load(data);
        const topRiders = [];

        // Estrategia "Cazador": Buscar cualquier fila que tenga un enlace a un ciclista
        $('table tbody tr').each((index, element) => {
            if (topRiders.length >= 10) return false; // Ya tenemos el Top 10, paramos de buscar.

            // Buscamos un enlace que contenga "rider.php"
            const riderLink = $(element).find('a[href*="rider.php"]');
            
            if (riderLink.length > 0) {
                // Limpiamos el nombre (quitamos espacios extra)
                let name = riderLink.text().trim();
                
                // Buscamos el equipo (enlace a team.php)
                const teamLink = $(element).find('a[href*="team.php"]');
                const team = teamLink.length > 0 ? teamLink.text().trim() : 'Independiente';

                // CORRECCIÓN CRÍTICA: Eliminamos los puntos (.) y las comas (,) antes de pasarlo a número
                const pointsStr = $(element).find('td').last().text().trim().replace(/\./g, '').replace(/,/g, '').replace(/\s/g, '');
                const points = parseInt(pointsStr) || 0;

                // Arreglamos el formato de nombre (FC lo pone como "POGAČAR Tadej" -> "Tadej POGAČAR")
                if (name.match(/^[A-ZÁÉÍÓÚÑÄËÏÖÜ]+ [A-Z]/)) { 
                     const parts = name.split(' ');
                     const lastName = parts.shift();
                     name = `${parts.join(' ')} ${lastName}`;
                }

                if (name && points > 0) {
                    topRiders.push({ name, team, points });
                }
            }
        });

        console.log(`🔍 [Velo Bot] Cazados ${topRiders.length} corredores.`);

        if (topRiders.length > 0) {
            await db.query("DELETE FROM ranking"); 
            for (const rider of topRiders) {
                await db.query(
                    "INSERT INTO ranking (name, team, points) VALUES (?, ?, ?)", 
                    [rider.name, rider.team, rider.points]
                );
            }
            console.log(`✅ [Velo Bot] MISIÓN CUMPLIDA. Top 1: ${topRiders[0].name} (${topRiders[0].points} pts)`);
        } else {
            console.log("⚠️ [Velo Bot] El robot entró a la web, pero no reconoció el HTML de los corredores.");
        }

    } catch (error) {
        console.error("❌ [Velo Bot] Error de red:", error.message);
    }
}

// Ejecutar automáticamente todos los días a las 03:00 AM
cron.schedule('0 3 * * *', () => {
    updateRanking();
});

module.exports = { updateRanking };
