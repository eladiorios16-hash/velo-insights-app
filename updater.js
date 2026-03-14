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
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
            },
            timeout: 12000
        });
        
        const $ = cheerio.load(data);
        const racesList = [];
        const yearMap = new Map();

        // Selector robusto: busca filas de tabla que contengan enlaces a carreras (race.php)
        $('table tbody tr').each((i, el) => {
            const row = $(el);
            const tds = row.find('td');
            const raceLink = row.find('a[href*="race.php"]');
            
            if (raceLink.length > 0) {
                const pos = tds.eq(1).text().trim();
                if (pos && pos !== '-' && pos !== '') {
                    let fullRaceName = raceLink.closest('td').text().trim();
                    
                    // Limpieza de categorías UCI (2.UWT, 1.Pro, etc)
                    fullRaceName = fullRaceName.replace(/\s*(1|2)\.(UWT|Pro|1|2|Ncup|WC|CC|HC)\b/ig, '').trim();
                    
                    let mainName = fullRaceName;
                    let stageInfo = null;

                    if (fullRaceName.includes('|')) {
                        const parts = fullRaceName.split('|');
                        mainName = parts[0].trim();
                        stageInfo = parts[1].trim();
                    }

                    if (!yearMap.has(mainName)) {
                        yearMap.set(mainName, { raceName: mainName, gc: null, stages: [] });
                    }

                    const entry = yearMap.get(mainName);
                    // Si es la posición general (GC) o una clásica
                    if (!stageInfo || stageInfo.toUpperCase() === 'GC' || stageInfo.toLowerCase().includes('general')) {
                        entry.gc = pos;
                    } else {
                        entry.stages.push({ stage: stageInfo, pos: pos });
                    }
                }
            }
        });
        return Array.from(yearMap.values());
    } catch (e) {
        console.log(`      ⚠️ Error en año ${year}: ${e.message}`);
        return [];
    }
}

async function fetchRiderResults(riderUrl) {
    const baseUrl = 'https://firstcycling.com/';
    console.log(`   └─ 🕵️‍♂️ Extrayendo: ${riderUrl}`);
    
    // Ejecución SECUENCIAL para evitar bloqueos 403
    const data2026 = await getYearResults(baseUrl, riderUrl, 2026);
    await delay(1500); // Pausa entre años
    const data2025 = await getYearResults(baseUrl, riderUrl, 2025);

    const calendarioFull = { "2026": data2026, "2025": data2025 };
    const total = data2026.length + data2025.length;
    console.log(`   └─ 📊 OK: ${total} carreras detectadas.`);
    return total > 0 ? JSON.stringify(calendarioFull) : null;
}

async function updateRanking() {
    console.log("\n🚀 [VELO BOT] INICIANDO ESCÁNER");
    try {
        const [trendingDB] = await db.query("SELECT title FROM trending WHERE tipo = 'ciclista'");
        const trendingNames = trendingDB.map(r => r.title);

        const { data } = await axios.get('https://firstcycling.com/ranking.php', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
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

        console.log(`🔍 Procesando ${targetRiders.length} ciclistas...`);

        for (let rider of targetRiders) {
            if (rider.profileUrl) {
                rider.palmares = await fetchRiderResults(rider.profileUrl);
                await delay(3500); // Pausa obligatoria de seguridad
            }
        }

        await db.query("DELETE FROM ranking"); 
        for (const rider of targetRiders) {
            await db.query("INSERT INTO ranking (name, team, points, palmares) VALUES (?, ?, ?, ?)", [rider.name, rider.team, rider.points, rider.palmares]);
        }
        console.log("\n✅ [VELO BOT] SINCRONIZACIÓN EXITOSA.");
    } catch (error) { console.error("\n❌ Error Crítico:", error.message); }
}

cron.schedule('0 3 * * *', () => { updateRanking(); });
module.exports = { updateRanking };
