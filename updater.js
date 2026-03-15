const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeName(name) {
    if (!name) return '';
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const reqHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Referer': 'https://firstcycling.com/'
};

async function searchRiderProfile(riderName) {
    try {
        console.log(`   ├─ 🔎 Buscando a: ${riderName}`);
        const { data } = await axios.get(`https://firstcycling.com/rider.php?q=${encodeURIComponent(riderName)}`, { headers: reqHeaders, timeout: 10000 });
        const $ = cheerio.load(data);
        return $('table.ws_tb tbody tr').first().find('a[href*="rider.php"]').attr('href') || null;
    } catch (e) { return null; }
}

async function getYearResults(baseUrl, riderUrl, year) {
    try {
        const finalUrl = `${baseUrl}${riderUrl}${riderUrl.includes('?') ? '&' : '?'}y=${year}`;
        const { data } = await axios.get(finalUrl, { headers: reqHeaders, timeout: 15000 });
        
        const $ = cheerio.load(data);
        const yearMap = new Map();
        let currentMainRace = `Temporada ${year}`;

        // Escaneo robusto: buscamos CUALQUIER fila (tr) que tenga un enlace a una carrera
        $('tr').each((i, el) => {
            const row = $(el);
            const raceLink = row.find('a[href*="race.php"]').first();
            
            if (raceLink.length > 0) {
                const raceCell = raceLink.closest('td');
                let fullText = raceCell.text().trim();
                
                // Limpieza de basura UCI (ej: "Tirreno-Adriatico 2.UWT" -> "Tirreno-Adriatico")
                fullText = fullText.replace(/\s*\|?\s*\d\.(UWT|Pro|1|2|Ncup|WC|CC|HC|NE)\b/ig, '').trim();
                
                // Detectar si es cabecera de carrera (Suele tener la bandera/img y NO tener el separador '|')
                const hasFlag = raceCell.find('img').length > 0 || raceCell.find('.icon').length > 0;
                
                if (hasFlag && !fullText.includes('|')) {
                    currentMainRace = fullText;
                    if (!yearMap.has(currentMainRace)) {
                        yearMap.set(currentMainRace, { raceName: currentMainRace, gc: null, stages: [] });
                    }
                }

                // Extraer la posición (Casi siempre es la segunda columna, eq(1))
                let pos = row.find('td').eq(1).text().trim();
                
                // Validar si la posición es real (un número o abandono)
                const isValidPos = pos && pos !== '-' && (/^\d+$/.test(pos) || ['DNF', 'DNS', 'OTL', 'DSQ'].includes(pos.toUpperCase()));

                if (isValidPos) {
                    if (!yearMap.has(currentMainRace)) {
                        yearMap.set(currentMainRace, { raceName: currentMainRace, gc: null, stages: [] });
                    }
                    const entry = yearMap.get(currentMainRace);

                    // Si es la General (GC) o es una clásica de un solo día
                    if (fullText.toLowerCase().includes('general') || fullText.toLowerCase().includes('gc') || fullText === currentMainRace) {
                        entry.gc = pos;
                    } else {
                        // Es una etapa
                        let stageName = fullText.includes('|') ? fullText.split('|')[1].trim() : fullText;
                        entry.stages.push({ stage: stageName, pos: pos });
                    }
                }
            }
        });

        // Limpiar carreras vacías
        return Array.from(yearMap.values()).filter(r => r.gc || r.stages.length > 0);
    } catch (e) {
        console.log(`      ⚠️ Error en ${year}: ${e.message}`);
        return [];
    }
}

async function fetchRiderResults(riderUrl) {
    const baseUrl = 'https://firstcycling.com/';
    console.log(`   └─ 🕵️‍♂️ Extrayendo: ${riderUrl}`);
    
    // Secuencial con pausas para camuflaje humano
    const data2026 = await getYearResults(baseUrl, riderUrl, 2026);
    await delay(1500); 
    const data2025 = await getYearResults(baseUrl, riderUrl, 2025);

    const calendarioFull = { "2026": data2026, "2025": data2025 };
    const total = data2026.length + data2025.length;
    console.log(`   └─ 📊 Misión OK: ${total} carreras extraídas.`);
    return total > 0 ? JSON.stringify(calendarioFull) : null;
}

async function updateRanking() {
    console.log("\n🚀 [VELO BOT] INICIANDO ESCÁNER DEFINITIVO V4");
    try {
        const [trendingDB] = await db.query("SELECT title FROM trending WHERE tipo = 'ciclista'");
        const trendingNames = trendingDB.map(r => r.title);

        const { data } = await axios.get('https://firstcycling.com/ranking.php', { headers: reqHeaders, timeout: 15000 });
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
                await delay(2000);
            }
        }

        console.log(`🔍 Procesando el calendario de ${targetRiders.length} ciclistas...`);

        for (let rider of targetRiders) {
            if (rider.profileUrl) {
                rider.palmares = await fetchRiderResults(rider.profileUrl);
                // PAUSA VITAL: 3 segundos para que no nos baneen
                await delay(3000); 
            }
        }

        await db.query("DELETE FROM ranking"); 
        for (const rider of targetRiders) {
            await db.query("INSERT INTO ranking (name, team, points, palmares) VALUES (?, ?, ?, ?)", [rider.name, rider.team, rider.points, rider.palmares]);
        }
        console.log("\n✅ [VELO BOT] SINCRONIZACIÓN PERFECTA. Base de datos actualizada.");
    } catch (error) { console.error("\n❌ Error Crítico:", error.message); }
}

cron.schedule('0 3 * * *', () => { updateRanking(); });
module.exports = { updateRanking };
