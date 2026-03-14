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
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 8000
        });
        const $ = cheerio.load(data);
        return $('table.ws_tb tbody tr').first().find('a[href*="rider.php"]').attr('href') || null;
    } catch (e) { return null; }
}

async function fetchYearData(baseUrl, url, year) {
    try {
        const fullUrl = url.includes('?') ? `${baseUrl}${url}&y=${year}` : `${baseUrl}${url}?y=${year}`;
        const { data } = await axios.get(fullUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
            timeout: 12000
        });
        const $ = cheerio.load(data);
        const yearMap = new Map();

        $('table tr').each((i, row) => {
            const tds = $(row).find('td');
            if (tds.length < 4) return;

            const pos = tds.eq(1).text().trim();
            const raceLink = $(row).find('a[href*="race.php"]');

            if (raceLink.length > 0 && pos && pos !== '-') {
                let fullRace = raceLink.closest('td').text().trim();
                // Limpieza agresiva de basura UCI y textos extra
                fullRace = fullRace.replace(/\s*(1|2)\.(UWT|Pro|1|2|Ncup|WC|CC|HC)\b/ig, '').replace(/\s*\|\s*$/g, '').trim();
                
                let mainRace = fullRace;
                let subInfo = null;

                if (fullRace.includes('|')) {
                    const parts = fullRace.split('|');
                    mainRace = parts[0].trim();
                    subInfo = parts[1].trim();
                }

                if (!yearMap.has(mainRace)) {
                    yearMap.set(mainRace, { raceName: mainRace, gc: null, stages: [] });
                }

                const entry = yearMap.get(mainRace);
                // Si la posición es un número o DNF/DNS
                if (/^\d+$/.test(pos) || ['DNF', 'DNS', 'OTL', 'DSQ'].includes(pos.toUpperCase())) {
                    if (!subInfo || subInfo.toUpperCase() === 'GC' || subInfo.toLowerCase().includes('general')) {
                        entry.gc = pos;
                    } else {
                        entry.stages.push({ stage: subInfo, pos: pos });
                    }
                }
            }
        });
        return Array.from(yearMap.values());
    } catch (e) { return []; }
}

async function fetchRiderResults(riderUrl) {
    console.log(`   └─ 🕵️‍♂️ Extrayendo 25/26: ${riderUrl}`);
    const baseUrl = 'https://firstcycling.com/';
    
    // Lanzamos ambas peticiones a la vez para evitar timeouts
    const [res2026, res2025] = await Promise.all([
        fetchYearData(baseUrl, riderUrl, 2026),
        fetchYearData(baseUrl, riderUrl, 2025)
    ]);

    const calendarioFull = { "2026": res2026, "2025": res2025 };
    const total = res2026.length + res2025.length;
    console.log(`   └─ 📊 OK: ${total} carreras agrupadas.`);
    return total > 0 ? JSON.stringify(calendarioFull) : null;
}

async function updateRanking() {
    console.log("\n🚀 [VELO BOT] INICIANDO ESCÁNER DE ALTO RENDIMIENTO");
    try {
        const [trendingDB] = await db.query("SELECT title FROM trending WHERE tipo = 'ciclista'");
        const trendingNames = trendingDB.map(r => r.title);

        const { data } = await axios.get('https://firstcycling.com/ranking.php', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0' },
            timeout: 15000 
        });
        const $ = cheerio.load(data);
        const targetRiders = [];

        $('table tbody tr').each((index, element) => {
            if (targetRiders.length >= 25) return false; // Reducimos a 25 para evitar el baneo por volumen
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
                targetRiders.push({ name, team, points, profileUrl });
            }
        });

        // Corredores manuales
        for (let tName of trendingNames) {
            if (!targetRiders.find(r => normalizeName(r.name) === normalizeName(tName))) {
                const searchUrl = await searchRiderProfile(tName);
                if (searchUrl) {
                    targetRiders.push({ name: tName, team: 'Pro Rider', points: 0, profileUrl: searchUrl });
                    await delay(2000); // Pausa más larga en búsquedas
                }
            }
        }

        console.log(`\n🔍 Procesando ${targetRiders.length} perfiles...`);

        for (let rider of targetRiders) {
            if (rider.profileUrl) {
                rider.palmares = await fetchRiderResults(rider.profileUrl);
                await delay(3500); // PAUSA CRÍTICA: 3.5 segundos entre ciclistas para evitar 403
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
