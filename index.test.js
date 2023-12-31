const fs = require('fs');
const pagehandler = require('./index');
const path = require('path');
const util = require('util');
const mongo = require('./lib/mongo');

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getArgv(argv) {
  if (null == argv) {
    argv = {};
  }

  if (null == argv.page) {
    argv.page = path.resolve(__dirname, 'test-page');
  }

  if (null == argv.db) {
    argv.db = argv.page + '/pages';
  }

  if (null == argv.recycler) {
    argv.recycler = argv.page + '/recycle';
  }

  if (null == argv.url) {
    argv.url = 'http://localhost:3000';
  }

  if (null == argv.packageDir) {
    argv.packageDir = path.resolve(__dirname, 'node_modules');
  }

  if (null == argv.root) {
    argv.root = argv.packageDir + '/wiki-server';
  }

  argv.database = {
    type: 'mongodb',
    url: 'mongodb://localhost:27017/fedwiki'
  };

  return argv;
}

beforeEach(async () => {
  const argv = getArgv();
  fs.rmSync(argv.page, { force: true, recursive: true });
  const db = await mongo.db(argv);
  return db.collection('wiki').drop();
});

afterEach(async () => {
  const argv = getArgv();
  fs.rmSync(argv.page, { force: true, recursive: true });
  const db = await mongo.db(argv);
  return db.collection('wiki').drop();
});

afterAll(async () => {
  return mongo.closeAll();
});

test('returns existing page correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const get = util.promisify(itself.get);
  const put = util.promisify(itself.put);

  await put('example-a', { title: 'Example A' });

  const page = await get('example-a');

  expect(page).toEqual(expect.objectContaining({
      title: expect.stringMatching('Example A')
  }));
});

test('returns missing page correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const get = util.promisify(itself.get);

  const page = await get('example-a');

  expect(page).toBe('Page not found');
});

test('returns default page correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const get = util.promisify(itself.get);

  const page = await get('how-to-wiki');

  expect(page).toEqual(expect.objectContaining({
    title: expect.stringMatching('How To Wiki')
  }));
});

test('returns plugin page correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const get = util.promisify(itself.get);

  const page = await get('about-paragraph-plugin');

  expect(page).toEqual(expect.objectContaining({
    title: expect.stringMatching('About Paragraph Plugin')
  }));
});

test('returns recycled page correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const get = util.promisify(itself.get);
  const put = util.promisify(itself.put);

  await put('recycler/old-page', { title: 'Old Page' });

  const page = await get('recycler/old-page');

  expect(page).toEqual(expect.objectContaining({
    title: expect.stringMatching('Old Page')
  }));
});

test('deletes page correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const del = util.promisify(itself.delete);
  const get = util.promisify(itself.get);
  const put = util.promisify(itself.put);

  await put('example-a', { title: 'Example A' });
  await del('example-a');
  const page = await get('recycler/example-a');

  expect(page).toEqual(expect.objectContaining({
    title: expect.stringMatching('Example A')
  }));
});

test('deletes page correctly overrides recycled', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const del = util.promisify(itself.delete);
  const get = util.promisify(itself.get);
  const put = util.promisify(itself.put);

  await put('example-a', { title: "Example A" });
  await put('recycler/example-a', { title: "Old Page" });
  await del('example-a');
  const page = await get('recycler/example-a');

  expect(page).toEqual(expect.objectContaining({
    title: expect.stringMatching('Example A')
  }));
});

test('deletes recycled page correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const del = util.promisify(itself.delete);
  const put = util.promisify(itself.put);

  await put('recycler/example-a', {});
  await del('recycler/example-a');

  expect(() => {
    fs.readFileSync(argv.recycler + '/example-a', 'utf8');
  }).toThrow();
});

test('deletes missing page correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const del = util.promisify(itself.delete);

  try {
    await del('example-a');
  } catch (e) {
    expect(e).toBe('page does not exist');
  }
});

test('recycles page correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const recycle = util.promisify(itself.saveToRecycler);
  const get = util.promisify(itself.get);
  const put = util.promisify(itself.put);

  await put('example-a', { title: 'Example A' });
  await recycle('example-a');
  const page = await get('recycler/example-a');

  expect(page).toEqual(expect.objectContaining({
    title: expect.stringMatching('Example A')
  }));
});

