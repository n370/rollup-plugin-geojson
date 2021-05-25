const { readFileSync } = require('fs');

const test = require('ava');
const { rollup } = require('rollup');

const { nodeResolve } = require('@rollup/plugin-node-resolve');

const { testBundle } = require('../util/test');

const geojson = require('..'); // eslint-disable-line import/no-unresolved

const read = (file) => readFileSync(file, 'utf-8');

require('source-map-support').install();

process.chdir(__dirname);

test('converts geojson', async (t) => {
  const bundle = await rollup({
    input: 'fixtures/basic/main.js',
    plugins: [geojson()]
  });
  t.plan(1);
  return testBundle(t, bundle);
});

test('handles arrays', async (t) => {
  const bundle = await rollup({
    input: 'fixtures/array/main.js',
    plugins: [geojson()]
  });
  t.plan(1);
  return testBundle(t, bundle);
});

test('handles literals', async (t) => {
  const bundle = await rollup({
    input: 'fixtures/literal/main.js',
    plugins: [geojson()]
  });
  t.plan(1);
  return testBundle(t, bundle);
});

test('generates named exports', async (t) => {
  const bundle = await rollup({
    input: 'fixtures/named/main.js',
    plugins: [geojson()]
  });

  const { code, result } = await testBundle(t, bundle, { exports: {} });

  t.is(result.version, '1.33.7');
  t.is(code.indexOf('this-should-be-excluded'), -1, 'should exclude unused properties');
});

test('resolves extensionless imports in conjunction with the node-resolve plugin', async (t) => {
  const bundle = await rollup({
    input: 'fixtures/extensionless/main.js',
    plugins: [nodeResolve({ extensions: ['.js', '.geojson'] }), geojson()]
  });
  t.plan(2);
  return testBundle(t, bundle);
});

test('handles geojson objects with no valid keys (#19)', async (t) => {
  const bundle = await rollup({
    input: 'fixtures/no-valid-keys/main.js',
    plugins: [geojson()]
  });
  t.plan(1);
  return testBundle(t, bundle);
});

test('handles garbage', async (t) => {
  const warns = [];

  await rollup({
    input: 'fixtures/garbage/main.js',
    plugins: [geojson()],
    onwarn: (warning) => warns.push(warning)
  }).catch(() => {});

  const [{ message, id, position, plugin }] = warns;

  t.is(warns.length, 1);
  t.is(plugin, 'geojson');
  t.is(position, 1);
  t.is(message, 'Could not parse GeoJSON file');
  t.regex(id, /(.*)bad.geojson$/);
});

test('does not generate an AST', async (t) => {
  // eslint-disable-next-line no-undefined
  t.is(geojson().transform(read('fixtures/form/input.geojson'), 'input.geojson').ast, undefined);
});

test('does not generate source maps', async (t) => {
  t.deepEqual(geojson().transform(read('fixtures/form/input.geojson'), 'input.geojson').map, {
    mappings: ''
  });
});

test('generates properly formatted code', async (t) => {
  const { code } = geojson().transform(read('fixtures/form/input.geojson'), 'input.geojson');
  t.snapshot(code);
});

test('generates correct code with preferConst', async (t) => {
  const { code } = geojson({ preferConst: true }).transform(
    read('fixtures/form/input.geojson'),
    'input.geojson'
  );
  t.snapshot(code);
});

test('uses custom indent string', async (t) => {
  const { code } = geojson({ indent: '  ' }).transform(read('fixtures/form/input.geojson'), 'input.geojson');
  t.snapshot(code);
});

test('generates correct code with compact=true', async (t) => {
  const { code } = geojson({ compact: true }).transform(
    read('fixtures/form/input.geojson'),
    'input.geojson'
  );
  t.snapshot(code);
});

test('generates correct code with namedExports=false', async (t) => {
  const { code } = geojson({ namedExports: false }).transform(
    read('fixtures/form/input.geojson'),
    'input.geojson'
  );
  t.snapshot(code);
});

test('correctly formats arrays with compact=true', async (t) => {
  t.deepEqual(
    geojson({ compact: true }).transform(
      `[
  1,
  {
    "x": 1
  }
]`,
      'input.geojson'
    ).code,
    'export default[1,{x:1}];'
  );
});

test('handles empty keys', async (t) => {
  t.deepEqual(
    geojson().transform(`{"":"a", "b": "c"}`, 'input.geojson').code,
    'export var b = "c";\nexport default {\n\t"": "a",\n\tb: b\n};\n'
  );
});
