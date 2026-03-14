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
        console.log(`   └─ 🕵️‍♂️ Extrayendo resultados desde: ${riderUrl}`);
        
        let { data } = await axios.get(`https://firstcycling.com/${riderUrl}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 15000
        });
        
        let $ = cheerio.load(data);
        const resultados = [];

        const extraerTabla = () => {
            // FirstCycling usa 'table.ws_tb' para la tabla general de resultados 
            $('table.ws_tb tbody tr').each((i, row) => {
                if (resultados.length >= 8) return; // Límite de 8 últimos resultados para la interfaz
                
                const tds = $(row).find('td');
                if (tds.length < 4) return;

                let pos = tds.eq(1).text().trim(); // Columna Posición
                let raceText = tds.eq(3).text().trim(); // Columna Carrera
                
                // Saltamos las cabeceras generales de las vueltas por etapas que no tienen posición
                if (!pos || pos === '-' || pos === '') return;

                // Limpieza absoluta de códigos de categoría UCI
                raceText = raceText.replace(/\s*2\.UWT/ig, '');
                raceText = raceText.replace(/\s*1\.UWT/ig, '');
                raceText = raceText.replace(/\s*2\.Pro/ig, '');
                raceText = raceText.replace(/\s*1\.Pro/ig, '');
                
                // Formatear "Carrera | Etapa" a "Carrera - Etapa"
                raceText = raceText.replace(/\s*\|\s*/g, ' - ').trim();
                raceText = raceText.replace(/\s+/g, ' '); // Eliminar espacios extra

                // Validar que la posición sea un número o un abandono (DNF/DNS/OTL)
                if (pos.match(/^\d+$/) || ['DNF', 'DNS', 'OTL'].includes(pos.toUpperCase())) {
                    resultados.push({
                        posicion: pos,
                        carrera: raceText
                    });
                }
            });
        };

        extraerTabla();

        // MAGIA DEL CALENDARIO: Si este año ha corrido poco (< 5 carreras), extraemos el año anterior (2025)
        if (resultados.length < 5) {
            console.log(`   └─ 🔄 Pocos resultados. Escaneando la temporada anterior (2025)...`);
            let prevYearUrl = riderUrl.includes('?') ? `${riderUrl}&y=2025` : `${riderUrl}?y=2025`;
            try {
                let res2025 = await axios.get(`https://firstcycling.com/${prevYearUrl}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000
                });
                $ = cheerio.load(res2025.data);
                extraerTabla();
            } catch (e) {
                console.log(`   └─ ⚠️ No se pudo cargar la temporada 2025`);
            }
        }

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
