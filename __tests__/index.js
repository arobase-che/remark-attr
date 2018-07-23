'use strict';

import unified from 'unified';
import {readFileSync as file} from 'fs';
import {join} from 'path';
import test from 'ava';
import raw from 'rehype-raw';
import reParse from 'remark-parse';
import stringify from 'rehype-stringify';
import remark2rehype from 'remark-rehype';
import parse5 from 'parse5';

import plugin from '..';

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

const generateExtendParser = extendsOptions => text => unified()
  .use(reParse)
  .use(plugin, extendsOptions)
  .use(remark2rehype)
  .use(stringify)
  .processSync(text);

const parse = x => parse5.parse(x);

/*
 * TODO :
 *  - Invalid scope
 *  - Invalid extended
 *  - aria attributes
 */

const mainTestString = `Inline *test*{style="em:4"} paragraph. Use **multiple**{ style="color:pink"} inline ~~block~~ tag. Line \`tagCode\`{ style="color:yellow"}.`;

test('basic-default', t => {
  const {contents} = renderDefault(mainTestString);
  t.deepEqual(parse(contents), parse('<p>Inline <em style="em:4">test</em> paragraph. Use <strong style="color:pink">multiple</strong> inline <del>block</del> tag. Line <code style="color:yellow">tagCode</code>.</p>'));
});

test('basic', t => {
  const {contents} = render(mainTestString);
  t.deepEqual(parse(contents), parse(`
<p>Inline <em style="em:4">test</em> paragraph. Use <strong style="color:pink">multiple</strong> inline <del>block</del> tag. Line <code style="color:yellow">tagCode</code>.</p>`));
});

test('basic-raw', t => {
  const {contents} = renderRaw(mainTestString);
  t.deepEqual(parse(contents), parse(`
<p>Inline <em style="em:4">test</em> paragraph. Use <strong style="color:pink">multiple</strong> inline <del>block</del> tag. Line <code style="color:yellow">tagCode</code>.</p>`));
});

test('em', t => {
  const {contents} = render('textexamplenointerest **Important**{style=4em} still no interest');
  t.deepEqual(parse(contents), parse(`<p>textexamplenointerest <strong style="4em">Important</strong> still no interest</p>`));
});

test('readme-default', t => {
  const fileExample = file(join(__dirname, 'readMeTest.txt'));
  const {contents} = renderDefault(fileExample);
  t.deepEqual(parse(contents), parse(`
<p><img src="img" alt="alt" height="50"></p>
<p><a href="https://rms.sexy" rel="external">Hot babe with computer</a></p>
<h3 style="color:red;">This is a title</h3>
<p>Npm stand for <em style="color:yellow;">node</em> packet manager.</p>
<p>This is a <strong>Unicorn</strong> !</p>
<p>Your problem is <del style="color: grey;">at line 18</del>. My mistake, it's at line 14.</p>
<p>You can use the <code>fprintf</code> function to format the output to a file.</p>`));
});

test('readme', t => {
  const fileExample = file(join(__dirname, 'readMeTest.txt'));
  const {contents} = render(fileExample);
  t.deepEqual(parse(contents), parse(`
<p><img src="img" alt="alt" height="50"></p>
<p><a href="https://rms.sexy" rel="external">Hot babe with computer</a></p>
<h3 style="color:red;">This is a title</h3>
<p>Npm stand for <em style="color:yellow;">node</em> packet manager.</p>
<p>This is a <strong awesome="">Unicorn</strong> !</p>
<p>Your problem is <del style="color: grey;">at line 18</del>. My mistake, it's at line 14.</p>
<p>You can use the <code language="c">fprintf</code> function to format the output to a file.</p>`));
});

test('extended', t => {
  const renderExtended = generateExtendParser({extends: {image: ['quality']}});
  const extentedString = `*Wait* !
This is an awesome image : ![Awesome image](aws://image.jpg){ quality="80" awesomeness="max" }
`;
  const {contents} = renderExtended(extentedString);
  t.deepEqual(parse(contents), parse(`<p><em>Wait</em> !
This is an awesome image : <img src="aws://image.jpg" alt="Awesome image"></p>`));
});

