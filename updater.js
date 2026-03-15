const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeName(name) {
    if (!name) return '';
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// NUEVO MOTOR DE NAVEGACIÓN: Enmascara la IP de Railway usando un Proxy gratuito
async function smartFetch(targetUrl) {
    try {
        // Usamos AllOrigins para saltarnos el bloqueo 403 de Cloudflare/FirstCycling
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const { data } = await axios.get(proxyUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0' },
            timeout: 20000 // Le damos más tiempo porque tiene que dar un salto extra
        });
        return data;
    } catch (error) {
        throw new Error(`Proxy bloqueado o timeout en: ${targetUrl}`);
    }
}

async function searchRiderProfile(riderName) {
    try {
        console.log(`   ├─ 🔎 Buscando a: ${riderName} (Vía Proxy)`);
        const html = await smartFetch(`https://firstcycling.com/rider.php?q=${encodeURIComponent(riderName)}`);
        const $ = cheerio.load(html);
        return $('table.ws_tb tbody tr').first().find('a[href*="rider.php"]').attr('href') || null;
    } catch (e) { 
        console.log(`   ├─ ⚠️ Búsqueda fallida para ${riderName}`);
        return null; 
    }
}

async function getYearResults(baseUrl, riderUrl, year) {
    try {
        const finalUrl = `${baseUrl}${riderUrl}${riderUrl.includes('?') ? '&' : '?'}y=${year}`;
        const html = await smartFetch(finalUrl);
        
        const $ = cheerio.load(html);
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
    await delay(1000); 
    const data2025 = await getYearResults(baseUrl, riderUrl, 2025);

    const calendarioFull = { "2026": data2026, "2025": data2025 };
    const total = data2026.length + data2025.length;
    console.log(`   └─ 📊 Misión OK: ${total} carreras extraídas.`);
    return total > 0 ? JSON.stringify(calendarioFull) : null;
}

async function updateRanking() {
    console.log("\n🚀 [VELO BOT] INICIANDO ESCÁNER VÍA TÚNEL PROXY");
    try {
        const [trendingDB] = await db.query("SELECT title FROM trending WHERE tipo = 'ciclista'");
        const trendingNames = trendingDB.map(r => r.title);
        const targetRiders = [];

        try {
            console.log("📡 Conectando con FirstCycling Ranking (Proxy)...");
            const html = await smartFetch('https://firstcycling.com/ranking.php');
            const $ = cheerio.load(html);
            
            $('table tbody tr').each((index, element) => {
                if (targetRiders.length >= 20) return false; 
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
            console.log("⚠️ Proxy falló en el ranking general. Activando Modo Emergencia (Solo ciclistas manuales).");
        }

        for (let tName of trendingNames) {
            if (!targetRiders.find(r => normalizeName(r.name) === normalizeName(tName))) {
                const searchUrl = await searchRiderProfile(tName);
                if (searchUrl) {
                    targetRiders.push({ name: tName, team: 'Pro Rider', points: 0, profileUrl: searchUrl });
                    await delay(1500); 
                }
            }
        }

        if (targetRiders.length === 0) {
            console.log("❌ No hay ciclistas que procesar. Abortando.");
            return;
        }

        console.log(`\n🔍 Procesando el calendario de ${targetRiders.length} ciclistas...`);

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
        console.log("\n✅ [VELO BOT] BASE DE DATOS ACTUALIZADA CON ÉXITO A TRAVÉS DEL PROXY.");
        
    } catch (error) { console.error("\n❌ Error Crítico Global:", error.message); }
}

cron.schedule('0 3 * * *', () => { updateRanking(); });
module.exports = { updateRanking };
