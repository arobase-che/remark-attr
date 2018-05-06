'use strict';

var parseAttr = require('md-attr-parser');

module.exports = linkAttr;

function linkAttr() {
  var parser = this.Parser;
  var tokenizers;

  if (!isRemarkParser(parser)) {
    throw new Error('Missing parser to attach `remark-attr` [link] (to)');
  }

  tokenizers = parser.prototype.inlineTokenizers;

  linkTokenize.locator = tokenizers.link.locator;
  let oldLink = tokenizers.link;

  function linkTokenize(eat, value, silent) {
    let linkEaten = oldLink.bind(this)(eat,value,silent);

    var self = this;
    var index = 0;
    var pedantic = self.options.pedantic;
    var commonmark = self.options.commonmark;
    var gfm = self.options.gfm;
    var parsedAttr;
    const length = value.length;

    if( !linkEaten || !linkEaten.position ) {
      return undefined;
    }
    index = linkEaten.position.end.offset - linkEaten.position.start.offset;

    if (index < length && value.charAt(index) === '{' ) {
      parsedAttr = parseAttr(value, index);
    }

    if (parsedAttr) {
      linkEaten.data = {hProperties: parsedAttr.prop};
      linkEaten = eat(parsedAttr.eaten)(linkEaten);
    }
    return linkEaten;
  }

  tokenizers.link = linkTokenize;
}

function isRemarkParser(parser) {
  return Boolean(
    parser &&
    parser.prototype &&
    parser.prototype.inlineTokenizers &&
    parser.prototype.inlineTokenizers.link &&
    parser.prototype.inlineTokenizers.link.locator
  );
}