test('extended Dangerous', t => {
  const renderExtended = generateExtendParser({extend: {image: ['quality', 'onload']}});
  const dangerousString = `*Wait* !
This is an awesome image : ![Awesome image](aws://image.jpg){ quality="80" awesomeness="max" onload="launchAwesomeFunction();" }
`;
  const {contents} = renderExtended(dangerousString);
  t.deepEqual(parse(contents), parse(`<p><em>Wait</em> !
This is an awesome image : <img src="aws://image.jpg" alt="Awesome image" quality="80" onload="launchAwesomeFunction();"></p>`));
});

test('extended-global', t => {
  const renderExtended = generateExtendParser({extend: {'*': ['exAttr']}});
  const globalString = ` *Wait* ! You are **beautiful**{ exAttr="true" } !`;
  const {contents} = renderExtended(globalString);
  t.deepEqual(parse(contents), parse(`<p> <em>Wait</em> ! You are <strong ex-attr="true">beautiful</strong> !</p>`));
});

test('extended-invalid-scope', t => {
  const renderExtended = generateExtendParser({scope: 'invalid', extend: {strong: ['exAttr']}});
  const invalidString = `*Wait* ! You are **beautiful**{ exAttr="true" onload="qdss" pss="NOK" } !`;
  const {contents} = renderExtended(invalidString);
  t.deepEqual(parse(contents), parse(`<p><em>Wait</em> ! You are <strong ex-attr="true">beautiful</strong> !</p>`));
});

test('invalid-scope', t => {
  const renderExtended = generateExtendParser({extend: 'exAttr'});
  const invalidString = ` *Wait* ! I **love**{ exAttr="true" onload="qdss" pss="NOK" } you !`;
  const {contents} = renderExtended(invalidString);
  t.deepEqual(parse(contents), parse(`<p> <em>Wait</em> ! I <strong>love</strong> you !</p>`));
});

test('invalid-extend', t => {
  const renderExtended = generateExtendParser({extend: 'exAttr'});
  const invalidString = ` *Wait* ! I **love**{ exAttr="true" onload="qdss" attr="NOK" style="color: red;"} you!`;
  const {contents} = renderExtended(invalidString);
  t.deepEqual(parse(contents), parse(`<p> <em>Wait</em> ! I <strong style="color: red;">love</strong> you!</p>`));
});

test('fenced code', t => {
  const fencedCodeString = `~~~lang info=string
This is an awesome code

~~~
`;
  const {contents} = render(fencedCodeString);
  t.deepEqual(parse(contents), parse(`<pre><code class="language-lang" info="string">This is an awesome code
</code></pre>`));
});

test('fenced code brackets', t => {
  const fencedCodeString = `~~~lang{info=string}
This is an awesome code

~~~
`;
  const {contents} = render(fencedCodeString);
  t.deepEqual(parse(contents), parse(`<pre><code class="language-lang" info="string">This is an awesome code
</code></pre>`));
});

test('fenced code brackets and spaces', t => {
  const fencedCodeString = `~~~lang   {info=string}
This is an awesome code

~~~
`;
  const {contents} = render(fencedCodeString);
  t.deepEqual(parse(contents), parse(`<pre><code class="language-lang" info="string">This is an awesome code
</code></pre>`));
});

test('fenced code fallback', t => {
  const fallbackFCstring = `~~~lang
This is an awesome code

~~~
{info=string}
`;
  const {contents} = render(fallbackFCstring);
  t.deepEqual(parse(contents), parse(`<pre><code class="language-lang" info="string">This is an awesome code
</code></pre>`));
});

test('fenced code mix', t => {
  const fallbackFCstring = `~~~lang{info=strong}
This is an awesome code

~~~
{info=string}
`;
  const {contents} = render(fallbackFCstring);
  t.deepEqual(parse(contents), parse(`<pre><code class="language-lang" info="string">This is an awesome code
</code></pre>`));
});

