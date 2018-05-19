import {readFileSync as file} from 'fs';
import {join} from 'path';
import unified from 'unified';
import test from 'ava';
import raw from 'rehype-raw';
import reParse from 'remark-parse';
import stringify from 'rehype-stringify';
import remark2rehype from 'remark-rehype';
import parse5 from 'parse5';
import stream from 'stream';

import plugin from '..';

const Stream = stream.Readable;

const renderDefault = text => unified()
  .use(reParse)
  .use(plugin)
  .use(remark2rehype)
  .use(stringify)
  .processSync(text);

const render = text => unified()
  .use(reParse)
  .use(plugin, {allowDangerousDOMEventHandlers: false, scope: 'permissive'})
  .use(remark2rehype)
  .use(stringify)
  .processSync(text);

const renderRaw = text => unified()
  .use(reParse)
  .use(plugin, {allowDangerousDOMEventHandlers: false, scope: 'permissive'})
  .use(remark2rehype, {allowDangerousHTML: true})
  .use(raw)
  .use(stringify)
  .processSync(text);

/*
 * TODO :
 *  - Invalid scope
 *  - Invalid extended
 *  - aria attributes
 */

const mainTestString = `Inline *test*{style="em:4"} paragraph. Use **multiple**{ style="color:pink"} inline ~~block~~ tag. Line \`tagCode\`{ style="color:yellow"}.`;

function string2stream(string) {
  const stream = new Stream();
  stream.push(string);
  stream.push(null);
  return stream;
}

function propEgal(prop, attrs) {
  if (Object.getOwnPropertyNames(prop).length !== attrs.length) {
    return false;
  }

  attrs.forEach(e => {
    if (prop[e.name] !== e.value) {
      return false;
    }
  });

  return true;
}
function every(obj, fct) {
  Object.getOwnPropertyNames(obj).forEach(name => {
    if (!fct(obj[name])) {
      return false;
    }
  });
  return true;
}

test('basic-default', t => {
  const {contents} = renderDefault(mainTestString);
  const parser = new parse5.SAXParser();

  const nbTag = {em: 1, s: 1, code: 1, strong: 1, errorTag: 0};
  parser.on('startTag', name => {
    if (name in nbTag) {
      nbTag[name] -= 1;
    }
  });
  string2stream(contents).pipe(parser);
  t.true(every(nbTag, x => x === 0));
});

test('basic', t => {
  const {contents} = render(mainTestString);
  const parser = new parse5.SAXParser();

  const nbTag = {em: 1, s: 1, code: 1, strong: 1, errorTag: 0};
  parser.on('startTag', name => {
    if (name in nbTag) {
      nbTag[name] -= 1;
    }
  });
  string2stream(contents).pipe(parser);
  t.true(every(nbTag, x => x === 0));
});

test('basic-raw', t => {
  const {contents} = renderRaw(mainTestString);
  const parser = new parse5.SAXParser();

  const nbTag = {em: 1, s: 1, code: 1, strong: 1, errorTag: 0};
  parser.on('startTag', name => {
    if (name in nbTag) {
      nbTag[name] -= 1;
    }
  });
  string2stream(contents).pipe(parser);
  t.true(every(nbTag, x => x === 0));
});

test('em', async t => {
  const {contents} = render('textexamplenointerest **Important**{style=4em} still no interest');
  const parser = new parse5.SAXParser();

  parser.on('startTag', (name, attrs) => {
    if (name === 'strong') {
      t.true(propEgal({style: '4em'}, attrs));
    }
  });

  await string2stream(contents).pipe(parser);
});

