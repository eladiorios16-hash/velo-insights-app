const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeName(name) {
    if (!name) return '';
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// CABECERAS DE CAMUFLAJE EXTREMO (Para evitar el Error 403)
const reqHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
};

async function searchRiderProfile(riderName) {
    try {
        console.log(`   ├─ 🔎 Buscando a: ${riderName}`);
        const { data } = await axios.get(`https://firstcycling.com/rider.php?q=${encodeURIComponent(riderName)}`, { headers: reqHeaders, timeout: 12000 });
        const $ = cheerio.load(data);
        return $('table.ws_tb tbody tr').first().find('a[href*="rider.php"]').attr('href') || null;
    } catch (e) { 
        console.log(`   ├─ ⚠️ Búsqueda bloqueada para ${riderName}`);
        return null; 
    }
}

async function getYearResults(baseUrl, riderUrl, year) {
    try {
        const finalUrl = `${baseUrl}${riderUrl}${riderUrl.includes('?') ? '&' : '?'}y=${year}`;
        const { data } = await axios.get(finalUrl, { headers: reqHeaders, timeout: 15000 });
        
        const $ = cheerio.load(data);
        const yearMap = new Map();
        let currentMainRace = `Temporada ${year}`;

        $('tr').each((i, el) => {
            const row = $(el);
            const raceLink = row.find('a[href*="race.php"]').first();
            
            if (raceLink.length > 0) {
                const raceCell = raceLink.closest('td');
                let fullText = raceCell.text().trim();
                
                fullText = fullText.replace(/\s*\|?\s*\d\.(UWT|Pro|1|2|Ncup|WC|CC|HC|NE)\b/ig, '').trim();
                const hasFlag = raceCell.find('img').length > 0 || raceCell.find('.icon').length > 0;
                
                if (hasFlag && !fullText.includes('|')) {
                    currentMainRace = fullText;
                    if (!yearMap.has(currentMainRace)) yearMap.set(currentMainRace, { raceName: currentMainRace, gc: null, stages: [] });
                }

                let pos = row.find('td').eq(1).text().trim();
                const isValidPos = pos && pos !== '-' && (/^\d+$/.test(pos) || ['DNF', 'DNS', 'OTL', 'DSQ'].includes(pos.toUpperCase()));

                if (isValidPos) {
                    if (!yearMap.has(currentMainRace)) yearMap.set(currentMainRace, { raceName: currentMainRace, gc: null, stages: [] });
                    const entry = yearMap.get(currentMainRace);

                    if (fullText.toLowerCase().includes('general') || fullText.toLowerCase().includes('gc') || fullText === currentMainRace) {
                        entry.gc = pos;
                    } else {
                        let stageName = fullText.includes('|') ? fullText.split('|')[1].trim() : fullText;
                        entry.stages.push({ stage: stageName, pos: pos });
                    }
                }
            }
        });

        return Array.from(yearMap.values()).filter(r => r.gc || r.stages.length > 0);
    } catch (e) {
        console.log(`      ⚠️ Error en ${year}: ${e.message}`);
        return [];
    }
}

async function fetchRiderResults(riderUrl) {
    const baseUrl = 'https://firstcycling.com/';
    console.log(`   └─ 🕵️‍♂️ Extrayendo: ${riderUrl}`);
    
    const data2026 = await getYearResults(baseUrl, riderUrl, 2026);
    await delay(2000); 
    const data2025 = await getYearResults(baseUrl, riderUrl, 2025);

    const calendarioFull = { "2026": data2026, "2025": data2025 };
    const total = data2026.length + data2025.length;
    console.log(`   └─ 📊 Misión OK: ${total} carreras extraídas.`);
    return total > 0 ? JSON.stringify(calendarioFull) : null;
}

async function updateRanking() {
    console.log("\n🚀 [VELO BOT] INICIANDO ESCÁNER ANTI-BLOQUEO V5");
    try {
        const [trendingDB] = await db.query("SELECT title FROM trending WHERE tipo = 'ciclista'");
        const trendingNames = trendingDB.map(r => r.title);
        const targetRiders = [];

        // 1. INTENTAR CONSEGUIR EL RANKING GLOBAL
        try {
            console.log("📡 Conectando con FirstCycling Ranking...");
            const { data } = await axios.get('https://firstcycling.com/ranking.php', { headers: reqHeaders, timeout: 15000 });
            const $ = cheerio.load(data);
            
            $('table tbody tr').each((index, element) => {
                if (targetRiders.length >= 20) return false; // Límite bajado a 20 para ser menos sospechosos
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
            console.log(`✅ Ranking obtenido: ${targetRiders.length} ciclistas.`);
        } catch (e) {
            console.log("⚠️ ALERTA 403: Firewall bloqueó el ranking general. Activando Modo Emergencia (Solo ciclistas manuales).");
        }

        // 2. AÑADIR CICLISTAS MANUALES (ESTADO DE FORMA)
        for (let tName of trendingNames) {
            if (!targetRiders.find(r => normalizeName(r.name) === normalizeName(tName))) {
                const searchUrl = await searchRiderProfile(tName);
                if (searchUrl) {
                    targetRiders.push({ name: tName, team: 'Pro Rider', points: 0, profileUrl: searchUrl });
                    await delay(3000); // Pausa grande en búsquedas
                }
            }
        }

        if (targetRiders.length === 0) {
            console.log("❌ No hay ciclistas que procesar. Abortando misión para no gastar recursos.");
            return;
        }

        console.log(`\n🔍 Procesando el calendario de ${targetRiders.length} ciclistas...`);

        // 3. EXTRAER EL CALENDARIO DE CADA UNO
        for (let rider of targetRiders) {
            if (rider.profileUrl) {
                rider.palmares = await fetchRiderResults(rider.profileUrl);
                await delay(4000); // PAUSA VITAL DE 4 SEGUNDOS (Casi imposible de detectar como bot)
            }
        }

        // 4. GUARDADO EN BASE DE DATOS
        if (targetRiders.length > 0) {
            await db.query("DELETE FROM ranking"); 
            for (const rider of targetRiders) {
                await db.query("INSERT INTO ranking (name, team, points, palmares) VALUES (?, ?, ?, ?)", [rider.name, rider.team, rider.points, rider.palmares]);
            }
            console.log("\n✅ [VELO BOT] BASE DE DATOS ACTUALIZADA CON ÉXITO.");
        }
        
    } catch (error) { console.error("\n❌ Error Crítico Global:", error.message); }
}

cron.schedule('0 3 * * *', () => { updateRanking(); });
module.exports = { updateRanking };
