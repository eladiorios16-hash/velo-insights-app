require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();

// 1. CONFIGURACIÓN
app.use(cors());
app.use(express.json());

// 2. SEGURIDAD (Basic Auth)
const authMiddleware = (req, res, next) => {
    const auth = { login: 'admin', password: 'velo2026' }; 
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Area Restringida Velo"');
    res.status(401).send('⛔ ACCESO DENEGADO');
};

// 3. RUTAS DE SISTEMA
app.get('/admin', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- RUTA DE REPARACIÓN DE TABLAS ---
app.get('/setup-tables', async (req, res) => {
    try {
        const queries = [
            `CREATE TABLE IF NOT EXISTS noticias (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255), tag VARCHAR(50), date VARCHAR(50), 
                image TEXT, \`lead\` TEXT, content TEXT, isHero BOOLEAN DEFAULT 0
            )`,
            `CREATE TABLE IF NOT EXISTS equipos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100), code VARCHAR(10), country VARCHAR(50), 
                jersey TEXT, riders_json LONGTEXT
            )`,
            `CREATE TABLE IF NOT EXISTS calendario (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100), status VARCHAR(20), date VARCHAR(50), 
                dateISO DATE, endDateISO DATE, category VARCHAR(10), details LONGTEXT, winner VARCHAR(100)
            )`,
            `CREATE TABLE IF NOT EXISTS ranking (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100), team VARCHAR(100), points INT, 
                \`rank\` INT, trend VARCHAR(10), profile LONGTEXT
            )`,
            `CREATE TABLE IF NOT EXISTS glosario (
                id INT AUTO_INCREMENT PRIMARY KEY,
                term VARCHAR(100), cat VARCHAR(50), definition TEXT
            )`
        ];
        for (const q of queries) await db.query(q);
        res.send("✅ Tablas reparadas correctamente.");
    } catch (e) { res.status(500).send("❌ Error: " + e.message); }
});

// --- RUTA DE RESTAURACIÓN DE CALENDARIO ---
app.get('/restore-calendar-backup', async (req, res) => {
    try {
        await db.query("TRUNCATE TABLE calendario");
        const sql = "INSERT INTO calendario (id, name, date, category, details, dateISO, endDateISO, winner, status) VALUES ?";
        const values = [
            [1, 'Santos Tour Down Under', '20-25 Ene', 'WT', '{"stages":[{"n":1,"type":"tt","route":"Prologo","km":3.8,"gain":69,"image":"https://www.ciclo21.com/wp-content/uploads/2025/07/Down-Under-Prologo.jpg"},{"n":2,"type":"mediamontaña","route":"Tanuda > Tanuda","km":120.6,"gain":1107,"image":"https://www.ciclo21.com/wp-content/uploads/2025/07/Down-Under-1.png"},{"n":3,"type":"mediamontaña","route":"Norwood > Uraidla","km":148.1,"gain":2787,"image":"https://www.ciclo21.com/wp-content/uploads/2025/07/Down-Under-2.png"},{"n":4,"type":"mediamontaña","route":"Playa Endley > Nairne","km":140.8,"gain":1919,"image":"https://www.ciclo21.com/wp-content/uploads/2025/07/Down-Under-3.png"},{"n":5,"type":"mediamontaña","route":"Brighton > Willunga","km":176,"gain":1458,"image":"https://www.ciclo21.com/wp-content/uploads/2025/07/Down-Under-4.png"},{"n":6,"type":"mediamontaña","route":"Stirling > Stirling","km":169.8,"gain":2992,"image":"https://www.ciclo21.com/wp-content/uploads/2025/07/Down-Under-5.png"}],"winner":"Jay Vine"}', '2026-01-20', '2026-01-25', 'Jay Vine', 'Finished'],
            [2, 'Cadel Evans Great Ocean Race', '01 Feb', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"Geelong Circuit","km":182.3,"gain":1938,"image":"https://www.ciclo21.com/wp-content/uploads/2025/12/Altimetria-c-Cadel-Evans.jpg"}],"winner":"Tobias Andresen"}', '2026-02-01', '2026-02-01', 'Tobias Andresen', 'Finished'],
            [3, 'UAE Tour', '16-22 Feb', 'WT', '{"stages":[{"n":"1","type":"llano","route":"Madinat Zayed > Liwa Palace","km":"144","gain":"100","image":"https://www.ciclo21.com/wp-content/uploads/2026/01/UAE-1.webp"},{"n":"2","type":"tt","route":"Al Hudayriyat (CRI)","km":"12.2","gain":"10","image":"https://www.ciclo21.com/wp-content/uploads/2026/01/UAE-2.webp"},{"n":"3","type":"montaña","route":"Umm Al Quwai > Jebel Mobrah","km":"183","gain":"1450","image":"https://www.ciclo21.com/wp-content/uploads/2026/01/UAE-3.webp"},{"n":"4","type":"llano","route":"Fujairah > Fujairah","km":"182","gain":"150","image":"https://www.ciclo21.com/wp-content/uploads/2026/01/UAE-4.webp"},{"n":"5","type":"llano","route":"Dubai Al Mamzar","km":"166","gain":"150","image":"https://www.ciclo21.com/wp-content/uploads/2026/01/UAE-5.webp"},{"n":"6","type":"mediamontaña","route":"Al Ain > Jebel Hafeet","km":"168","gain":920,"image":"https://www.ciclo21.com/wp-content/uploads/2026/01/UAE-6.webp"},{"n":"7","type":"llano","route":"Abu Dhabi Breakwater","km":"149","gain":"50","image":"https://www.ciclo21.com/wp-content/uploads/2026/01/UAE-7.webp"}]}', '2026-02-16', '2026-02-22', null, 'Upcoming'],
            [4, 'Omloop Het Nieuwsblad', '28 Feb', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"Sint-Martens-Latem > Ninove","km":207.6,"gain":1600,"image":"https://files.onlycycling.com/onlycycling-files/media/profiles/2026/omloop-het-nieuwsblad-2026-profile.png"}]}', '2026-02-28', '2026-02-28', null, 'Upcoming'],
            [5, 'Strade Bianche', '07 Mar', 'Clásica', '{"stages":[{"n":1,"type":"mediamontaña","route":"Siena > Siena","km":201,"gain":3100,"image":"https://www.ciclo21.com/wp-content/uploads/2026/01/Strade-Bianche-2026-Altimetria.webp"}]}', '2026-03-07', '2026-03-07', null, 'Upcoming'],
            [6, 'Paris-Nice', '08-15 Mar', 'WT', '{"stages":[{"n":1,"type":"llano","route":" Achères > Carrières-sous-Poissy","km":"171,2","gain":"0","image":" https://www.ciclo21.com/wp-content/uploads/2025/12/Paris-Niza-Etapa-1.jpg"},{"n":2,"type":"llano","route":"Épône > Montargis","km":"187","gain":"0","image":" https://www.ciclo21.com/wp-content/uploads/2025/12/Paris-Niza-Etapa-2.jpg"},{"n":3,"type":"tt","route":"Cosne-Cours-sur-Loire > Pouilly-sur-Loire","km":"23,5","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/Paris-Niza-Etapa-3.jpg"},{"n":4,"type":"llano","route":"Bourges > Uchon","km":"195","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/Paris-Niza-Etapa-4.jpg"},{"n":5,"type":"llano","route":"Cormoranche-sur-Saône > Colombier-le-Vieux","km":"205","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/Paris-Niza-Etapa-5.jpg"},{"n":6,"type":"llano","route":"Barbentane > Apt","km":"179,3","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/Paris-Niza-Etapa-6.jpg"},{"n":7,"type":"llano","route":"Nice > Auron","km":"138","gain":"0","image":" https://www.ciclo21.com/wp-content/uploads/2025/12/Paris-Niza-Etapa-7.jpg"},{"n":8,"type":"llano","route":"Nice > Nice","km":"145","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/Paris-Niza-Etapa-8.jpg "}]}', '2026-03-08', '2026-03-15', null, 'Upcoming'],
            [7, 'Tirreno-Adriatico', '09-15 Mar', 'WT', '{"stages":[{"n":1,"type":"tt","route":"Lido di Camaiore > Lido di Camaiore","km":"11,5","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2026/01/Tirreno-Adriatico-1.jpg"},{"n":2,"type":"llano","route":"Camaiore > San Gimignano","km":"206","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2026/01/Tirreno-Adriatico-2.jpg"},{"n":3,"type":"llano","route":"Cortona > Magliano dé Marsi","km":"225","gain":"0", "image":"https://www.ciclo21.com/wp-content/uploads/2026/01/Tirreno-Adriatico-3.jpg"},{"n":4,"type":"mediamontaña","route":"Tagliacozzo > Martinsicuro","km":"210","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2026/01/Tirreno-Adriatico-4.jpg"},{"n":5,"type":"mediamontaña","route":"Marotta-Mondolfo > Mombaroccio","km":"186","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2026/01/Tirreno-Adriatico-5.jpg"},{"n":6,"type":"montaña","route":"San Severino Marche > Camerino","km":"189","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2026/01/Tirreno-Adriatico-6.jpg"},{"n":7,"type":"llano","route":"Civitanova Marche > San Benedetto del Tronto","km":"143","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2026/01/Tirreno-Adriatico-7.jpg"}]}', '2026-03-09', '2026-03-15', null, 'Upcoming'],
            [8, 'Milano-Sanremo', '21 Mar', 'WT', '{"stages":[{"n":1,"type":"llano","route":"Pavia > Sanremo","km":293,"gain":2100,"image":"https://ciclored.com/wp-content/uploads/2022/02/Altimetria_milan_sanremo.jpg"}]}', '2026-03-21', '2026-03-21', null, 'Upcoming'],
            [9, 'Volta a Catalunya', '23-29 Mar', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"Sant Feliu de Guíxols > Sant Feliu de Guíxols","km":"172","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2026/02/volta1.png"},{"n":2,"type":"mediamontaña","route":"Figueres > Banyoles","km":"167","gain":" ","image":"https://www.ciclo21.com/wp-content/uploads/2026/02/volta2.jpg"},{"n":3,"type":"mediamontaña","route":"Mont-roig del Camp > Vila-seca","km":"159","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2026/02/volta3.jpg"},{"n":4,"type":"montaña","route":"Mataró > Vallter","km":"173","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2026/02/volta4.png"},{"n":5,"type":"montaña","route":"La Seu d’Urgell > La Molina / Coll de Pal","km":"155","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2026/02/volta5.png"},{"n":6,"type":"montaña","route":"Berga > Queralt","km":"158","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2026/02/volta6.png"},{"n":7,"type":"mediamontaña","route":"Barcelona > Barcelona","km":"95","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2026/02/volta7.png"}]}', '2026-03-23', '2026-03-29', null, 'Upcoming'],
            [10, 'Classic Brugge-De Panne', '25 Mar', 'WT', '{"stages":[{"n":1,"type":"llano","route":"De Panne","km":200,"gain":300}]}', '2026-03-25', '2026-03-25', null, 'Upcoming'],
            [11, 'E3 Saxo Classic', '27 Mar', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"Harelbeke","km":205,"gain":1800}]}', '2026-03-27', '2026-03-27', null, 'Upcoming'],
            [12, 'Gent-Wevelgem', '29 Mar', 'WT', '{"stages":[{"n":1,"type":"llano","route":"Wevelgem","km":253,"gain":1300}]}', '2026-03-29', '2026-03-29', null, 'Upcoming'],
            [13, 'Dwars door Vlaanderen', '01 Abr', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"Waregem","km":188,"gain":1100}]}', '2026-04-01', '2026-04-01', null, 'Upcoming'],
            [14, 'Ronde van Vlaanderen', '05 Abr', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"Oudenaarde","km":270,"gain":2300}]}', '2026-04-05', '2026-04-05', null, 'Upcoming'],
            [15, 'Itzulia Basque Country', '06-11 Abr', 'WT', '{"stages":[{"n":1,"type":"tt","route":"Irun","km":10,"gain":150}]}', '2026-04-06', '2026-04-11', null, 'Upcoming'],
            [16, 'Paris-Roubaix', '12 Abr', 'WT', '{"stages":[{"n":1,"type":"llano","route":"Roubaix","km":260,"gain":800}]}', '2026-04-12', '2026-04-12', null, 'Upcoming'],
            [17, 'Amstel Gold Race', '19 Abr', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"Valkenburg","km":255,"gain":3200}]}', '2026-04-19', '2026-04-19', null, 'Upcoming'],
            [18, 'La Flèche Wallonne', '22 Abr', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"Mur de Huy","km":195,"gain":2900}]}', '2026-04-22', '2026-04-22', null, 'Upcoming'],
            [19, 'Liège-Bastogne-Liège', '26 Abr', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"Liège","km":259,"gain":4200}]}', '2026-04-26', '2026-04-26', null, 'Upcoming'],
            [20, 'Tour de Romandie', '28 Abr - 03 May', 'WT', '{"stages":[{"n":1,"type":"tt","km":10},{"n":2,"type":"llano","km":200},{"n":3,"type":"llano","km":200},{"n":4,"type":"llano","km":200},{"n":5,"type":"llano","km":200},{"n":6,"type":"llano","km":200}]}', '2026-04-28', '2026-05-03', null, 'Upcoming'],
            [21, 'Giro d\'Italia', '08-31 May', 'WT', '{"stages":[{"n":1,"type":"llano","route":"Nessebar (Bulgaria) – Burgas (Bulgaria)","km":"156","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia1.avif"},{"n":2,"type":"llano","route":"Burgas (Bulgaria)-Veliko Tarnovo(Bulgaria)","km":"220","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia2.jpg"},{"n":3,"type":"mediamontaña","route":"Plovdiv (Bulgaria) – Sofía (Bulgaria)","km":"174","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia3.jpg"},{"n":4,"type":"mediamontaña","route":"Catanzaro > Cosenza","km":144,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia4.jpg"},{"n":5,"type":"mediamontaña","route":"Praia a Mare > Potenza","km":204,"gain":"0 ","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia5.jpg"},{"n":6,"type":"llano","route":"Paestum > Nápoles","km":161,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia6.avif"},{"n":7,"type":"montaña","route":"Formia > Blockhaus","km":246,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia7.jpg"},{"n":8,"type":"llano","route":"Chieti > Fermo","km":159,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia8.avif"},{"n":9,"type":"montaña","route":"Cervia > Corno alle Scale","km":184,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia9.avif"},{"n":10,"type":"tt","route":"Viareggio > Massa","km":40.2,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia10.avif"},{"n":11,"type":"mediamontaña","route":"Porcari > Chiavari","km":178,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia11.jpg"},{"n":12,"type":"llano","route":"Imperia > Nueva Liguria","km":177,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia12.jpg"},{"n":13,"type":"llano","route":"Alejandría > Verbania","km":186,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia13.avif"},{"n":14,"type":"montaña","route":"Aosta > Pila","km":133,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia14.avif"},{"n":15,"type":"llano","route":"Voghera > Milán","km":136,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia15.avif"},{"n":16,"type":"montaña","route":"Bellinzona > Cari","km":113,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia16.avif"},{"n":17,"type":"mediamontaña","route":"Cassano d’Adda > Andalo","km":200,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia17.avif"},{"n":18,"type":"llano","route":"Fai della Paganella > Pieve di Soligo","km":167,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia18.avif"},{"n":19,"type":"montaña","route":"Feltre > Alleghe (Piani di Pezzè)","km":151,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia19.avif"},{"n":20,"type":"montaña","route":"Gemona del Friuli > Piancavallo","km":199,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia20.jpg"},{"n":21,"type":"llano","route":"Roma > Roma","km":131,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/giro-italia21.avif"}]}', '2026-05-08', '2026-05-31', null, 'Upcoming'],
            [22, 'Critérium du Dauphiné', '07-14 Jun', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","km":170}]}', '2026-06-07', '2026-06-14', null, 'Upcoming'],
            [23, 'Tour de Suisse', '14-21 Jun', 'WT', '{"stages":[{"n":1,"type":"tt","km":10}]}', '2026-06-14', '2026-06-21', null, 'Upcoming'],
            [24, 'Tour de France', '04-26 Jul', 'WT', '{"stages":[{"n":1,"type":"TT","route":"Barcelona > Barcelona","km":"19","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/10/Tour-Francia-1.jpg"},{"n":2,"type":"llano","route":"Tarragona > Barcelona","km":"182","gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2024/06/dd730.jpg"},{"n":3,"type":"mediamontaña","route":"Granollers > Les Angles","km":"196","gain":"3950","image":"https://www.ciclo21.com/wp-content/uploads/2025/10/Tour-Francia-3.jpg"},{"n":4,"type":"mediamontaña","route":"CCarcassonne > Foix ","km":182,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/10/Tour-Francia-4.jpg"},{"n":5,"type":"llano","route":"Lannemezan > Pau","km":158,"gain":"0 ","image":""},{"n":6,"type":"llano","route":"Pau > Gavarnie-Gèdre","km":186,"gain":"0","image":" "},{"n":7,"type":"llano","route":"Hagetmau > Burdeos","km":175,"gain":"0","image":" "},{"n":8,"type":"llano","route":" Périgueux > Bergerac","km":182,"gain":"0","image":" "},{"n":9,"type":"media montaña","route":" Malemort > Ussel","km":185,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/10/Tour-Francia-9.jpg"},{"n":10,"type":"media montaña","route":"Aurillac > Le Lioran","km":167,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/10/Tour-Francia-10.jpg"}]}', '2026-07-04', '2026-07-26', null, 'Upcoming'],
            [25, 'Donostia Klasikoa', '01 Ago', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"San Sebastián","km":230,"gain":3800}]}', '2026-08-01', '2026-08-01', null, 'Upcoming'],
            [26, 'Tour de Pologne', '03-09 Ago', 'WT', '{"stages":[{"n":1,"type":"llano","route":"Kraków","km":190}]}', '2026-08-03', '2026-08-09', null, 'Upcoming'],
            [27, 'La Vuelta', '22 Ago - 13 Sep', 'WT', '{"stages":[{"n":1,"type":"tt","route":"monaco > monaco","km":9,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E1-scaled.jpg"},{"n":2,"type":"llano","route":"Mónaco > Manosque (Francia)","km":215,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E2-scaled.jpg"},{"n":3,"type":"montaña","route":"Gruissan (Francia) > Font Romeu (Francia)","km":166,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E3-scaled.jpg"},{"n":4,"type":"montaña","route":"Andorra la Vella > Andorra la Vella","km":104,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E4-scaled.jpg"},{"n":5,"type":"llano","route":"Costa Daurada > Roquetes. Terres de l’Ebre","km":171,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E5-scaled.jpg"},{"n":6,"type":"mediamontaña","route":"Alcossebre > Castelló","km":176,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E6-scaled.jpg"},{"n":7,"type":"montaña","route":"Vall d’Alba > Aramón Valdelinares","km":149,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E7-scaled.jpg"},{"n":8,"type":"llano","route":"Puçol > Xeraco","km":168,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E8-scaled.jpg"},{"n":9,"type":"montaña","route":"La Vila Joiosa/Villajoyosa > Alto de Aitana","km":187,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E9-scaled.jpg"},{"n":10,"type":"mediamontaña","route":"Alcaraz > Elche de la Sierra","km":184,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E10-scaled.jpg"},{"n":11,"type":"llano","route":"Cartagena > Lorca","km":156,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E11-scaled.jpg"},{"n":12,"type":"montaña","route":"Vera > Calar Alto","km":166,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E12-scaled.jpg"},{"n":13,"type":"mediamontaña","route":"Almuñécar > Loja","km":193,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E13-scaled.jpg"},{"n":14,"type":"montaña","route":"Jaén > Sierra de la Pandera","km":152,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E14-scaled.jpg"},{"n":15,"type":"llano","route":"Palma del Río-Córdoba","km":181,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E15-scaled.jpg"},{"n":16,"type":"llano","route":"Cortegana-La Rábida > Palos de la Frontera","km":186,"gain":"0","image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E16-scaled.jpg"},{"n":17,"type":"llano","route":"Dos Hermanas > Sevilla","km":189,"gain":0,"image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E17-scaled.jpg"},{"n":18,"type":"tt","route":"El Puerto de Santa María > Jerez de la Frontera","km":32,"gain":0,"image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E18-scaled.jpg"},{"n":19,"type":"montaña","route":"Vélez-Málaga > Peñas Blancas","km":205,"gain":0,"image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E19-scaled.jpg"},{"n":20,"type":"montaña","route":"La Calahorra > Collado del Alguacil","km":187,"gain":0,"image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E20-scaled.jpg"},{"n":21,"type":"llano","route":"Granada > Granada","km":99,"gain":0,"image":"https://www.ciclo21.com/wp-content/uploads/2025/12/E21-scaled.jpg"}]}', '2026-08-22', '2026-09-13', null, 'Upcoming'],
            [28, 'Renewi Tour', '26-30 Ago', 'WT', '{"stages":[{"n":1,"type":"llano","route":"Blankenberge","km":180}]}', '2026-08-26', '2026-08-30', null, 'Upcoming'],
            [29, 'GP Québec', '11 Sep', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"Québec","km":201}]}', '2026-09-11', '2026-09-11', null, 'Upcoming'],
            [30, 'GP Montréal', '13 Sep', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"Montréal","km":221}]}', '2026-09-13', '2026-09-13', null, 'Upcoming'],
            [31, 'Il Lombardia', '10 Oct', 'WT', '{"stages":[{"n":1,"type":"mediamontaña","route":"Bergamo","km":255}]}', '2026-10-10', '2026-10-10', null, 'Upcoming'],
            [32, 'Gree-Tour of Guangxi', '15-20 Oct', 'WT', '{"stages":[{"n":1,"type":"llano","route":"Beihai","km":140}]}', '2026-10-15', '2026-10-20', null, 'Upcoming']
        ];
        await db.query(sql, [values]);
        res.send("✅ Calendario restaurado correctamente.");
    } catch (e) { res.status(500).send("❌ Error: " + e.message); }
});

