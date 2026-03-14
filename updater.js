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

        // Buscamos en la sección típica de victorias destacadas (Top Results / Wins)
        $('.rider-highlights li, .list-highlights li').each((i, el) => {
            const text = $(el).text().trim();
            if (text && (text.includes('GC') || text.includes('Stage') || text.includes('World') || text.includes('National') || text.includes('1st'))) {
                // Limpiamos un poco el texto de la victoria
                let cleanWin = text.replace(/\s+/g, ' ').replace(/1x /g, '').trim();
                
                // Limitamos a 6 victorias clave para no saturar la base de datos
                if (palmares.length < 6 && cleanWin.length > 3) {
                    palmares.push(cleanWin);
                }
            }
        });

        // Si la estructura cambió o no encontramos la lista rápida, buscamos en tablas
        if (palmares.length === 0) {
             $('table.sortable tbody tr').each((i, el) => {
                 const pos = $(el).find('td:nth-child(2)').text().trim();
                 if (pos === '1' && palmares.length < 5) {
                     const race = $(el).find('td:nth-child(4) a').text().trim();
                     const year = $(el).find('td:nth-child(1)').text().trim();
                     if(race) palmares.push(`${race} ('${year.slice(-2)})`);
                 }
             });
        }

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
