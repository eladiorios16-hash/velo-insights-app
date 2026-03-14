const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const db = require('./db');

// Función auxiliar para no saturar los servidores de FirstCycling
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Normalizar nombres para evitar duplicados entre tu BD y FirstCycling
function normalizeName(name) {
    if (!name) return '';
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// NUEVO: Función que usa el buscador de FC para encontrar a un ciclista cualquiera
async function searchRiderProfile(riderName) {
    try {
        console.log(`   ├─ 🔎 Buscando perfil oculto de: ${riderName}`);
        const { data } = await axios.get(`https://firstcycling.com/rider.php?q=${encodeURIComponent(riderName)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        // Coge el primer resultado de la tabla de búsqueda
        const firstResult = $('table.ws_tb tbody tr').first().find('a[href*="rider.php"]').attr('href');
        return firstResult || null;
    } catch (e) {
        return null;
    }
}

async function fetchRiderPalmares(riderUrl) {
    try {
        console.log(`   └─ 🕵️‍♂️ Extrayendo palmarés desde: ${riderUrl}`);
        
        const { data } = await axios.get(`https://firstcycling.com/${riderUrl}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
        });
        
        const $ = cheerio.load(data);
        const palmares = [];

        // ESTRATEGIA 1: Buscar la caja específica de "Top Results" (Incluye Podios importantes)
        $('h3').each((i, el) => {
            if ($(el).text().trim() === 'Top Results') {
                $(el).next('table').find('tr').each((j, tr) => {
                    if (palmares.length >= 6) return; 
                    
                    let race = $(tr).find('td').eq(1).text().trim();   
                    let years = $(tr).find('td').eq(2).text().trim();  
                    
                    if (race) {
                        let cleanWin = `${race} ${years}`.trim();
                        if (!palmares.includes(cleanWin)) palmares.push(cleanWin);
                    }
                });
            }
        });

        // ESTRATEGIA 2: Si no hay "Top Results", buscamos PODIOS (1º, 2º o 3º) en las tablas
        if (palmares.length === 0) {
            $('table.sortable tbody tr').each((i, tr) => {
                if (palmares.length >= 6) return;
                
                const pos1 = $(tr).find('td').eq(1).text().trim(); 
                const pos2 = $(tr).find('td').eq(2).text().trim(); 
                
                // Validamos si la posición es 1, 2 o 3 (o 1st, 2nd, 3rd)
                const isPodium = ['1','2','3','1st','2nd','3rd'].includes(pos1) || ['1','2','3','1st','2nd','3rd'].includes(pos2);
                
                if (isPodium) {
                    const raceNode = $(tr).find('a[href*="race.php"]').first();
                    const raceName = raceNode.text().trim();
                    const year = $(tr).find('td').eq(0).text().trim(); 
                    
                    if (raceName && raceName.length > 2) {
                        const shortYear = year.match(/^\d{4}$/) ? year.slice(-2) : year;
                        // Añadimos el puesto para que en la web se vea que fue podio y no victoria
                        const positionLabel = (pos1==='1'||pos2==='1'||pos1==='1st'||pos2==='1st') ? '' : ` (${pos1||pos2}º)`;
                        const entry = `${raceName} ('${shortYear})${positionLabel}`;
                        
                        if (!palmares.includes(entry)) palmares.push(entry);
                    }
                }
            });
        }

        return palmares.length > 0 ? JSON.stringify(palmares) : null;
    } catch (error) {
        console.error(`   └─ ❌ Error al leer palmarés de ${riderUrl}:`, error.message);
        return null;
    }
}

async function updateRanking() {
    console.log("🤖 [Velo Bot] Iniciando Escáner Global...");
    try {
        // 1. OBTENER CORREDORES DESTACADOS POR EL ADMIN (Tabla Trending)
        const [trendingDB] = await db.query("SELECT title FROM trending WHERE tipo = 'ciclista'");
        const trendingNames = trendingDB.map(r => r.title);
        console.log(`📋 [Velo Bot] Encontrados ${trendingNames.length} ciclistas manuales en el Panel Admin.`);

        // 2. DESCARGAR EL RANKING UCI (Top 30 para tener una buena base)
        const { data } = await axios.get('https://firstcycling.com/ranking.php', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000 
        });
        const $ = cheerio.load(data);
        const targetRiders = [];

        $('table tbody tr').each((index, element) => {
            if (targetRiders.length >= 30) return false; // Guardamos el Top 30

            const riderLink = $(element).find('a[href*="rider.php"]');
            if (riderLink.length > 0) {
                let name = riderLink.text().trim();
                const profileUrl = riderLink.attr('href');
                const teamLink = $(element).find('a[href*="team.php"]');
                const team = teamLink.length > 0 ? teamLink.text().trim() : 'Independiente';
                const pointsStr = $(element).find('td').last().text().trim().replace(/[\.,\s]/g, '');
                const points = parseInt(pointsStr) || 0;

                // Formateo del nombre: "POGAČAR Tadej" -> "Tadej POGAČAR"
                if (name.match(/^[A-ZÁÉÍÓÚÑÄËÏÖÜ]+ [A-Z]/)) { 
                     const parts = name.split(' ');
                     const lastName = parts.shift();
                     name = `${parts.join(' ')} ${lastName}`;
                }

                if (name && points > 0) {
                    targetRiders.push({ name, team, points, profileUrl });
                }
            }
        });

        // 3. FUSIONAR LISTAS: Si un ciclista manual NO está en el Top 30, lo buscamos y lo añadimos
        for (let tName of trendingNames) {
            const exists = targetRiders.find(r => normalizeName(r.name) === normalizeName(tName));
            if (!exists) {
                const searchUrl = await searchRiderProfile(tName);
                if (searchUrl) {
                    targetRiders.push({
                        name: tName,
                        team: 'Pro Rider', // ciclista.html lo sobrescribirá con tu base de datos de equipos
                        points: 0,         // Al no estar en el top, le ponemos 0 puntos temporalmente
                        profileUrl: searchUrl
                    });
                    await delay(1500); // Respetar el servidor
                } else {
                    console.log(`   ├─ ⚠️ No se encontró perfil para: ${tName}`);
                }
            }
        }

        console.log(`🔍 [Velo Bot] Lista final: ${targetRiders.length} corredores. Iniciando Deep Scan de Palmarés...`);

        // 4. EXTRAER PALMARÉS PARA TODOS
        for (let rider of targetRiders) {
            if (rider.profileUrl) {
                rider.palmares = await fetchRiderPalmares(rider.profileUrl);
                await delay(2500); // Retraso de seguridad
            } else {
                rider.palmares = null;
            }
        }

        // 5. GUARDAR TODO EN LA BASE DE DATOS
        console.log("💾 [Velo Bot] Guardando datos en MySQL...");
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
        console.log(`✅ [Velo Bot] MISIÓN CUMPLIDA. Ranking y Palmarés guardados con éxito.`);

    } catch (error) {
        console.error("❌ [Velo Bot] Error Fatal:", error.message);
    }
}

// Ejecutar automáticamente todos los días a las 03:00 AM
cron.schedule('0 3 * * *', () => {
    updateRanking();
});

module.exports = { updateRanking };