test('recycles page correctly overrides recycled', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const recycle = util.promisify(itself.saveToRecycler);
  const get = util.promisify(itself.get);
  const put = util.promisify(itself.put);

  await put('example-a', { title: "Example A" });
  await put('recycler/example-a', { title: "Old Page" });
  await recycle('example-a');
  const page = await get('recycler/example-a');

  expect(page).toEqual(expect.objectContaining({
    title: expect.stringMatching('Example A')
  }));
});

test('recycles missing page correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const recycle = util.promisify(itself.saveToRecycler);

  try {
    await recycle('example-a');
  } catch (e) {
    expect(e).toBe('page does not exist');
  }
});

test('returns pages correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const getpages = util.promisify(itself.pages);
  const put = util.promisify(itself.put);

  await put('example-a', {
    title: 'Example A',
    story: [
      {
        "text": "Welcome to this [[Federated Wiki]] site. From this page you can find who we are and what we do. New sites provide this information and then claim the site as their own. You will need your own site to participate.",
        "id": "7b56f22a4b9ee974",
        "type": "paragraph"
      }
    ],
    journal: [
      {
        "type": "create",
        "item": {
          "title": "Welcome Visitors",
          "story": []
        },
        "date": 1420938191608
      }
    ]
  });
  await put('example-b', { title: 'Example B' });

  const sitemap = await getpages();

  expect(sitemap).toHaveLength(2);
  expect(sitemap[0]).toEqual(expect.objectContaining({
    title: expect.stringMatching('Example A'),
    date: 1420938191608,
    links: expect.objectContaining({
      'federated-wiki': expect.stringMatching('7b56f22a4b9ee974')
    })
  }));
});

test('synopsis generates correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const getpages = util.promisify(itself.pages);
  const put = util.promisify(itself.put);

  await put('example-a', {
    title: 'Example A',
    story: [
      {
        "text": "p1 is paragraph",
        "id": "1",
        "type": "paragraph"
      },
      {
        "text": "p2 is paragraph",
        "id": "2",
        "type": "paragraph"
      },
    ]
  });

  await put('example-b', {
    title: 'Example B',
    story: [
      {
        "text": "p1 is not paragraph",
        "id": "1",
        "type": "markdown"
      },
      {
        "text": "p2 is paragraph",
        "id": "2",
        "type": "paragraph"
      },
    ]
  });

  await put('example-c', {
    title: 'Example C',
    story: [
      {
        "text": "p1 has text",
        "id": "1",
        "type": "markdown"
      },
      {
        "text": "p2 has text",
        "id": "2",
        "type": "markdown"
      },
    ]
  });

  await put('example-d', {
    title: 'Example D',
    story: [
      {
        "id": "1",
        "type": "unknown"
      },
      {
        "text": "p2 has text",
        "id": "2",
        "type": "markdown"
      },
    ]
  });

  await put('example-e', {
    title: 'Example E',
    story: [
      {
        "id": "1",
        "type": "unknown"
      },
      {
        "id": "2",
        "type": "unknown"
      },
    ]
  });

  await put('example-f', {
    title: 'Example F',
  });

  const sitemap = await getpages();

  expect(sitemap).toHaveLength(6);
  expect(sitemap[0].synopsis).toEqual('p1 is paragraph');
  expect(sitemap[1].synopsis).toEqual('p2 is paragraph');
  expect(sitemap[2].synopsis).toEqual('p1 has text');
  expect(sitemap[3].synopsis).toEqual('p2 has text');
  expect(sitemap[4].synopsis).toEqual('A page with 2 items.');
  expect(sitemap[5].synopsis).toEqual('A page with no story.');
});

test('returns slugs correctly', async () => {
  const argv = getArgv();
  const itself = pagehandler(argv);
  const slugs = util.promisify(itself.slugs);
  const put = util.promisify(itself.put);

  await put('example-a', { title: 'Example A' });
  await put('example-b', { title: 'Example B' });

  const pages = await slugs();

  expect(pages).toHaveLength(2);
  expect(pages).toEqual(expect.arrayContaining([
    'example-a',
    'example-b'
  ]));
});
