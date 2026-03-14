const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db');

// Función auxiliar para esperar y no saturar el servidor de FC
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchRiderPalmares(riderUrl) {
    try {
        console.log(`   └─ 🕵️‍♂️ Extrayendo palmarés desde: ${riderUrl}`);
        const { data } = await axios.get(`https://firstcycling.com/${riderUrl}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 10000
        });
        
        const $ = cheerio.load(data);
        const palmares = [];

        // MÉTODO DE RASTREO AGRESIVO: Buscamos en todas las tablas de resultados
        $('table tbody tr').each((i, row) => {
            const tds = $(row).find('td');
            
            // Comprobamos si el corredor quedó 1º (Puede estar en la columna 1, 2 o 3)
            let isWin = false;
            tds.each((j, td) => {
                const text = $(td).text().trim();
                if (text === '1' || text === '1st') isWin = true;
            });

            // Si es una victoria y aún no tenemos 6, extraemos el nombre de la carrera
            if (isWin && palmares.length < 6) {
                const raceLink = $(row).find('a').first(); // El primer enlace suele ser el nombre de la carrera
                const raceName = raceLink.text().trim();
                
                let year = $(row).find('td').first().text().trim();
                if (year.length > 4) year = year.substring(0, 4); // Extraemos solo el año
                
                // Limpiamos y guardamos (Solo si tiene un nombre real)
                if (raceName && raceName.length > 3) {
                    const entry = year.match(/^\d{4}$/) ? `${raceName} ('${year.slice(-2)})` : raceName;
                    if (!palmares.includes(entry)) palmares.push(entry);
                }
            }
        });

        return palmares.length > 0 ? JSON.stringify(palmares) : null;
    } catch (error) {
        console.error(`   └─ ❌ Error al leer palmarés de ${riderUrl}:`, error.message);
        return null;
    }
}

async function updateRanking() {
    console.log("🤖 [Velo Bot] Iniciando escaneo de FirstCycling...");
    try {
        const { data } = await axios.get('https://firstcycling.com/ranking.php', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 10000 
        });
        
        const $ = cheerio.load(data);
        const topRiders = [];

        // 1. Extraer los corredores del Ranking
        $('table tbody tr').each((index, element) => {
            if (topRiders.length >= 10) return false; 

            const riderLink = $(element).find('a[href*="rider.php"]');
            
            if (riderLink.length > 0) {
                let name = riderLink.text().trim();
                const profileUrl = riderLink.attr('href'); // Guardamos la URL de su perfil
                
                const teamLink = $(element).find('a[href*="team.php"]');
                const team = teamLink.length > 0 ? teamLink.text().trim() : 'Independiente';

                const pointsStr = $(element).find('td').last().text().trim().replace(/\./g, '').replace(/,/g, '').replace(/\s/g, '');
                const points = parseInt(pointsStr) || 0;

                if (name.match(/^[A-ZÁÉÍÓÚÑÄËÏÖÜ]+ [A-Z]/)) { 
                     const parts = name.split(' ');
                     const lastName = parts.shift();
                     name = `${parts.join(' ')} ${lastName}`;
                }

                if (name && points > 0) {
                    topRiders.push({ name, team, points, profileUrl });
                }
            }
        });

        console.log(`🔍 [Velo Bot] Cazados ${topRiders.length} corredores en el Ranking. Iniciando Deep Scan...`);

        // 2. Extracción profunda (Deep Scan) del palmarés para cada corredor
        if (topRiders.length > 0) {
            
            for (let rider of topRiders) {
                if (rider.profileUrl) {
                    rider.palmares = await fetchRiderPalmares(rider.profileUrl);
                    // Esperar 2 segundos entre peticiones para no ser bloqueados
                    await delay(2000); 
                } else {
                    rider.palmares = null;
                }
            }

            // 3. Guardar en Base de Datos
            console.log("💾 [Velo Bot] Guardando datos estructurados en la base de datos...");
            await db.query("DELETE FROM ranking"); 
            
            for (const rider of topRiders) {
                try {
                    await db.query(
                        "INSERT INTO ranking (name, team, points, palmares) VALUES (?, ?, ?, ?)", 
                        [rider.name, rider.team, rider.points, rider.palmares]
                    );
                } catch(dbErr) {
                    if (dbErr.code === 'ER_BAD_FIELD_ERROR') {
                         console.warn("⚠️ Advertencia: La columna 'palmares' no existe. Creándola automáticamente...");
                         await db.query("ALTER TABLE ranking ADD COLUMN palmares TEXT NULL");
                         // Reintento
                         await db.query(
                            "INSERT INTO ranking (name, team, points, palmares) VALUES (?, ?, ?, ?)", 
                            [rider.name, rider.team, rider.points, rider.palmares]
                        );
                    } else {
                        throw dbErr;
                    }
                }
            }
            console.log(`✅ [Velo Bot] MISIÓN CUMPLIDA. Ranking y Palmarés actualizados. (Top 1: ${topRiders[0].name})`);
        } else {
            console.log("⚠️ [Velo Bot] El robot entró a la web, pero no reconoció el HTML de los corredores.");
        }

    } catch (error) {
        console.error("❌ [Velo Bot] Error Fatal:", error.message);
    }
}

// Ejecutar automáticamente todos los días a las 03:00 AM
cron.schedule('0 3 * * *', () => {
    updateRanking();
});

module.exports = { updateRanking };
