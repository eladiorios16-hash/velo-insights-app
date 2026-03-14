const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeName(name) {
    if (!name) return '';
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function searchRiderProfile(riderName) {
    try {
        console.log(`   ├─ 🔎 Buscando perfil de: ${riderName}`);
        const { data } = await axios.get(`https://firstcycling.com/rider.php?q=${encodeURIComponent(riderName)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        const firstResult = $('table.ws_tb tbody tr').first().find('a[href*="rider.php"]').attr('href');
        return firstResult || null;
    } catch (e) { return null; }
}

async function fetchRiderResults(riderUrl) {
    try {
        console.log(`   └─ 🕵️‍♂️ Extrayendo últimos resultados desde: ${riderUrl}`);
        
        const { data } = await axios.get(`https://firstcycling.com/${riderUrl}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const resultados = [];

        // Buscamos en la tabla principal de resultados
        $('table.sortable tbody tr').each((i, row) => {
            if (resultados.length >= 8) return; // Límite: últimos 8 resultados
            
            // La posición suele estar en la columna 2
            let pos = $(row).find('td').eq(1).text().trim();
            // La carrera/etapa está en la columna 4
            let raceText = $(row).find('td').eq(3).text().trim();
            
            if (pos && raceText) {
                // Limpiamos los códigos UCI feos como "| 1.UWT" o "| 2.Pro"
                raceText = raceText.replace(/\s*\|\s*\d\.[A-Z]+/ig, '').trim();
                // Limpiamos espacios dobles
                raceText = raceText.replace(/\s+/g, ' ');
                
                resultados.push({
                    posicion: pos,
                    carrera: raceText
                });
            }
        });

        console.log(`   └─ 📊 Extraídos: ${resultados.length} resultados recientes`);
        return resultados.length > 0 ? JSON.stringify(resultados) : null;
    } catch (error) {
        console.error(`   └─ ❌ Error al leer resultados:`, error.message);
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

        const { data } = await axios.get('https://firstcycling.com/ranking.php', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
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

        console.log(`\n🔍 Extrayendo historial de ${targetRiders.length} corredores...\n`);

        for (let rider of targetRiders) {
            if (rider.profileUrl) {
                rider.palmares = await fetchRiderResults(rider.profileUrl);
                await delay(2000); 
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
        console.log("\n✅ [VELO BOT] MISIÓN CUMPLIDA AL 100%.");
        console.log("===============================================\n");

    } catch (error) {
        console.error("\n❌ [Velo Bot] Error Fatal:", error.message);
    }
}

cron.schedule('0 3 * * *', () => { updateRanking(); });
module.exports = { updateRanking };