test('readme-default', async t => {
  const fileExample = file(join(__dirname, 'readMeTest.txt'));
  const {contents} = renderDefault(fileExample);
  const parser = new parse5.SAXParser();

  parser.on('startTag', (name, attrs) => {
    switch (name) {
      case 'img':
        t.true(propEgal({height: 50, alt: 'alt', src: 'img'}, attrs));
        break;
      case 'a':
        t.true(propEgal({ref: 'external', src: 'https://rms.sexy'}, attrs));
        break;
      case 'h3':
        t.true(propEgal({style: 'color:red;'}, attrs));
        break;
      case 'em':
        t.true(propEgal({style: 'color:yellow;'}, attrs));
        break;
      case 'strong':
        t.true(propEgal({}, attrs));
        break;
      case 'del':
        t.true(propEgal({style: 'color: grey;'}, attrs));
        break;
      case 'code':
        t.true(propEgal({}, attrs));
        break;
      default:
    }
  });

  await string2stream(contents).pipe(parser);
});

test('readme', async t => {
  const fileExample = file(join(__dirname, 'readMeTest.txt'));
  const {contents} = render(fileExample);
  const parser = new parse5.SAXParser();

  parser.on('startTag', (name, attrs) => {
    switch (name) {
      case 'img':
        t.true(propEgal({height: 50, alt: 'alt', src: 'img'}, attrs));
        break;
      case 'a':
        t.true(propEgal({ref: 'external', src: 'https://rms.sexy'}, attrs));
        break;
      case 'h3':
        t.true(propEgal({style: 'color:red;'}, attrs));
        break;
      case 'em':
        t.true(propEgal({style: 'color:yellow;'}, attrs));
        break;
      case 'strong':
        t.true(propEgal({awesome: ''}, attrs));
        break;
      case 'del':
        t.true(propEgal({style: 'color: gray;'}, attrs));
        break;
      case 'code':
        t.true(propEgal({lang: 'c'}, attrs));
        break;
      default:
    }
  });

  await string2stream(contents).pipe(parser);
});

test('extended', async t => {
  const renderExtended = text => unified()
    .use(reParse)
    .use(plugin, {extend: {image: ['quality']}})
    .use(remark2rehype)
    .use(stringify)
    .process(text, (err, file) => {
      const parser = new parse5.SAXParser();

      t.true(!err);

      parser.on('startTag', (name, attrs) => {
        if (name === 'img') {
          t.true(propEgal({alt: 'Awesome image', src: 'aws://image.jpg', quality: '80'}, attrs));
        }
      });
      string2stream(String(file)).pipe(parser);
    });

  await renderExtended(`
*Wait* !
This is an awesome image : ![Awesome image](aws://image.jpg){ quality="80" awesomeness="max" }
`);
});

test('extended Dangerous', async t => {
  const renderExtended = text => unified()
    .use(reParse)
    .use(plugin, {extend: {image: ['quality', 'onload']}})
    .use(remark2rehype)
    .use(stringify)
    .process(text, (err, file) => {
      const parser = new parse5.SAXParser();

      t.true(!err);

      parser.on('startTag', (name, attrs) => {
        if (name === 'img') {
          t.true(propEgal({alt: 'Awesome image', src: 'aws://image.jpg', quality: '80', onload: 'launchAwesomeFunction();'}, attrs));
        }
      });
      string2stream(String(file)).pipe(parser);
    });

  await renderExtended(`
*Wait* !
This is an awesome image : ![Awesome image](aws://image.jpg){ quality="80" awesomeness="max" onload="launchAwesomeFunction();" }
`);
});

test('extended-global', async t => {
  const renderExtended = text => unified()
    .use(reParse)
    .use(plugin, {extend: {'*': ['exAttr']}})
    .use(remark2rehype)
    .use(stringify)
    .process(text, (err, file) => {
      const parser = new parse5.SAXParser();

      t.true(!err);

      parser.on('startTag', (name, attrs) => {
        if (name === 'strong') {
          t.true(propEgal({exAttr: 'true'}, attrs));
        }
      });
      string2stream(String(file)).pipe(parser);
    });

  await renderExtended(`
*Wait* ! You are **beautiful**{ exAttr="true" } !
`);
});

