const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function normalizeName(name) {
    if (!name) return '';
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function smartFetch(targetUrl) {
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const { data } = await axios.get(proxyUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0' },
            timeout: 20000 
        });
        return data;
    } catch (error) {
        throw new Error(`Proxy bloqueado o timeout`);
    }
}

async function searchRiderProfile(riderName) {
    try {
        console.log(`   ├─ 🔎 Buscando a: ${riderName}`);
        const html = await smartFetch(`https://firstcycling.com/rider.php?q=${encodeURIComponent(riderName)}`);
        const $ = cheerio.load(html);
        return $('table.ws_tb tbody tr').first().find('a[href*="rider.php"]').attr('href') || null;
    } catch (e) { return null; }
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
            const raceLink = row.find('a[href*="race.php"]');
            
            if (raceLink.length > 0) {
                let pos = row.find('td').eq(1).text().trim();
                const isValidPos = pos && pos !== '-' && (/^\d+$/.test(pos) || ['DNF', 'DNS', 'OTL', 'DSQ'].includes(pos.toUpperCase()));

                if (isValidPos) {
                    let fullRaceName = raceLink.closest('td').text().replace(/\s+/g, ' ').trim();
                    let mainName = fullRaceName;
                    let subInfo = null;

                    // Separar el nombre de la carrera y el "extra"
                    if (fullRaceName.includes('|')) {
                        const parts = fullRaceName.split('|');
                        mainName = parts[0].trim();
                        subInfo = parts[1].trim();
                    }

                    // Comprobar si el "mainName" es solo una palabra suelta como "Overall" o "Points"
                    let isClassification = /^(overall|general|gc|points|puntos|mountains|montaña|youth|jóvenes|kom)$/i.test(mainName);
                    
                    // Si NO es una clasificación suelta, actualizamos la carrera actual
                    if (!isClassification && mainName !== '') {
                        currentMainRace = mainName;
                    }

                    if (!yearMap.has(currentMainRace)) {
                        yearMap.set(currentMainRace, { raceName: currentMainRace, gc: null, stages: [] });
                    }
                    const entry = yearMap.get(currentMainRace);

                    if (subInfo) {
                        // Comprobar si el "extra" es una etapa real o solo basura UCI (como WCRR, 1.UWT)
                        const isStageOrClass = /(stage|etapa|general|gc|overall|points|puntos|mountain|montaña|youth|jóvenes|prologue|prólogo|kom)/i.test(subInfo);
                        
                        if (isStageOrClass) {
                            if (/(general|gc|overall)/i.test(subInfo)) {
                                entry.gc = pos; // Es el resultado final
                            } else {
                                entry.stages.push({ stage: subInfo, pos: pos }); // Es una etapa
                            }
                        } else {
                            // Como no tiene la palabra "etapa" ni "general", asumimos que es el código UCI de una clásica
                            entry.gc = pos;
                        }
                    } else {
                        // Si no hay "extra" (|), comprobamos si era una palabra suelta
                        if (isClassification) {
                            if (/(general|gc|overall)/i.test(mainName)) {
                                entry.gc = pos;
                            } else {
                                entry.stages.push({ stage: mainName, pos: pos }); // Puntos, Montaña, etc.
                            }
                        } else {
                            entry.gc = pos; // Es una clásica sin código
                        }
                    }
                }
            }
        });

        // Limpiar
        return Array.from(yearMap.values()).filter(r => r.gc || r.stages.length > 0);
    } catch (e) { return []; }
}

async function fetchRiderResults(riderUrl) {
    const baseUrl = 'https://firstcycling.com/';
    console.log(`   └─ 🕵️‍♂️ Extrayendo: ${riderUrl}`);
    const data2026 = await getYearResults(baseUrl, riderUrl, 2026);
    await delay(1000); 
    const data2025 = await getYearResults(baseUrl, riderUrl, 2025);
    const total = data2026.length + data2025.length;
    console.log(`   └─ 📊 OK: ${total} carreras agrupadas limpias.`);
    return total > 0 ? JSON.stringify({ "2026": data2026, "2025": data2025 }) : null;
}

async function updateRanking() {
    console.log("\n🚀 [VELO BOT] INICIANDO ESCÁNER DE DATOS LIMPIOS");
    try {
        const [trendingDB] = await db.query("SELECT title FROM trending WHERE tipo = 'ciclista'");
        const trendingNames = trendingDB.map(r => r.title);
        const targetRiders = [];

        try {
            console.log("📡 Conectando con FirstCycling...");
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
        } catch (e) { console.log("⚠️ Falló ranking general. Modo Emergencia."); }

        for (let tName of trendingNames) {
            if (!targetRiders.find(r => normalizeName(r.name) === normalizeName(tName))) {
                const searchUrl = await searchRiderProfile(tName);
                if (searchUrl) {
                    targetRiders.push({ name: tName, team: 'Pro Rider', points: 0, profileUrl: searchUrl });
                    await delay(1500); 
                }
            }
        }

        if (targetRiders.length === 0) return;
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
        console.log("\n✅ [VELO BOT] BASE DE DATOS ACTUALIZADA CON ÉXITO.");
        
    } catch (error) { console.error("\n❌ Error Crítico Global:", error.message); }
}

cron.schedule('0 3 * * *', () => { updateRanking(); });
module.exports = { updateRanking };
