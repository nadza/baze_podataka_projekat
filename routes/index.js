var express = require('express');
var router = express.Router();
const mysql = require('mysql2');
const bodyParser2 = require('body-parser');
router.use(bodyParser2.urlencoded({ extended: false }));

const pool = mysql.createPool({
  user: 'student2306',
  host: 'bazepodataka.ba',
  database: 'student2306',
  password: '',
  port: 7306,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/home', function(req, res, next) {
  res.render('home', { title: 'home' });
});

router.get('/type-of-rooms', function(req, res, next) {
  pool.execute('select ss.slika, vs.vrsta_sobe, ss.id_vs \n' +
      'from p_slike_soba as ss\n' +
      'left join p_vrste_soba as vs on ss.id_vs = vs.id_vs\n' +
      'where ss.defaultna_slika_tipa = 1\n' +
      'order by ss.id_vs asc', (err, results) => {
  if (err) {
      console.error('Error querying MySQL:', err);
      return;
    }

    console.log('Fetched data:', results);
    res.render('rooms', { sobeList: results})
  });
});

router.get('/type-of-rooms/:id_vs', function(req, res, next) {
  const id = req.params.id_vs;

  pool.execute('SELECT slika FROM p_slike_soba WHERE id_vs = ?', [id], (err, results) => {
    if (err) {
      console.error('Error querying MySQL:', err);
      return;
    }

    console.log('Fetched data:', results);
    res.render('pictures', { pictures: results})
  });
});

router.get('/all-reports', function(req, res, next) {
  res.render('reports');
});

router.get('/all-reports/:number', function(req, res, next) {
  const broj = parseInt(req.params.number, 10);

  if (broj === 1) {
    res.render('report-form', { imaTip: 1, number: broj });
  } else {
    res.render('report-form', { imaTip: 0, number: broj });
  }
});

router.post('/all-reports/:number/results', async (req, res) => {
  const broj = parseInt(req.params.number);
  const { startDate, endDate, roomType } = req.body;
  const hasRoomType = 'roomType' in req.body;
  console.log({ startDate, endDate, roomType });
  let rezultat;

  try {
    if (broj === 1) {
      if(hasRoomType) {
      rezultat = await executeProcedure('p_proc_raspolozive_sobe', [startDate, endDate, roomType]);
      }
    } else if (broj === 2) {
      rezultat = await executeProcedure('p_proc_izvjestaj_o_sobama', [startDate, endDate]);
    } else if (broj === 3) {
      rezultat = await executeProcedure('p_proc_izvjestaj_o_koristenim_servisima', [startDate, endDate]);
    } else if (broj === 4) {
      rezultat = await executeProcedure('p_proc_izvjestaj_o_nekoristenim_servisima', [startDate, endDate]);
    } else if (broj === 5) {
      rezultat = await executeProcedure('p_proc_izvjestaj_broj_nocenja_po_tipu_sobe', [startDate, endDate]);
    }
    console.log('Fetched data:', rezultat);
    res.render('reports-results', { reportResults: rezultat });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function executeProcedure(procedureName, params) {
  function formatString(inputString) {
    return inputString.charAt(0).toUpperCase() + inputString.slice(1).replace(/_/g, ' ');
  }
  return new Promise((resolve, reject) => {
    pool.execute(`CALL ${procedureName}(${params.map(() => '?').join(', ')})`, params, (err, results) => {
      if (err) {
        reject(err);
      } else {
        const resultSet = results && results.length > 0 ? results[0] : [];
        let ime_kolona = [];
        for (let key in resultSet[0]){
          if(resultSet[0].hasOwnProperty(key)){
            ime_kolona.push(formatString(key));
          }
        }
        const rows = resultSet.map(row => {
          return Array.from(Object.values(row));
        });
        resolve({ime_kolona: ime_kolona, vrijednost_redova: rows});
      }
    });
  });
}

router.post('/cjenovnik', async function(req, res, next) {
  const informacije = req.body;
  let konekcija = null;
  try {
    konekcija = await poool.getConnection();
    await konekcija.beginTransaction();
    
    const [zaglavlje_rezultat]  = await konekcija.query('INSERT INTO p_zaglavlje_cjenovnika (datum_pocetka_vazenja, datum_odredjenja, dodatne_informacije, status_cjenovnika) VALUES (?, ?, ?, ?)',
        [informacije.datum_pocetka_vazenja, informacije.datum_odredjenja, informacije.dodatne_informacije, informacije.status_cjenovnika]);
    const id_zc = zaglavlje_rezultat.insertId;
    
    for (const stavka of informacije.stavke) {
      await konekcija.query('INSERT INTO p_cjenovnici (id_zc, cijena, id_vs, id_vn) VALUES (?, ?, ?, ?)',
          [id_zc, stavka.cijena, stavka.id_vs, stavka.id_vn]);
    }

    await konekcija.commit();
    res.status(200).send('Transakcija uspjesna!');
  } catch (error) {
    if (konekcija) await konekcija.rollback();
    console.error(error);
    res.status(500).send('Transakcija neuspjesna!');
    throw error;
  } finally {
    if (konekcija) await konekcija.release();
  }
});

module.exports = router;
