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
        console.log(`   └─ 🕵️‍♂️ Extrayendo calendario de: ${riderUrl}`);
        const baseUrl = 'https://firstcycling.com/';
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0' };
        const calendarioFull = { "2026": [], "2025": [] };

        const extraerAño = async (url, yearKey) => {
            try {
                const { data } = await axios.get(url, { headers, timeout: 15000 });
                const $ = cheerio.load(data);
                const yearMap = new Map();

                $('table tr').each((i, row) => {
                    const tds = $(row).find('td');
                    if (tds.length < 3) return;

                    const pos = tds.eq(1).text().trim();
                    const raceLink = $(row).find('a[href*="race.php"]');

                    if (raceLink.length > 0 && pos && pos !== '-') {
                        // Limpieza de nombre de carrera
                        let fullRace = raceLink.closest('td').text().trim();
                        fullRace = fullRace.replace(/\s*(1|2)\.(UWT|Pro|1|2|Ncup|WC|CC)\b/ig, '').replace(/\s*\|\s*$/g, '').trim();
                        
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
                        if (!subInfo || subInfo.toUpperCase() === 'GC') {
                            entry.gc = pos;
                        } else {
                            entry.stages.push({ stage: subInfo, pos: pos });
                        }
                    }
                });
                calendarioFull[yearKey] = Array.from(yearMap.values());
            } catch (e) { console.log(`      ⚠️ Error en año ${yearKey}`); }
        };

        // Escanear ambos años
        await extraerAño(`${baseUrl}${riderUrl}`, "2026");
        const url2025 = riderUrl.includes('?') ? `${riderUrl}&y=2025` : `${riderUrl}?y=2025`;
        await extraerAño(`${baseUrl}${url2025}`, "2025");

        const total = calendarioFull["2026"].length + calendarioFull["2025"].length;
        console.log(`   └─ 📊 Extraídas: ${total} carreras agrupadas.`);
        return total > 0 ? JSON.stringify(calendarioFull) : null;
    } catch (error) {
        console.error(`   └─ ❌ Error crítico:`, error.message);
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
            headers: { 'User-Agent': 'Mozilla/5.0' },
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
                targetRiders.push({ name, team, points, profileUrl });
            }
        });

        for (let tName of trendingNames) {
            if (!targetRiders.find(r => normalizeName(r.name) === normalizeName(tName))) {
                const searchUrl = await searchRiderProfile(tName);
                if (searchUrl) targetRiders.push({ name: tName, team: 'Pro Rider', points: 0, profileUrl: searchUrl });
                await delay(1000);
            }
        }

        for (let rider of targetRiders) {
            if (rider.profileUrl) {
                rider.palmares = await fetchRiderResults(rider.profileUrl);
                await delay(2000); 
            }
        }

        await db.query("DELETE FROM ranking"); 
        for (const rider of targetRiders) {
            await db.query("INSERT INTO ranking (name, team, points, palmares) VALUES (?, ?, ?, ?)", [rider.name, rider.team, rider.points, rider.palmares]);
        }
        console.log("\n✅ [VELO BOT] PROCESO FINALIZADO CON ÉXITO.");
    } catch (error) { console.error("\n❌ Error:", error.message); }
}

cron.schedule('0 3 * * *', () => { updateRanking(); });
module.exports = { updateRanking };
