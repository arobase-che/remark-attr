'use strict';

const {join} = require('path');
const file = require('fs').readFileSync;
const test = require('ava');
const raw = require('rehype-raw');
const reParse = require('remark-parse');
const reFootnt = require('remark-footnotes');
const stringify = require('rehype-stringify');
const remark2rehype = require('remark-rehype');
const unified = require('unified');
const parse5 = require('parse5');
const plugin = require('..');

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

const renderFootnotes = text => unified()
  .use(reParse)
  .use(reFootnt, {inlineNotes: true})
  .use(plugin, {allowDangerousDOMEventHandlers: false, scope: 'permissive'})
  .use(remark2rehype)
  .use(stringify)
  .processSync(text);

const renderRaw = text => unified()
  .use(reParse)
  .use(plugin, {allowDangerousDOMEventHandlers: false, scope: 'permissive'})
  .use(remark2rehype, {allowDangerousHtml: true})
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

const mainTestString = 'Inline *test*{style="em:4"} paragraph. Use **multiple**{ style="color:pink"} inline ~~block~~ tag. Line `tagCode`{ style="color:yellow"}.';

/* Basic tests */

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

/* Support tests
 *
 * They test the support of one element each.
 */

test('em', t => {
  const {contents} = render('textexamplenointerest **Important**{style=4em} still no interest');
  t.deepEqual(parse(contents), parse('<p>textexamplenointerest <strong style="4em">Important</strong> still no interest</p>'));
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
  const fencedCodeString = `~~~lang {info=string}
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

test('image', t => {
  const imageMd = '![Test image](url.com){ alt="This is alt"  longdesc="qsdf"}';
  const {contents} = render(imageMd);
  t.deepEqual(parse(contents), parse('<p><img src="url.com" alt="This is alt" longdesc="qsdf"/></p>'));
});

test('link', t => {
  const linkMd = 'This is a link :[Test link](ache.one){ ping="https://ache.one/big.brother"}';
  const {contents} = render(linkMd);
  t.deepEqual(parse(contents), parse('<p>This is a link :<a href="ache.one" ping="https://ache.one/big.brother">Test link</a></p>'));
});

test('autolink', t => {
  const linkMd = 'This is a link :<https://ache.one>{ ping="https://ache.one/big.brother"}';
  const {contents} = render(linkMd);
  t.deepEqual(parse(contents), parse('<p>This is a link :<a href="https://ache.one" ping="https://ache.one/big.brother">https://ache.one</a></p>'));
});

test('header', t => {
  const headerMd = `
Title of the article
====================
{data-id="title"}

`;
  const {contents} = renderDefault(headerMd);
  t.deepEqual(parse(contents), parse('<h1 data-id="title">Title of the article</h1>'));
});

test('atx header', t => {
  const atxHeaderMd = `
# Title of the article
{data-id="title"}

`;
  const {contents} = renderDefault(atxHeaderMd);
  t.deepEqual(parse(contents), parse('<h1 data-id="title">Title of the article</h1>'));
});

test('atx header inline', t => {
  const atxHeaderMd = `
# Title of the article {data-id="title"}   

`;
  const {contents} = renderDefault(atxHeaderMd);
  t.deepEqual(parse(contents), parse('<h1 data-id="title">Title of the article</h1>'));
});

test('atx header inline 2', t => {
  const atxHeaderMd = `
# Title of the article{data-id="title"}

`;
  const {contents} = renderDefault(atxHeaderMd);
  t.deepEqual(parse(contents), parse('<h1 data-id="title">Title of the article</h1>'));
});

test('header error inline', t => {
  const atxHeaderMd = `
Title of the article {data-id="title"}
======================================

`;
  const {contents} = renderDefault(atxHeaderMd);
  t.deepEqual(parse(contents), parse('<h1>Title of the article {data-id="title"}</h1>'));
});

test('not atx header inline', t => {
  const atxHeaderMd = `
# {data-id="title"}

`;
  const {contents} = renderDefault(atxHeaderMd);
  t.deepEqual(parse(contents), parse('<h1>{data-id="title"}</h1>'));
});

test('not atx header inline 2', t => {
  const atxHeaderMd = `
# Header {data-id="title"

`;
  const {contents} = renderDefault(atxHeaderMd);
  t.deepEqual(parse(contents), parse('<h1>Header {data-id="title"</h1>'));
});

test('not atx header inline 3', t => {
  const atxHeaderMd = `
# Header data-id="title"}

`;
  const {contents} = renderDefault(atxHeaderMd);
  t.deepEqual(parse(contents), parse('<h1>Header data-id="title"}</h1>'));
});

test('emphasis and strong', t => {
  const emphasis = 'Hey ! *That looks cool*{style="color: blue;"} ! No, that\'s **not**{.not} !';
  const {contents} = renderDefault(emphasis);
  t.deepEqual(parse(contents), parse('<p>Hey ! <em style="color: blue;">That looks cool</em> ! No, that\'s <strong class="not">not</strong> !'));
});

test('linkReference', t => {
  const linkRef = `[Google][google]{hreflang="en"}

[google]: https://google.com
`;
  const {contents} = renderDefault(linkRef);
  t.deepEqual(parse(contents), parse('<p><a href="https://google.com" hreflang="en">Google</a></p>'));
});

test('footnote', t => {
  const footnotes = `Since XP is good we should always use XP[^xp]{data-id=xp}

[^xp]: Apply XP principe to XP.
`;
  const {contents} = renderFootnotes(footnotes);
  t.deepEqual(parse(contents), parse(`<p>Since XP is good we should always use XP<sup id="fnref-xp"><a href="#fn-xp" class="footnote-ref" data-id="xp">xp</a></sup></p>
<div class="footnotes">
<hr>
<ol>
<li id="fn-xp">Apply XP principe to XP.<a href="#fnref-xp" class="footnote-backref">↩</a></li>
</ol>
</div>`));
});

/* Readme tests
 *
 * Should be act acording to the README.md
 */

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

/* Extended tests
 *
 * They test the support of the feature that extended the pool of attribute
 * that can be parsed.
 */

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
  const renderExtended = generateExtendParser({extend: {'*': ['ex-attr']}});
  const globalString = ' *Wait* ! You are **beautiful**{ ex-attr="true" } !';
  const {contents} = renderExtended(globalString);
  t.deepEqual(parse(contents), parse('<p> <em>Wait</em> ! You are <strong ex-attr="true">beautiful</strong> !</p>'));
});

test('extended-invalid-scope', t => {
  const renderExtended = generateExtendParser({scope: 'invalid', extend: {strong: ['ex-attr']}});
  const invalidString = '*Wait* ! You are **beautiful**{ ex-attr="true" onload="qdss" pss="NOK" } !';
  const {contents} = renderExtended(invalidString);
  t.deepEqual(parse(contents), parse('<p><em>Wait</em> ! You are <strong ex-attr="true">beautiful</strong> !</p>'));
});

test('invalid-scope', t => {
  const renderExtended = generateExtendParser({extend: 'exAttr'});
  const invalidString = ' *Wait* ! I **love**{ exAttr="true" onload="qdss" pss="NOK" } you !';
  const {contents} = renderExtended(invalidString);
  t.deepEqual(parse(contents), parse('<p> <em>Wait</em> ! I <strong>love</strong> you !</p>'));
});

test('invalid-extend', t => {
  const renderExtended = generateExtendParser({extend: 'exAttr'});
  const invalidString = ' *Wait* ! I **love**{ exAttr="true" onload="qdss" attr="NOK" style="color: red;"} you!';
  const {contents} = renderExtended(invalidString);
  t.deepEqual(parse(contents), parse('<p> <em>Wait</em> ! I <strong style="color: red;">love</strong> you!</p>'));
});

/* Special attributes tests
  *
  * aria attributes: Focused on accessibility. They have the form aria-*
  * Global custom attributes: User ended attributes. They have the form data-*
  *
  */

test('global-aria', t => {
  const invalidString = ' *Wait* ! I **love**{ style="color: pink;" aria-love="true" } you!';
  const {contents} = renderDefault(invalidString);
  t.deepEqual(parse(contents), parse('<p> <em>Wait</em> ! I <strong style="color: pink;" aria-love="true">love</strong> you!</p>'));
});

test('global custom attribute', t => {
  const renderExtended = generateExtendParser({extends: {image: ['quality']}});
  const extentedString = `*Wait* !
This is a test image : ![test](img.jpg){data-id=2}
`;
  const {contents} = renderExtended(extentedString);
  t.deepEqual(parse(contents), parse(`<p><em>Wait</em> !
This is a test image : <img src="img.jpg" alt="test" data-id="2"></p>`));

  t.notDeepEqual(parse(contents), parse(`<p><em>Wait</em> !
This is a test image : <img src="img.jpg" alt="test"></p>`));
});

test('global custom attributes 2', t => {
  const renderExtended = generateExtendParser({extends: {image: ['quality']}});
  const extentedString = `*Wait* !
This is a test image : ![test](img.jpg){data-id-node=2}
`;
  const {contents} = renderExtended(extentedString);
  t.deepEqual(parse(contents), parse(`<p><em>Wait</em> !
This is a test image : <img src="img.jpg" alt="test" data-id-node="2"></p>`));

  t.notDeepEqual(parse(contents), parse(`<p><em>Wait</em> !
This is a test image : <img src="img.jpg" alt="test"></p>`));
});

test('global custom attributes 3', t => {
  const renderExtended = generateExtendParser({extends: {image: ['quality']}});
  const extentedString = `*Wait* !
This is a test image : ![test](img.jpg){data--id=2}
`;
  const {contents} = renderExtended(extentedString);
  t.deepEqual(parse(contents), parse(`<p><em>Wait</em> !
This is a test image : <img src="img.jpg" alt="test"></p>`));
});

test('global custom attributes 4', t => {
  const renderExtended = generateExtendParser({extends: {image: ['quality']}});
  const extentedString = `*Wait* !
This is a test image : ![test](img.jpg){data-i=2}
`;
  const {contents} = renderExtended(extentedString);
  t.deepEqual(parse(contents), parse(`<p><em>Wait</em> !
This is a test image : <img src="img.jpg" alt="test" data-i=2></p>`));

  t.notDeepEqual(parse(contents), parse(`<p><em>Wait</em> !
This is a test image : <img src="img.jpg" alt="test"></p>`));
});

