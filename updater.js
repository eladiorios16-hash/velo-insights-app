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
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0' },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        const firstResult = $('table.ws_tb tbody tr').first().find('a[href*="rider.php"]').attr('href');
        return firstResult || null;
    } catch (e) { return null; }
}

async function fetchRiderResults(riderUrl) {
    try {
        console.log(`   └─ 🕵️‍♂️ Extrayendo TODO el calendario de: ${riderUrl}`);
        
        const baseUrl = 'https://firstcycling.com/';
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0' };
        
        // Objeto maestro que guardará 2026 y 2025
        const calendarioFull = { "2026": [], "2025": [] };

        // Función para extraer un año específico y agrupar por carrera
        const extraerTablaAño = (htmlData) => {
            const $ = cheerio.load(htmlData);
            const yearMap = new Map(); // Usamos Map para mantener el orden cronológico

            $('table.ws_tb tbody tr').each((i, row) => {
                const tds = $(row).find('td');
                if (tds.length < 3) return;

                let pos = tds.eq(1).text().trim();
                const raceLink = $(row).find('a[href*="race.php"]');
                
                if (raceLink.length > 0 && pos) {
                    if (/^\d+$/.test(pos) || ['DNF', 'DNS', 'OTL', 'DSQ'].includes(pos.toUpperCase())) {
                        let fullRaceText = raceLink.closest('td').text().trim();
                        
                        // Limpiamos los códigos UCI
                        fullRaceText = fullRaceText.replace(/\s*(1|2)\.(UWT|Pro|1|2|Ncup|WC|CC)\b/ig, '').trim();
                        fullRaceText = fullRaceText.replace(/\s*\|\s*$/g, '').trim();
                        
                        let baseRace = fullRaceText;
                        let stageDesc = null;

                        // Si tiene el separador "|", es una etapa. Si no, es una Clásica o la General.
                        if (fullRaceText.includes('|')) {
                            const parts = fullRaceText.split('|');
                            baseRace = parts[0].trim();
                            stageDesc = parts[1].trim();
                        }

                        // Si la carrera no existe en el mapa, la creamos
                        if (!yearMap.has(baseRace)) {
                            yearMap.set(baseRace, { raceName: baseRace, gc: null, stages: [] });
                        }

                        let raceObj = yearMap.get(baseRace);

                        // Si es la fila principal (General o Clásica)
                        if (!stageDesc || stageDesc.toUpperCase() === 'GC') {
                            raceObj.gc = pos;
                        } else {
                            // Es una etapa, la añadimos al array de etapas
                            raceObj.stages.push({ stage: stageDesc, pos: pos });
                        }
                    }
                }
            });
            return Array.from(yearMap.values());
        };

        // 1. Extraemos 2026 (URL actual)
        let { data: data2026 } = await axios.get(`${baseUrl}${riderUrl}`, { headers, timeout: 15000 });
        calendarioFull["2026"] = extraerTablaAño(data2026);

        // 2. Extraemos 2025
        console.log(`   └─ ⏳ Descargando 2025...`);
        let url2025 = riderUrl.includes('?') ? `${riderUrl}&y=2025` : `${riderUrl}?y=2025`;
        try {
            let { data: data2025 } = await axios.get(`${baseUrl}${url2025}`, { headers, timeout: 15000 });
            calendarioFull["2025"] = extraerTablaAño(data2025);
        } catch (e) {
            console.log(`   └─ ⚠️ Fallo al leer 2025: ${e.message}`);
        }

        const totalRaces = calendarioFull["2026"].length + calendarioFull["2025"].length;
        console.log(`   └─ 📊 Extraídas: ${totalRaces} carreras completas agrupadas`);
        
        return totalRaces > 0 ? JSON.stringify(calendarioFull) : null;
    } catch (error) {
        console.error(`   └─ ❌ Error al leer resultados:`, error.message);
        return null;
    }
}

async function updateRanking() {
    console.log("\n===============================================");
    console.log("🤖 [VELO BOT] INICIANDO ESCÁNER DE RENDIMIENTO (V2)");
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

        console.log(`\n🔍 Extrayendo el calendario completo 25/26 de ${targetRiders.length} corredores...\n`);

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
