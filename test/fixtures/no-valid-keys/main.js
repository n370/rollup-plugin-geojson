import mimeDb from './mime-db.geojson';

t.deepEqual(mimeDb['application/1d-interleaved-parityfec'], {
  source: 'iana'
});
