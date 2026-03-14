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
        console.log(`   └─ 🕵️‍♂️ Extrayendo resultados desde: ${riderUrl}`);
        
        const baseUrl = 'https://firstcycling.com/';
        let { data } = await axios.get(`${baseUrl}${riderUrl}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0' },
            timeout: 15000
        });
        
        // FUNCIÓN INTERNA PARA EXTRAER LA TABLA SEA CUAL SEA SU CLASE
        const extraerTabla = (htmlEl) => {
            const res = [];
            // Buscamos en todas las filas de tabla
            htmlEl('table tr').each((i, row) => {
                if (res.length >= 8) return; // Máximo 8 resultados
                
                const tds = htmlEl(row).find('td');
                if (tds.length < 3) return; // Si la fila no tiene columnas suficientes, saltamos

                let pos = tds.eq(1).text().trim(); // Puesto (Columna 2)
                const raceLink = htmlEl(row).find('a[href*="race.php"]'); // Enlace de la carrera
                
                // Validamos que exista carrera y que la posición sea válida (Número o DNF/DNS/OTL)
                if (raceLink.length > 0 && pos) {
                    if (/^\d+$/.test(pos) || ['DNF', 'DNS', 'OTL', 'DSQ'].includes(pos.toUpperCase())) {
                        let raceText = raceLink.closest('td').text().trim();
                        
                        // 1. Limpiamos códigos UCI (Ej: "1.UWT", "2.Pro", etc.)
                        raceText = raceText.replace(/\s*(1|2)\.(UWT|Pro|1|2|Ncup|WC|CC)\b/ig, '').trim();
                        // 2. Limpiamos barras verticales sueltas al final (Ej: "Omloop | " -> "Omloop")
                        raceText = raceText.replace(/\s*\|\s*$/g, '').trim();
                        // 3. Cambiamos las barras intermedias por guiones (Ej: "Paris-Nice | 7º Etapa" -> "Paris-Nice - 7º Etapa")
                        raceText = raceText.replace(/\s*\|\s*/g, ' - ').trim();
                        // 4. Limpiamos espacios dobles y guiones finales huérfanos
                        raceText = raceText.replace(/\s+/g, ' ').replace(/-$/, '').trim();

                        res.push({ posicion: pos, carrera: raceText });
                    }
                }
            });
            return res;
        };

        let resultados = extraerTabla(cheerio.load(data));

        // MAGIA DEL CALENDARIO: Si este año ha corrido poco (< 8 carreras), vamos a 2025 a rellenar
        if (resultados.length < 8) {
            console.log(`   └─ 🔄 Pocos resultados (${resultados.length}). Escaneando temporada 2025...`);
            let prevYearUrl = riderUrl.includes('?') ? `${riderUrl}&y=2025` : `${riderUrl}?y=2025`;
            try {
                let res2025 = await axios.get(`${baseUrl}${prevYearUrl}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0' }, 
                    timeout: 15000
                });
                
                const resultados2025 = extraerTabla(cheerio.load(res2025.data));
                
                // Añadimos los de 2025 hasta llegar al límite de 8
                for (let r of resultados2025) {
                    if (resultados.length < 8) resultados.push(r);
                }
            } catch (e) {
                console.log(`   └─ ⚠️ No se pudo cargar 2025: ${e.message}`);
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
