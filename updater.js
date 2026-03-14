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
        const { data } = await axios.get(`https://firstcycling.com/rider.php?q=${encodeURIComponent(riderName)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0' },
            timeout: 8000
        });
        const $ = cheerio.load(data);
        return $('table.ws_tb tbody tr').first().find('a[href*="rider.php"]').attr('href') || null;
    } catch (e) { return null; }
}

async function getYearResults(baseUrl, riderUrl, year) {
    try {
        const finalUrl = `${baseUrl}${riderUrl}${riderUrl.includes('?') ? '&' : '?'}y=${year}`;
        const { data } = await axios.get(finalUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
                'Accept-Language': 'es-ES,es;q=0.9'
            },
            timeout: 12000
        });
        
        const $ = cheerio.load(data);
        const yearMap = new Map();
        let currentMainRace = "Otros";

        // Escaneamos TODAS las filas de la tabla de resultados
        $('table tr').each((i, el) => {
            const row = $(el);
            const tds = row.find('td');
            if (tds.length < 3) return;

            const pos = tds.eq(1).text().trim();
            const raceTextCell = tds.eq(3);
            const raceLink = raceTextCell.find('a[href*="race.php"]');

            if (raceLink.length > 0) {
                let fullText = raceTextCell.text().trim();
                // Limpieza de basura UCI
                fullText = fullText.replace(/\s*\d\.(UWT|Pro|1|2|Ncup|WC|CC|HC|NE)\b/ig, '').trim();

                // DETECTAR SI ES CABECERA DE CARRERA O ETAPA
                // Si la fila tiene bandera (img) y enlace, suele ser la carrera principal
                const hasFlag = raceTextCell.find('img').length > 0;
                
                if (hasFlag && !fullText.includes('|')) {
                    currentMainRace = fullText;
                    if (!yearMap.has(currentMainRace)) {
                        yearMap.set(currentMainRace, { raceName: currentMainRace, gc: null, stages: [] });
                    }
                }

                // Si hay posición válida (Número o DNF/DNS)
                if (pos && pos !== '-' && (/^\d+$/.test(pos) || ['DNF', 'DNS', 'OTL', 'DSQ'].includes(pos.toUpperCase()))) {
                    if (!yearMap.has(currentMainRace)) {
                        yearMap.set(currentMainRace, { raceName: currentMainRace, gc: null, stages: [] });
                    }
                    const entry = yearMap.get(currentMainRace);

                    // Clasificar el resultado
                    if (fullText.toLowerCase().includes('general') || fullText.toLowerCase().includes('gc') || fullText === currentMainRace) {
                        entry.gc = pos;
                    } else {
                        // Es una etapa o clasificación secundaria
                        let stageName = fullText.includes('|') ? fullText.split('|')[1].trim() : fullText;
                        entry.stages.push({ stage: stageName, pos: pos });
                    }
                }
            }
        });

        // Limpiar carreras vacías (que se crearon como cabecera pero no tienen resultados)
        const finalData = Array.from(yearMap.values()).filter(r => r.gc || r.stages.length > 0);
        return finalData;
    } catch (e) {
        console.log(`      ⚠️ Error ${year}: ${e.message}`);
        return [];
    }
}

async function fetchRiderResults(riderUrl) {
    const baseUrl = 'https://firstcycling.com/';
    console.log(`   └─ 🕵️‍♂️ Escaneando perfil: ${riderUrl}`);
    
    // 2026 y luego 2025 (Secuencial para evitar bloqueos)
    const data2026 = await getYearResults(baseUrl, riderUrl, 2026);
    await delay(2000); 
    const data2025 = await getYearResults(baseUrl, riderUrl, 2025);

    const calendarioFull = { "2026": data2026, "2025": data2025 };
    const total = data2026.length + data2025.length;
    console.log(`   └─ 📊 Misión OK: ${total} carreras agrupadas.`);
    return total > 0 ? JSON.stringify(calendarioFull) : null;
}

async function updateRanking() {
    console.log("\n🚀 [VELO BOT] INICIANDO ESCÁNER V3 (MODO PROXIMIDAD)");
    try {
        const [trendingDB] = await db.query("SELECT title FROM trending WHERE tipo = 'ciclista'");
        const trendingNames = trendingDB.map(r => r.title);

        const { data } = await axios.get('https://firstcycling.com/ranking.php', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000 
        });
        const $ = cheerio.load(data);
        const targetRiders = [];

        $('table tbody tr').each((index, element) => {
            if (targetRiders.length >= 25) return false;
            const riderLink = $(element).find('a[href*="rider.php"]');
            if (riderLink.length > 0) {
                let name = riderLink.text().trim();
                const profileUrl = riderLink.attr('href');
                const teamLink = $(element).find('a[href*="team.php"]');
                const team = teamLink.length > 0 ? teamLink.text().trim() : 'Independiente';
                const pointsStr = $(element).find('td').last().text().trim().replace(/[\.,\s]/g, '');
                
                if (name.match(/^[A-ZÁÉÍÓÚÑÄËÏÖÜ]+ [A-Z]/)) { 
                     const parts = name.split(' ');
                     const lastName = parts.shift();
                     name = `${parts.join(' ')} ${lastName}`;
                }
                targetRiders.push({ name, team, points: parseInt(pointsStr) || 0, profileUrl });
            }
        });

        for (let tName of trendingNames) {
            if (!targetRiders.find(r => normalizeName(r.name) === normalizeName(tName))) {
                const searchUrl = await searchRiderProfile(tName);
                if (searchUrl) targetRiders.push({ name: tName, team: 'Pro Rider', points: 0, profileUrl: searchUrl });
                await delay(1500);
            }
        }

        console.log(`🔍 Analizando ${targetRiders.length} perfiles...`);

        for (let rider of targetRiders) {
            if (rider.profileUrl) {
                rider.palmares = await fetchRiderResults(rider.profileUrl);
                await delay(4000); // Pausa de seguridad extra
            }
        }

        await db.query("DELETE FROM ranking"); 
        for (const rider of targetRiders) {
            await db.query("INSERT INTO ranking (name, team, points, palmares) VALUES (?, ?, ?, ?)", [rider.name, rider.team, rider.points, rider.palmares]);
        }
        console.log("\n✅ [VELO BOT] TODO SINCRONIZADO CORRECTAMENTE.");
    } catch (error) { console.error("\n❌ Error Crítico:", error.message); }
}

cron.schedule('0 3 * * *', () => { updateRanking(); });
module.exports = { updateRanking };