// --- API PÚBLICA (GET) ---
app.get('/api/news', async (req, res) => {
    try { const [r] = await db.query("SELECT * FROM noticias ORDER BY id DESC"); res.json(r); } catch(e){ res.status(500).json([]); }
});
app.get('/api/teams', async (req, res) => {
    try { 
        const [r] = await db.query("SELECT * FROM equipos"); 
        const data = r.map(t => ({...t, riders: JSON.parse(t.riders_json || '[]')}));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});
app.get('/api/calendar', async (req, res) => {
    try { 
        const [r] = await db.query("SELECT * FROM calendario ORDER BY dateISO ASC");
        const data = r.map(c => ({...c, details: JSON.parse(c.details || '{}')}));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});
app.get('/api/ranking', async (req, res) => {
    try { 
        const [r] = await db.query("SELECT * FROM ranking ORDER BY points DESC");
        const data = r.map(k => ({...k, profile: JSON.parse(k.profile || '{}')}));
        res.json(data);
    } catch(e){ res.status(500).json([]); }
});
app.get('/api/glossary', async (req, res) => {
    try { const [r] = await db.query("SELECT * FROM glosario ORDER BY term ASC"); res.json(r); } catch(e){ res.status(500).json([]); }
});

// --- API ADMIN (ESCRITURA) ---

// 1. NOTICIAS
app.post('/api/admin/news', authMiddleware, async (req, res) => {
    const { title, tag, date, image, lead, content, isHero } = req.body;
    try { await db.query("INSERT INTO noticias (title, tag, date, image, `lead`, content, isHero) VALUES (?,?,?,?,?,?,?)", [title, tag, date, image, lead, content, isHero?1:0]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.put('/api/admin/news/:id', authMiddleware, async (req, res) => {
    const { title, tag, date, image, lead, content, isHero } = req.body;
    try { await db.query("UPDATE noticias SET title=?, tag=?, date=?, image=?, `lead`=?, content=?, isHero=? WHERE id=?", [title, tag, date, image, lead, content, isHero?1:0, req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.delete('/api/admin/news/:id', authMiddleware, async (req, res) => {
    try { await db.query("DELETE FROM noticias WHERE id=?", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});

// 2. EQUIPOS
app.post('/api/admin/teams', authMiddleware, async (req, res) => {
    const { name, code, country, jersey, riders } = req.body;
    try { await db.query("INSERT INTO equipos (name, code, country, jersey, riders_json) VALUES (?,?,?,?,?)", [name, code, country, jersey, JSON.stringify(riders)]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.put('/api/admin/teams/:id', authMiddleware, async (req, res) => {
    const { name, code, country, jersey, riders } = req.body;
    try { await db.query("UPDATE equipos SET name=?, code=?, country=?, jersey=?, riders_json=? WHERE id=?", [name, code, country, jersey, JSON.stringify(riders), req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.delete('/api/admin/teams/:id', authMiddleware, async (req, res) => {
    try { await db.query("DELETE FROM equipos WHERE id=?", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});

// 3. CALENDARIO
app.post('/api/admin/calendar', authMiddleware, async (req, res) => {
    const { name, status, date, dateISO, category, details } = req.body;
    try { await db.query("INSERT INTO calendario (name, status, date, dateISO, category, details) VALUES (?,?,?,?,?,?)", [name, status, date, dateISO, category, details]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.put('/api/admin/calendar/:id', authMiddleware, async (req, res) => {
    const { name, status, date, dateISO, category, details } = req.body;
    try { await db.query("UPDATE calendario SET name=?, status=?, date=?, dateISO=?, category=?, details=? WHERE id=?", [name, status, date, dateISO, category, details, req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.delete('/api/admin/calendar/:id', authMiddleware, async (req, res) => {
    try { await db.query("DELETE FROM calendario WHERE id=?", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});

// 4. RANKING
app.post('/api/admin/ranking', authMiddleware, async (req, res) => {
    const { name, team, points, rank, trend, profile } = req.body;
    try { await db.query("INSERT INTO ranking (name, team, points, `rank`, trend, profile) VALUES (?,?,?,?,?,?)", [name, team, points, rank, trend, profile]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.put('/api/admin/ranking/:id', authMiddleware, async (req, res) => {
    const { name, team, points, rank, trend, profile } = req.body;
    try { await db.query("UPDATE ranking SET name=?, team=?, points=?, `rank`=?, trend=?, profile=? WHERE id=?", [name, team, points, rank, trend, profile, req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.delete('/api/admin/ranking/:id', authMiddleware, async (req, res) => {
    try { await db.query("DELETE FROM ranking WHERE id=?", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});

// 5. GLOSARIO
app.post('/api/admin/glossary', authMiddleware, async (req, res) => {
    const { term, cat, definition } = req.body;
    try { await db.query("INSERT INTO glosario (term, cat, definition) VALUES (?,?,?)", [term, cat, definition]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.put('/api/admin/glossary/:id', authMiddleware, async (req, res) => {
    const { term, cat, definition } = req.body;
    try { await db.query("UPDATE glosario SET term=?, cat=?, definition=? WHERE id=?", [term, cat, definition, req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});
app.delete('/api/admin/glossary/:id', authMiddleware, async (req, res) => {
    try { await db.query("DELETE FROM glosario WHERE id=?", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json(e); }
});

// STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Servidor Velo listo en puerto ${PORT}`); });
