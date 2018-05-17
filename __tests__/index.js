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

const render = text => unified()
  .use(reParse)
  .use(plugin)
  .use(remark2rehype)
  .use(stringify)
  .processSync(text);

const renderRaw = text => unified()
  .use(reParse)
  .use(plugin)
  .use(remark2rehype, {allowDangerousHTML: true})
  .use(raw)
  .use(stringify)
  .processSync(text);

const mainTestString = `Inline *test*{style="em:4"} paragraphe. Use **multiple**{ style="color:pink"} inline ~~block~~ tag. Line \`tagCode\`{ style="color:yellow"}.`;

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
  const {contents} = render('textexampleno interest **Important**{style=4em} still no interest');
  const parser = new parse5.SAXParser();

  parser.on('startTag', (name, attrs) => {
    if (name === 'strong') {
      t.true(propEgal({style: '4em'}, attrs));
    }
  });

  await string2stream(contents).pipe(parser);
});

