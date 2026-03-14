const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db');

// Función auxiliar para no saturar los servidores de FirstCycling
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeName(name) {
    if (!name) return '';
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function searchRiderProfile(riderName) {
    try {
        console.log(`   ├─ 🔎 Buscando perfil de: ${riderName}`);
        const { data } = await axios.get(`https://firstcycling.com/rider.php?q=${encodeURIComponent(riderName)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        const firstResult = $('table.ws_tb tbody tr').first().find('a[href*="rider.php"]').attr('href');
        return firstResult || null;
    } catch (e) {
        return null;
    }
}

async function fetchRiderPalmares(riderUrl) {
    try {
        console.log(`   └─ 🕵️‍♂️ Extrayendo palmarés desde: ${riderUrl}`);
        
        const { data } = await axios.get(`https://firstcycling.com/${riderUrl}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const palmares = [];

        // NUEVA ESTRATEGIA: ESCÁNER A PRUEBA DE BOMBAS
        // Buscamos cualquier enlace a una carrera dentro de la tabla de resultados
        $('a[href*="race.php"]').each((i, el) => {
            if (palmares.length >= 6) return; // Límite de 6 victorias
            
            const raceName = $(el).text().trim();
            const row = $(el).closest('tr');
            
            // FirstCycling suele poner la posición en la columna 1 o 2 (depende de si hay banderas)
            const pos1 = row.find('td').eq(1).text().trim();
            const pos2 = row.find('td').eq(2).text().trim();
            
            // Verificamos si hizo podio (1, 2 o 3)
            if (['1','2','3','1st','2nd','3rd','1º','2º','3º'].includes(pos1) || ['1','2','3','1st','2nd','3rd','1º','2º','3º'].includes(pos2)) {
                if (raceName && raceName.length > 2) {
                    // Si no fue 1º, le añadimos el sufijo para que se vea que fue podio
                    const isWin = ['1','1st','1º'].includes(pos1) || ['1','1st','1º'].includes(pos2);
                    const suffix = isWin ? '' : ` (Podio)`;
                    const finalWin = `${raceName}${suffix}`;
                    
                    // Evitar duplicados
                    if (!palmares.includes(finalWin)) {
                        palmares.push(finalWin);
                    }
                }
            }
        });

        console.log(`   └─ 🏆 Encontradas: ${palmares.length} victorias/podios`);
        return palmares.length > 0 ? JSON.stringify(palmares) : null;
    } catch (error) {
        console.error(`   └─ ❌ Error al leer palmarés:`, error.message);
        return null;
    }
}

async function updateRanking() {
    console.log("\n===============================================");
    console.log("🤖 [VELO BOT] INICIANDO ESCÁNER DE RENDIMIENTO");
    console.log("===============================================\n");
    try {
        const [trendingDB] = await db.query("SELECT title FROM trending WHERE tipo = 'ciclista'");
        const trendingNames = trendingDB.map(r => r.title);
        console.log(`📋 Detectados ${trendingNames.length} ciclistas manuales en el Panel Admin.`);

        const { data } = await axios.get('https://firstcycling.com/ranking.php', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000 
        });
        const $ = cheerio.load(data);
        const targetRiders = [];

        $('table tbody tr').each((index, element) => {
            if (targetRiders.length >= 30) return false;

            const riderLink = $(element).find('a[href*="rider.php"]');
            if (riderLink.length > 0) {
                let name = riderLink.text().trim();
                const profileUrl = riderLink.attr('href');
                const teamLink = $(element).find('a[href*="team.php"]');
                const team = teamLink.length > 0 ? teamLink.text().trim() : 'Independiente';
                const pointsStr = $(element).find('td').last().text().trim().replace(/[\.,\s]/g, '');
                const points = parseInt(pointsStr) || 0;

                if (name.match(/^[A-ZÁÉÍÓÚÑÄËÏÖÜ]+ [A-Z]/)) { 
                     const parts = name.split(' ');
                     const lastName = parts.shift();
                     name = `${parts.join(' ')} ${lastName}`;
                }

                if (name && points > 0) targetRiders.push({ name, team, points, profileUrl });
            }
        });

        for (let tName of trendingNames) {
            const exists = targetRiders.find(r => normalizeName(r.name) === normalizeName(tName));
            if (!exists) {
                const searchUrl = await searchRiderProfile(tName);
                if (searchUrl) {
                    targetRiders.push({ name: tName, team: 'Pro Rider', points: 0, profileUrl: searchUrl });
                    await delay(1500); 
                }
            }
        }

        console.log(`\n🔍 Iniciando Deep Scan para ${targetRiders.length} corredores. ESTO TARDARÁ UNOS SEGUNDOS...\n`);

        // Extraer Palmarés
        for (let rider of targetRiders) {
            if (rider.profileUrl) {
                rider.palmares = await fetchRiderPalmares(rider.profileUrl);
                await delay(2000); // 2 segundos de pausa por ciclista (1 min total aprox)
            } else {
                rider.palmares = null;
            }
        }

        console.log("\n💾 Guardando datos en MySQL...");
        await db.query("DELETE FROM ranking"); 
        
        for (const rider of targetRiders) {
            try {
                await db.query(
                    "INSERT INTO ranking (name, team, points, palmares) VALUES (?, ?, ?, ?)", 
                    [rider.name, rider.team, rider.points, rider.palmares]
                );
            } catch(dbErr) {
                if (dbErr.code === 'ER_BAD_FIELD_ERROR') {
                     await db.query("ALTER TABLE ranking ADD COLUMN palmares TEXT NULL");
                     await db.query(
                        "INSERT INTO ranking (name, team, points, palmares) VALUES (?, ?, ?, ?)", 
                        [rider.name, rider.team, rider.points, rider.palmares]
                    );
                } else {
                    throw dbErr;
                }
            }
        }
        console.log("\n✅ [VELO BOT] MISIÓN CUMPLIDA AL 100%. PALMARÉS ACTUALIZADO.");
        console.log("===============================================\n");

    } catch (error) {
        console.error("\n❌ [Velo Bot] Error Fatal:", error.message);
    }
}

cron.schedule('0 3 * * *', () => { updateRanking(); });
module.exports = { updateRanking };
