'use strict';

const parseAttr = require('md-attr-parser');
const htmlElemAttr = require('html-element-attributes');

const DOMEventHandler = [
  "onabort", "onautocomplete", "onautocompleteerror",
  "onblur", "oncancel", "oncanplay",
  "oncanplaythrough", "onchange", "onclick",
  "onclose", "oncontextmenu", "oncuechange",
  "ondblclick", "ondrag", "ondragend",
  "ondragenter", "ondragexit", "ondragleave",
  "ondragover", "ondragstart", "ondrop",
  "ondurationchange", "onemptied", "onended",
  "onerror", "onfocus", "oninput",
  "oninvalid", "onkeydown", "onkeypress",
  "onkeyup", "onload", "onloadeddata",
  "onloadedmetadata", "onloadstart", "onmousedown",
  "onmouseenter", "onmouseleave", "onmousemove",
  "onmouseout", "onmouseover", "onmouseup",
  "onmousewheel", "onpause", "onplay",
  "onplaying", "onprogress", "onratechange",
  "onreset", "onresize", "onscroll",
  "onseeked", "onseeking", "onselect",
  "onshow", "onsort", "onstalled",
  "onsubmit", "onsuspend", "ontimeupdate",
  "ontoggle", "onvolumechange", "onwaiting"
];
const convTypeTag = {
  'image':'img',
  'link': 'a',
  'header': 'h1',
};

function filterAttributes( prop, config, type ) {
  const scope = config.scope;
  const allowDangerousDOMEventHandlers = config.allowDangerousDOMEventHandlers;

  if( scope === "specific" ) {
    Object.getOwnPropertyNames(prop).forEach ( p => {
      if( htmlElemAttr[type].indexOf(p) < 0 &&
          htmlElemAttr["*"].indexOf(p) < 0 &&
          DOMEventHandler.indexOf(p) < 0 ) {
        console.log(p);
        delete prop[p];
      }
    });
  } else if ( scope === "global" ) {
    Object.getOwnPropertyNames(prop).forEach ( p => {
      if( htmlElemAttr["*"].indexOf(p) < 0 &&
          DOMEventHandler.indexOf(p) < 0 ) {
        delete prop[p];
      }
    });
  }
  if( ! allowDangerousDOMEventHandlers ) {
    Object.getOwnPropertyNames(prop).forEach ( p => {
      if( DOMEventHandler.indexOf(p) >= 0 ) {
        delete prop[p];
      }
    });
  }
  return prop;
}

module.exports = function linkAttr( config ) {
  let parser = this.Parser;

  if( config === undefined ) {
    config = {
      allowDangerousDOMEventHandlers: false,
      elements: ["links","images","headers"],
      extends: [],
      scope: "specific",
    };
  }

  if (!isRemarkParser(parser)) {
    throw new Error('Missing parser to attach `remark-attr` [link] (to)');
  }

  let tokenizers = parser.prototype.inlineTokenizers;

  const oldLink = tokenizers.link;

  linkTokenize.locator = tokenizers.link.locator;

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

    const type = convTypeTag[linkEaten.type];

    index = linkEaten.position.end.offset - linkEaten.position.start.offset;

    if (index < length && value.charAt(index) === '{' ) {
      parsedAttr = parseAttr(value, index);
    }

    if (parsedAttr) {
      if( config.scope && config.scope != "none" ) {

        const filtredProp  = filterAttributes( parsedAttr.prop, config, type );
        if( filtredProp !== {} ) {
          if( linkEaten.data ) {
            linkEaten.data.hProperties = filtredProp;
          } else {
            linkEaten.data = {hProperties: filtredProp};
          }
        }
      }
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

