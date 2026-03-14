const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db');

// Función auxiliar para esperar y no saturar el servidor de FC
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchRiderPalmares(riderUrl) {
    try {
        console.log(`   └─ 🕵️‍♂️ Extrayendo palmarés desde: ${riderUrl}`);
        
        // Forzamos a pedir la web en inglés para que las clases CSS sean consistentes
        const { data } = await axios.get(`https://firstcycling.com/${riderUrl}`, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9' 
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const palmares = [];

        // NUEVO MÉTODO DE EXTRACCIÓN (Basado en la estructura real de FirstCycling)
        // Buscamos las listas de Highlights que están en la parte superior derecha
        $('.rider-highlights li, ul.list-highlights li').each((i, el) => {
            let text = $(el).text().trim();
            
            // Filtramos para coger solo victorias importantes (Clasificaciones Generales, Campeonatos, Monumentos)
            // FirstCycling suele listarlos como "3x Tour de France GC ('23, '22...)"
            if (text && (text.includes('GC') || text.includes('Stage') || text.includes('World') || text.includes('National') || text.includes('1st') || text.includes('Winner'))) {
                
                // Limpiamos el texto: quitamos el multiplicador "3x " o "1x " del principio
                let cleanWin = text.replace(/^\d+x\s/, '').trim();
                
                if (palmares.length < 6 && cleanWin.length > 3) {
                    palmares.push(cleanWin);
                }
            }
        });

        // PLAN B: Si no encuentra la lista de highlights rápidos, buscamos en las tablas de resultados abajo
        if (palmares.length === 0) {
             $('table.sortable tbody tr').each((i, row) => {
                 // La columna 2 (Pos) suele tener la posición
                 const posText = $(row).find('td').eq(1).text().trim();
                 
                 // Si quedó 1º
                 if (posText === '1' && palmares.length < 5) {
                     const raceLink = $(row).find('td').eq(3).find('a').first();
                     let raceName = raceLink.text().trim();
                     
                     // Extraer el año de la primera columna
                     let year = $(row).find('td').eq(0).text().trim();
                     if (year.length > 4) year = year.substring(0, 4); 
                     
                     if (raceName) {
                         const entry = year.match(/^\d{4}$/) ? `${raceName} ('${year.slice(-2)})` : raceName;
                         if (!palmares.includes(entry)) palmares.push(entry);
                     }
                 }
             });
        }

        // Devolvemos el array en formato JSON para que MySQL lo acepte
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
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9' 
            },
            timeout: 15000 
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

                // Formateo del nombre: "POGAČAR Tadej" -> "Tadej POGAČAR"
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

        console.log(`🔍 [Velo Bot] Cazados ${topRiders.length} corredores en el Ranking. Iniciando Deep Scan de Palmarés...`);

        // 2. Extracción profunda (Deep Scan) del palmarés para cada corredor
        if (topRiders.length > 0) {
            
            for (let rider of topRiders) {
                if (rider.profileUrl) {
                    rider.palmares = await fetchRiderPalmares(rider.profileUrl);
                    // Retraso seguro para no saturar al servidor ajeno
                    await delay(2500); 
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
