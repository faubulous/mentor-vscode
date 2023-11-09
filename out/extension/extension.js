"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/tslib/tslib.es6.js
var tslib_es6_exports = {};
__export(tslib_es6_exports, {
  __assign: () => __assign,
  __asyncDelegator: () => __asyncDelegator,
  __asyncGenerator: () => __asyncGenerator,
  __asyncValues: () => __asyncValues,
  __await: () => __await,
  __awaiter: () => __awaiter,
  __classPrivateFieldGet: () => __classPrivateFieldGet,
  __classPrivateFieldSet: () => __classPrivateFieldSet,
  __createBinding: () => __createBinding,
  __decorate: () => __decorate,
  __exportStar: () => __exportStar,
  __extends: () => __extends,
  __generator: () => __generator,
  __importDefault: () => __importDefault,
  __importStar: () => __importStar,
  __makeTemplateObject: () => __makeTemplateObject,
  __metadata: () => __metadata,
  __param: () => __param,
  __read: () => __read,
  __rest: () => __rest,
  __spread: () => __spread,
  __spreadArrays: () => __spreadArrays,
  __values: () => __values
});
function __extends(d, b) {
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
function __rest(s, e) {
  var t = {};
  for (var p in s)
    if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
        t[p[i]] = s[p[i]];
    }
  return t;
}
function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
    r = Reflect.decorate(decorators, target, key, desc);
  else
    for (var i = decorators.length - 1; i >= 0; i--)
      if (d = decorators[i])
        r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function __param(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
    return Reflect.metadata(metadataKey, metadataValue);
}
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1)
      throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f)
      throw new TypeError("Generator is already executing.");
    while (_)
      try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
          return t;
        if (y = 0, t)
          op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2])
              _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5)
      throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
}
function __createBinding(o, m, k, k2) {
  if (k2 === void 0)
    k2 = k;
  o[k2] = m[k];
}
function __exportStar(m, exports) {
  for (var p in m)
    if (p !== "default" && !exports.hasOwnProperty(p))
      exports[p] = m[p];
}
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m)
    return m.call(o);
  if (o && typeof o.length === "number")
    return {
      next: function() {
        if (o && i >= o.length)
          o = void 0;
        return { value: o && o[i++], done: !o };
      }
    };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m)
    return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
      ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"]))
        m.call(i);
    } finally {
      if (e)
        throw e.error;
    }
  }
  return ar;
}
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++)
    ar = ar.concat(__read(arguments[i]));
  return ar;
}
function __spreadArrays() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++)
    s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++)
    for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
      r[k] = a[j];
  return r;
}
function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator)
    throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i;
  function verb(n) {
    if (g[n])
      i[n] = function(v) {
        return new Promise(function(a, b) {
          q.push([n, v, a, b]) > 1 || resume(n, v);
        });
      };
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length)
      resume(q[0][0], q[0][1]);
  }
}
function __asyncDelegator(o) {
  var i, p;
  return i = {}, verb("next"), verb("throw", function(e) {
    throw e;
  }), verb("return"), i[Symbol.iterator] = function() {
    return this;
  }, i;
  function verb(n, f) {
    i[n] = o[n] ? function(v) {
      return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v;
    } : f;
  }
}
function __asyncValues(o) {
  if (!Symbol.asyncIterator)
    throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
    return this;
  }, i);
  function verb(n) {
    i[n] = o[n] && function(v) {
      return new Promise(function(resolve, reject) {
        v = o[n](v), settle(resolve, reject, v.done, v.value);
      });
    };
  }
  function settle(resolve, reject, d, v) {
    Promise.resolve(v).then(function(v2) {
      resolve({ value: v2, done: d });
    }, reject);
  }
}
function __makeTemplateObject(cooked, raw) {
  if (Object.defineProperty) {
    Object.defineProperty(cooked, "raw", { value: raw });
  } else {
    cooked.raw = raw;
  }
  return cooked;
}
function __importStar(mod) {
  if (mod && mod.__esModule)
    return mod;
  var result = {};
  if (mod != null) {
    for (var k in mod)
      if (Object.hasOwnProperty.call(mod, k))
        result[k] = mod[k];
  }
  result.default = mod;
  return result;
}
function __importDefault(mod) {
  return mod && mod.__esModule ? mod : { default: mod };
}
function __classPrivateFieldGet(receiver, privateMap) {
  if (!privateMap.has(receiver)) {
    throw new TypeError("attempted to get private field on non-instance");
  }
  return privateMap.get(receiver);
}
function __classPrivateFieldSet(receiver, privateMap, value) {
  if (!privateMap.has(receiver)) {
    throw new TypeError("attempted to set private field on non-instance");
  }
  privateMap.set(receiver, value);
  return value;
}
var extendStatics, __assign;
var init_tslib_es6 = __esm({
  "node_modules/tslib/tslib.es6.js"() {
    extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
        d2.__proto__ = b2;
      } || function(d2, b2) {
        for (var p in b2)
          if (b2.hasOwnProperty(p))
            d2[p] = b2[p];
      };
      return extendStatics(d, b);
    };
    __assign = function() {
      __assign = Object.assign || function __assign2(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p))
              t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
  }
});

// node_modules/n3/src/IRIs.js
var RDF, XSD, SWAP, IRIs_default;
var init_IRIs = __esm({
  "node_modules/n3/src/IRIs.js"() {
    RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
    XSD = "http://www.w3.org/2001/XMLSchema#";
    SWAP = "http://www.w3.org/2000/10/swap/";
    IRIs_default = {
      xsd: {
        decimal: `${XSD}decimal`,
        boolean: `${XSD}boolean`,
        double: `${XSD}double`,
        integer: `${XSD}integer`,
        string: `${XSD}string`
      },
      rdf: {
        type: `${RDF}type`,
        nil: `${RDF}nil`,
        first: `${RDF}first`,
        rest: `${RDF}rest`,
        langString: `${RDF}langString`
      },
      owl: {
        sameAs: "http://www.w3.org/2002/07/owl#sameAs"
      },
      r: {
        forSome: `${SWAP}reify#forSome`,
        forAll: `${SWAP}reify#forAll`
      },
      log: {
        implies: `${SWAP}log#implies`
      }
    };
  }
});

// node_modules/queue-microtask/index.js
var require_queue_microtask = __commonJS({
  "node_modules/queue-microtask/index.js"(exports, module2) {
    var promise;
    module2.exports = typeof queueMicrotask === "function" ? queueMicrotask.bind(typeof window !== "undefined" ? window : global) : (cb) => (promise || (promise = Promise.resolve())).then(cb).catch((err) => setTimeout(() => {
      throw err;
    }, 0));
  }
});

// node_modules/n3/src/N3Lexer.js
var import_queue_microtask, xsd, escapeSequence, escapeReplacements, illegalIriChars, lineModeRegExps, invalidRegExp, N3Lexer;
var init_N3Lexer = __esm({
  "node_modules/n3/src/N3Lexer.js"() {
    init_IRIs();
    import_queue_microtask = __toESM(require_queue_microtask());
    ({ xsd } = IRIs_default);
    escapeSequence = /\\u([a-fA-F0-9]{4})|\\U([a-fA-F0-9]{8})|\\([^])/g;
    escapeReplacements = {
      "\\": "\\",
      "'": "'",
      '"': '"',
      "n": "\n",
      "r": "\r",
      "t": "	",
      "f": "\f",
      "b": "\b",
      "_": "_",
      "~": "~",
      ".": ".",
      "-": "-",
      "!": "!",
      "$": "$",
      "&": "&",
      "(": "(",
      ")": ")",
      "*": "*",
      "+": "+",
      ",": ",",
      ";": ";",
      "=": "=",
      "/": "/",
      "?": "?",
      "#": "#",
      "@": "@",
      "%": "%"
    };
    illegalIriChars = /[\x00-\x20<>\\"\{\}\|\^\`]/;
    lineModeRegExps = {
      _iri: true,
      _unescapedIri: true,
      _simpleQuotedString: true,
      _langcode: true,
      _blank: true,
      _newline: true,
      _comment: true,
      _whitespace: true,
      _endOfFile: true
    };
    invalidRegExp = /$0^/;
    N3Lexer = class {
      constructor(options) {
        this._iri = /^<((?:[^ <>{}\\]|\\[uU])+)>[ \t]*/;
        this._unescapedIri = /^<([^\x00-\x20<>\\"\{\}\|\^\`]*)>[ \t]*/;
        this._simpleQuotedString = /^"([^"\\\r\n]*)"(?=[^"])/;
        this._simpleApostropheString = /^'([^'\\\r\n]*)'(?=[^'])/;
        this._langcode = /^@([a-z]+(?:-[a-z0-9]+)*)(?=[^a-z0-9\-])/i;
        this._prefix = /^((?:[A-Za-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)?:(?=[#\s<])/;
        this._prefixed = /^((?:[A-Za-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)?:((?:(?:[0-:A-Z_a-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff]|%[0-9a-fA-F]{2}|\\[!#-\/;=?\-@_~])(?:(?:[\.\-0-:A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff]|%[0-9a-fA-F]{2}|\\[!#-\/;=?\-@_~])*(?:[\-0-:A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff]|%[0-9a-fA-F]{2}|\\[!#-\/;=?\-@_~]))?)?)(?:[ \t]+|(?=\.?[,;!\^\s#()\[\]\{\}"'<>]))/;
        this._variable = /^\?(?:(?:[A-Z_a-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:[\-0-:A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)(?=[.,;!\^\s#()\[\]\{\}"'<>])/;
        this._blank = /^_:((?:[0-9A-Z_a-z\xc0-\xd6\xd8-\xf6\xf8-\u02ff\u0370-\u037d\u037f-\u1fff\u200c\u200d\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])(?:\.?[\-0-9A-Z_a-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u037f-\u1fff\u200c\u200d\u203f\u2040\u2070-\u218f\u2c00-\u2fef\u3001-\ud7ff\uf900-\ufdcf\ufdf0-\ufffd]|[\ud800-\udb7f][\udc00-\udfff])*)(?:[ \t]+|(?=\.?[,;:\s#()\[\]\{\}"'<>]))/;
        this._number = /^[\-+]?(?:(\d+\.\d*|\.?\d+)[eE][\-+]?|\d*(\.)?)\d+(?=\.?[,;:\s#()\[\]\{\}"'<>])/;
        this._boolean = /^(?:true|false)(?=[.,;\s#()\[\]\{\}"'<>])/;
        this._keyword = /^@[a-z]+(?=[\s#<:])/i;
        this._sparqlKeyword = /^(?:PREFIX|BASE|GRAPH)(?=[\s#<])/i;
        this._shortPredicates = /^a(?=[\s#()\[\]\{\}"'<>])/;
        this._newline = /^[ \t]*(?:#[^\n\r]*)?(?:\r\n|\n|\r)[ \t]*/;
        this._comment = /#([^\n\r]*)/;
        this._whitespace = /^[ \t]+/;
        this._endOfFile = /^(?:#[^\n\r]*)?$/;
        options = options || {};
        if (this._lineMode = !!options.lineMode) {
          this._n3Mode = false;
          for (const key in this) {
            if (!(key in lineModeRegExps) && this[key] instanceof RegExp)
              this[key] = invalidRegExp;
          }
        } else {
          this._n3Mode = options.n3 !== false;
        }
        this._comments = !!options.comments;
        this._literalClosingPos = 0;
      }
      // ## Private methods
      // ### `_tokenizeToEnd` tokenizes as for as possible, emitting tokens through the callback
      _tokenizeToEnd(callback, inputFinished) {
        let input = this._input;
        let currentLineLength = input.length;
        while (true) {
          let whiteSpaceMatch, comment;
          while (whiteSpaceMatch = this._newline.exec(input)) {
            if (this._comments && (comment = this._comment.exec(whiteSpaceMatch[0])))
              emitToken("comment", comment[1], "", this._line, whiteSpaceMatch[0].length);
            input = input.substr(whiteSpaceMatch[0].length, input.length);
            currentLineLength = input.length;
            this._line++;
          }
          if (!whiteSpaceMatch && (whiteSpaceMatch = this._whitespace.exec(input)))
            input = input.substr(whiteSpaceMatch[0].length, input.length);
          if (this._endOfFile.test(input)) {
            if (inputFinished) {
              if (this._comments && (comment = this._comment.exec(input)))
                emitToken("comment", comment[1], "", this._line, input.length);
              input = null;
              emitToken("eof", "", "", this._line, 0);
            }
            return this._input = input;
          }
          const line = this._line, firstChar = input[0];
          let type = "", value = "", prefix2 = "", match = null, matchLength = 0, inconclusive = false;
          switch (firstChar) {
            case "^":
              if (input.length < 3)
                break;
              else if (input[1] === "^") {
                this._previousMarker = "^^";
                input = input.substr(2);
                if (input[0] !== "<") {
                  inconclusive = true;
                  break;
                }
              } else {
                if (this._n3Mode) {
                  matchLength = 1;
                  type = "^";
                }
                break;
              }
            case "<":
              if (match = this._unescapedIri.exec(input))
                type = "IRI", value = match[1];
              else if (match = this._iri.exec(input)) {
                value = this._unescape(match[1]);
                if (value === null || illegalIriChars.test(value))
                  return reportSyntaxError(this);
                type = "IRI";
              } else if (input.length > 1 && input[1] === "<")
                type = "<<", matchLength = 2;
              else if (this._n3Mode && input.length > 1 && input[1] === "=")
                type = "inverse", matchLength = 2, value = ">";
              break;
            case ">":
              if (input.length > 1 && input[1] === ">")
                type = ">>", matchLength = 2;
              break;
            case "_":
              if ((match = this._blank.exec(input)) || inputFinished && (match = this._blank.exec(`${input} `)))
                type = "blank", prefix2 = "_", value = match[1];
              break;
            case '"':
              if (match = this._simpleQuotedString.exec(input))
                value = match[1];
              else {
                ({ value, matchLength } = this._parseLiteral(input));
                if (value === null)
                  return reportSyntaxError(this);
              }
              if (match !== null || matchLength !== 0) {
                type = "literal";
                this._literalClosingPos = 0;
              }
              break;
            case "'":
              if (!this._lineMode) {
                if (match = this._simpleApostropheString.exec(input))
                  value = match[1];
                else {
                  ({ value, matchLength } = this._parseLiteral(input));
                  if (value === null)
                    return reportSyntaxError(this);
                }
                if (match !== null || matchLength !== 0) {
                  type = "literal";
                  this._literalClosingPos = 0;
                }
              }
              break;
            case "?":
              if (this._n3Mode && (match = this._variable.exec(input)))
                type = "var", value = match[0];
              break;
            case "@":
              if (this._previousMarker === "literal" && (match = this._langcode.exec(input)))
                type = "langcode", value = match[1];
              else if (match = this._keyword.exec(input))
                type = match[0];
              break;
            case ".":
              if (input.length === 1 ? inputFinished : input[1] < "0" || input[1] > "9") {
                type = ".";
                matchLength = 1;
                break;
              }
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
            case "+":
            case "-":
              if (match = this._number.exec(input) || inputFinished && (match = this._number.exec(`${input} `))) {
                type = "literal", value = match[0];
                prefix2 = typeof match[1] === "string" ? xsd.double : typeof match[2] === "string" ? xsd.decimal : xsd.integer;
              }
              break;
            case "B":
            case "b":
            case "p":
            case "P":
            case "G":
            case "g":
              if (match = this._sparqlKeyword.exec(input))
                type = match[0].toUpperCase();
              else
                inconclusive = true;
              break;
            case "f":
            case "t":
              if (match = this._boolean.exec(input))
                type = "literal", value = match[0], prefix2 = xsd.boolean;
              else
                inconclusive = true;
              break;
            case "a":
              if (match = this._shortPredicates.exec(input))
                type = "abbreviation", value = "a";
              else
                inconclusive = true;
              break;
            case "=":
              if (this._n3Mode && input.length > 1) {
                type = "abbreviation";
                if (input[1] !== ">")
                  matchLength = 1, value = "=";
                else
                  matchLength = 2, value = ">";
              }
              break;
            case "!":
              if (!this._n3Mode)
                break;
            case ",":
            case ";":
            case "[":
            case "]":
            case "(":
            case ")":
            case "}":
              if (!this._lineMode) {
                matchLength = 1;
                type = firstChar;
              }
              break;
            case "{":
              if (!this._lineMode && input.length >= 2) {
                if (input[1] === "|")
                  type = "{|", matchLength = 2;
                else
                  type = firstChar, matchLength = 1;
              }
              break;
            case "|":
              if (input.length >= 2 && input[1] === "}")
                type = "|}", matchLength = 2;
              break;
            default:
              inconclusive = true;
          }
          if (inconclusive) {
            if ((this._previousMarker === "@prefix" || this._previousMarker === "PREFIX") && (match = this._prefix.exec(input)))
              type = "prefix", value = match[1] || "";
            else if ((match = this._prefixed.exec(input)) || inputFinished && (match = this._prefixed.exec(`${input} `)))
              type = "prefixed", prefix2 = match[1] || "", value = this._unescape(match[2]);
          }
          if (this._previousMarker === "^^") {
            switch (type) {
              case "prefixed":
                type = "type";
                break;
              case "IRI":
                type = "typeIRI";
                break;
              default:
                type = "";
            }
          }
          if (!type) {
            if (inputFinished || !/^'''|^"""/.test(input) && /\n|\r/.test(input))
              return reportSyntaxError(this);
            else
              return this._input = input;
          }
          const length = matchLength || match[0].length;
          const token = emitToken(type, value, prefix2, line, length);
          this.previousToken = token;
          this._previousMarker = type;
          input = input.substr(length, input.length);
        }
        function emitToken(type, value, prefix2, line, length) {
          const start = input ? currentLineLength - input.length : currentLineLength;
          const end = start + length;
          const token = { type, value, prefix: prefix2, line, start, end };
          callback(null, token);
          return token;
        }
        function reportSyntaxError(self) {
          callback(self._syntaxError(/^\S*/.exec(input)[0]));
        }
      }
      // ### `_unescape` replaces N3 escape codes by their corresponding characters
      _unescape(item) {
        let invalid = false;
        const replaced = item.replace(escapeSequence, (sequence, unicode4, unicode8, escapedChar) => {
          if (typeof unicode4 === "string")
            return String.fromCharCode(Number.parseInt(unicode4, 16));
          if (typeof unicode8 === "string") {
            let charCode = Number.parseInt(unicode8, 16);
            return charCode <= 65535 ? String.fromCharCode(Number.parseInt(unicode8, 16)) : String.fromCharCode(55296 + ((charCode -= 65536) >> 10), 56320 + (charCode & 1023));
          }
          if (escapedChar in escapeReplacements)
            return escapeReplacements[escapedChar];
          invalid = true;
          return "";
        });
        return invalid ? null : replaced;
      }
      // ### `_parseLiteral` parses a literal into an unescaped value
      _parseLiteral(input) {
        if (input.length >= 3) {
          const opening = input.match(/^(?:"""|"|'''|'|)/)[0];
          const openingLength = opening.length;
          let closingPos = Math.max(this._literalClosingPos, openingLength);
          while ((closingPos = input.indexOf(opening, closingPos)) > 0) {
            let backslashCount = 0;
            while (input[closingPos - backslashCount - 1] === "\\")
              backslashCount++;
            if (backslashCount % 2 === 0) {
              const raw = input.substring(openingLength, closingPos);
              const lines = raw.split(/\r\n|\r|\n/).length - 1;
              const matchLength = closingPos + openingLength;
              if (openingLength === 1 && lines !== 0 || openingLength === 3 && this._lineMode)
                break;
              this._line += lines;
              return { value: this._unescape(raw), matchLength };
            }
            closingPos++;
          }
          this._literalClosingPos = input.length - openingLength + 1;
        }
        return { value: "", matchLength: 0 };
      }
      // ### `_syntaxError` creates a syntax error for the given issue
      _syntaxError(issue) {
        this._input = null;
        const err = new Error(`Unexpected "${issue}" on line ${this._line}.`);
        err.context = {
          token: void 0,
          line: this._line,
          previousToken: this.previousToken
        };
        return err;
      }
      // ### Strips off any starting UTF BOM mark.
      _readStartingBom(input) {
        return input.startsWith("\uFEFF") ? input.substr(1) : input;
      }
      // ## Public methods
      // ### `tokenize` starts the transformation of an N3 document into an array of tokens.
      // The input can be a string or a stream.
      tokenize(input, callback) {
        this._line = 1;
        if (typeof input === "string") {
          this._input = this._readStartingBom(input);
          if (typeof callback === "function")
            (0, import_queue_microtask.default)(() => this._tokenizeToEnd(callback, true));
          else {
            const tokens = [];
            let error;
            this._tokenizeToEnd((e, t) => e ? error = e : tokens.push(t), true);
            if (error)
              throw error;
            return tokens;
          }
        } else {
          this._pendingBuffer = null;
          if (typeof input.setEncoding === "function")
            input.setEncoding("utf8");
          input.on("data", (data) => {
            if (this._input !== null && data.length !== 0) {
              if (this._pendingBuffer) {
                data = Buffer.concat([this._pendingBuffer, data]);
                this._pendingBuffer = null;
              }
              if (data[data.length - 1] & 128) {
                this._pendingBuffer = data;
              } else {
                if (typeof this._input === "undefined")
                  this._input = this._readStartingBom(typeof data === "string" ? data : data.toString());
                else
                  this._input += data;
                this._tokenizeToEnd(callback, false);
              }
            }
          });
          input.on("end", () => {
            if (typeof this._input === "string")
              this._tokenizeToEnd(callback, true);
          });
          input.on("error", callback);
        }
      }
    };
  }
});

// node_modules/n3/src/N3Util.js
var N3Util_exports = {};
__export(N3Util_exports, {
  inDefaultGraph: () => inDefaultGraph,
  isBlankNode: () => isBlankNode,
  isDefaultGraph: () => isDefaultGraph,
  isLiteral: () => isLiteral,
  isNamedNode: () => isNamedNode,
  isVariable: () => isVariable,
  prefix: () => prefix,
  prefixes: () => prefixes
});
function isNamedNode(term) {
  return !!term && term.termType === "NamedNode";
}
function isBlankNode(term) {
  return !!term && term.termType === "BlankNode";
}
function isLiteral(term) {
  return !!term && term.termType === "Literal";
}
function isVariable(term) {
  return !!term && term.termType === "Variable";
}
function isDefaultGraph(term) {
  return !!term && term.termType === "DefaultGraph";
}
function inDefaultGraph(quad2) {
  return isDefaultGraph(quad2.graph);
}
function prefix(iri, factory) {
  return prefixes({ "": iri.value || iri }, factory)("");
}
function prefixes(defaultPrefixes, factory) {
  const prefixes2 = /* @__PURE__ */ Object.create(null);
  for (const prefix2 in defaultPrefixes)
    processPrefix(prefix2, defaultPrefixes[prefix2]);
  factory = factory || N3DataFactory_default;
  function processPrefix(prefix2, iri) {
    if (typeof iri === "string") {
      const cache = /* @__PURE__ */ Object.create(null);
      prefixes2[prefix2] = (local) => {
        return cache[local] || (cache[local] = factory.namedNode(iri + local));
      };
    } else if (!(prefix2 in prefixes2)) {
      throw new Error(`Unknown prefix: ${prefix2}`);
    }
    return prefixes2[prefix2];
  }
  return processPrefix;
}
var init_N3Util = __esm({
  "node_modules/n3/src/N3Util.js"() {
    init_N3DataFactory();
  }
});

// node_modules/n3/src/N3DataFactory.js
function termFromId(id, factory, nested) {
  factory = factory || DataFactory;
  if (!id)
    return factory.defaultGraph();
  switch (id[0]) {
    case "?":
      return factory.variable(id.substr(1));
    case "_":
      return factory.blankNode(id.substr(2));
    case '"':
      if (factory === DataFactory)
        return new Literal(id);
      if (id[id.length - 1] === '"')
        return factory.literal(id.substr(1, id.length - 2));
      const endPos = id.lastIndexOf('"', id.length - 1);
      return factory.literal(
        id.substr(1, endPos - 1),
        id[endPos + 1] === "@" ? id.substr(endPos + 2) : factory.namedNode(id.substr(endPos + 3))
      );
    case "[":
      id = JSON.parse(id);
      break;
    default:
      if (!nested || !Array.isArray(id)) {
        return factory.namedNode(id);
      }
  }
  return factory.quad(
    termFromId(id[0], factory, true),
    termFromId(id[1], factory, true),
    termFromId(id[2], factory, true),
    id[3] && termFromId(id[3], factory, true)
  );
}
function termToId(term, nested) {
  if (typeof term === "string")
    return term;
  if (term instanceof Term && term.termType !== "Quad")
    return term.id;
  if (!term)
    return DEFAULTGRAPH.id;
  switch (term.termType) {
    case "NamedNode":
      return term.value;
    case "BlankNode":
      return `_:${term.value}`;
    case "Variable":
      return `?${term.value}`;
    case "DefaultGraph":
      return "";
    case "Literal":
      return `"${term.value}"${term.language ? `@${term.language}` : term.datatype && term.datatype.value !== xsd2.string ? `^^${term.datatype.value}` : ""}`;
    case "Quad":
      const res = [
        termToId(term.subject, true),
        termToId(term.predicate, true),
        termToId(term.object, true)
      ];
      if (!isDefaultGraph(term.graph)) {
        res.push(termToId(term.graph, true));
      }
      return nested ? res : JSON.stringify(res);
    default:
      throw new Error(`Unexpected termType: ${term.termType}`);
  }
}
function namedNode(iri) {
  return new NamedNode(iri);
}
function blankNode(name) {
  return new BlankNode(name || `n3-${_blankNodeCounter++}`);
}
function literal(value, languageOrDataType) {
  if (typeof languageOrDataType === "string")
    return new Literal(`"${value}"@${languageOrDataType.toLowerCase()}`);
  let datatype = languageOrDataType ? languageOrDataType.value : "";
  if (datatype === "") {
    if (typeof value === "boolean")
      datatype = xsd2.boolean;
    else if (typeof value === "number") {
      if (Number.isFinite(value))
        datatype = Number.isInteger(value) ? xsd2.integer : xsd2.double;
      else {
        datatype = xsd2.double;
        if (!Number.isNaN(value))
          value = value > 0 ? "INF" : "-INF";
      }
    }
  }
  return datatype === "" || datatype === xsd2.string ? new Literal(`"${value}"`) : new Literal(`"${value}"^^${datatype}`);
}
function variable(name) {
  return new Variable(name);
}
function defaultGraph() {
  return DEFAULTGRAPH;
}
function quad(subject, predicate, object, graph) {
  return new Quad(subject, predicate, object, graph);
}
var rdf, xsd2, DEFAULTGRAPH, _blankNodeCounter, DataFactory, N3DataFactory_default, Term, NamedNode, Literal, BlankNode, Variable, DefaultGraph, Quad;
var init_N3DataFactory = __esm({
  "node_modules/n3/src/N3DataFactory.js"() {
    init_IRIs();
    init_N3Util();
    ({ rdf, xsd: xsd2 } = IRIs_default);
    _blankNodeCounter = 0;
    DataFactory = {
      namedNode,
      blankNode,
      variable,
      literal,
      defaultGraph,
      quad,
      triple: quad
    };
    N3DataFactory_default = DataFactory;
    Term = class {
      constructor(id) {
        this.id = id;
      }
      // ### The value of this term
      get value() {
        return this.id;
      }
      // ### Returns whether this object represents the same term as the other
      equals(other) {
        if (other instanceof Term)
          return this.id === other.id;
        return !!other && this.termType === other.termType && this.value === other.value;
      }
      // ### Implement hashCode for Immutable.js, since we implement `equals`
      // https://immutable-js.com/docs/v4.0.0/ValueObject/#hashCode()
      hashCode() {
        return 0;
      }
      // ### Returns a plain object representation of this term
      toJSON() {
        return {
          termType: this.termType,
          value: this.value
        };
      }
    };
    NamedNode = class extends Term {
      // ### The term type of this term
      get termType() {
        return "NamedNode";
      }
    };
    Literal = class extends Term {
      // ### The term type of this term
      get termType() {
        return "Literal";
      }
      // ### The text value of this literal
      get value() {
        return this.id.substring(1, this.id.lastIndexOf('"'));
      }
      // ### The language of this literal
      get language() {
        const id = this.id;
        let atPos = id.lastIndexOf('"') + 1;
        return atPos < id.length && id[atPos++] === "@" ? id.substr(atPos).toLowerCase() : "";
      }
      // ### The datatype IRI of this literal
      get datatype() {
        return new NamedNode(this.datatypeString);
      }
      // ### The datatype string of this literal
      get datatypeString() {
        const id = this.id, dtPos = id.lastIndexOf('"') + 1;
        const char = dtPos < id.length ? id[dtPos] : "";
        return char === "^" ? id.substr(dtPos + 2) : (
          // If "@" follows, return rdf:langString; xsd:string otherwise
          char !== "@" ? xsd2.string : rdf.langString
        );
      }
      // ### Returns whether this object represents the same term as the other
      equals(other) {
        if (other instanceof Literal)
          return this.id === other.id;
        return !!other && !!other.datatype && this.termType === other.termType && this.value === other.value && this.language === other.language && this.datatype.value === other.datatype.value;
      }
      toJSON() {
        return {
          termType: this.termType,
          value: this.value,
          language: this.language,
          datatype: { termType: "NamedNode", value: this.datatypeString }
        };
      }
    };
    BlankNode = class extends Term {
      constructor(name) {
        super(`_:${name}`);
      }
      // ### The term type of this term
      get termType() {
        return "BlankNode";
      }
      // ### The name of this blank node
      get value() {
        return this.id.substr(2);
      }
    };
    Variable = class extends Term {
      constructor(name) {
        super(`?${name}`);
      }
      // ### The term type of this term
      get termType() {
        return "Variable";
      }
      // ### The name of this variable
      get value() {
        return this.id.substr(1);
      }
    };
    DefaultGraph = class extends Term {
      constructor() {
        super("");
        return DEFAULTGRAPH || this;
      }
      // ### The term type of this term
      get termType() {
        return "DefaultGraph";
      }
      // ### Returns whether this object represents the same term as the other
      equals(other) {
        return this === other || !!other && this.termType === other.termType;
      }
    };
    DEFAULTGRAPH = new DefaultGraph();
    Quad = class extends Term {
      constructor(subject, predicate, object, graph) {
        super("");
        this._subject = subject;
        this._predicate = predicate;
        this._object = object;
        this._graph = graph || DEFAULTGRAPH;
      }
      // ### The term type of this term
      get termType() {
        return "Quad";
      }
      get subject() {
        return this._subject;
      }
      get predicate() {
        return this._predicate;
      }
      get object() {
        return this._object;
      }
      get graph() {
        return this._graph;
      }
      // ### Returns a plain object representation of this quad
      toJSON() {
        return {
          termType: this.termType,
          subject: this._subject.toJSON(),
          predicate: this._predicate.toJSON(),
          object: this._object.toJSON(),
          graph: this._graph.toJSON()
        };
      }
      // ### Returns whether this object represents the same quad as the other
      equals(other) {
        return !!other && this._subject.equals(other.subject) && this._predicate.equals(other.predicate) && this._object.equals(other.object) && this._graph.equals(other.graph);
      }
    };
  }
});

// node_modules/n3/src/N3Parser.js
function noop() {
}
function initDataFactory(parser, factory) {
  const namedNode2 = factory.namedNode;
  parser._namedNode = namedNode2;
  parser._blankNode = factory.blankNode;
  parser._literal = factory.literal;
  parser._variable = factory.variable;
  parser._quad = factory.quad;
  parser.DEFAULTGRAPH = factory.defaultGraph();
  parser.RDF_FIRST = namedNode2(IRIs_default.rdf.first);
  parser.RDF_REST = namedNode2(IRIs_default.rdf.rest);
  parser.RDF_NIL = namedNode2(IRIs_default.rdf.nil);
  parser.N3_FORALL = namedNode2(IRIs_default.r.forAll);
  parser.N3_FORSOME = namedNode2(IRIs_default.r.forSome);
  parser.ABBREVIATIONS = {
    "a": namedNode2(IRIs_default.rdf.type),
    "=": namedNode2(IRIs_default.owl.sameAs),
    ">": namedNode2(IRIs_default.log.implies)
  };
  parser.QUANTIFIERS_GRAPH = namedNode2("urn:n3:quantifiers");
}
var blankNodePrefix, N3Parser;
var init_N3Parser = __esm({
  "node_modules/n3/src/N3Parser.js"() {
    init_N3Lexer();
    init_N3DataFactory();
    init_IRIs();
    blankNodePrefix = 0;
    N3Parser = class {
      constructor(options) {
        this._contextStack = [];
        this._graph = null;
        options = options || {};
        this._setBase(options.baseIRI);
        options.factory && initDataFactory(this, options.factory);
        const format = typeof options.format === "string" ? options.format.match(/\w*$/)[0].toLowerCase() : "", isTurtle = /turtle/.test(format), isTriG = /trig/.test(format), isNTriples = /triple/.test(format), isNQuads = /quad/.test(format), isN3 = this._n3Mode = /n3/.test(format), isLineMode = isNTriples || isNQuads;
        if (!(this._supportsNamedGraphs = !(isTurtle || isN3)))
          this._readPredicateOrNamedGraph = this._readPredicate;
        this._supportsQuads = !(isTurtle || isTriG || isNTriples || isN3);
        this._supportsRDFStar = format === "" || /star|\*$/.test(format);
        if (isLineMode)
          this._resolveRelativeIRI = (iri) => {
            return null;
          };
        this._blankNodePrefix = typeof options.blankNodePrefix !== "string" ? "" : options.blankNodePrefix.replace(/^(?!_:)/, "_:");
        this._lexer = options.lexer || new N3Lexer({ lineMode: isLineMode, n3: isN3 });
        this._explicitQuantifiers = !!options.explicitQuantifiers;
      }
      // ## Static class methods
      // ### `_resetBlankNodePrefix` restarts blank node prefix identification
      static _resetBlankNodePrefix() {
        blankNodePrefix = 0;
      }
      // ## Private methods
      // ### `_setBase` sets the base IRI to resolve relative IRIs
      _setBase(baseIRI) {
        if (!baseIRI) {
          this._base = "";
          this._basePath = "";
        } else {
          const fragmentPos = baseIRI.indexOf("#");
          if (fragmentPos >= 0)
            baseIRI = baseIRI.substr(0, fragmentPos);
          this._base = baseIRI;
          this._basePath = baseIRI.indexOf("/") < 0 ? baseIRI : baseIRI.replace(/[^\/?]*(?:\?.*)?$/, "");
          baseIRI = baseIRI.match(/^(?:([a-z][a-z0-9+.-]*:))?(?:\/\/[^\/]*)?/i);
          this._baseRoot = baseIRI[0];
          this._baseScheme = baseIRI[1];
        }
      }
      // ### `_saveContext` stores the current parsing context
      // when entering a new scope (list, blank node, formula)
      _saveContext(type, graph, subject, predicate, object) {
        const n3Mode = this._n3Mode;
        this._contextStack.push({
          type,
          subject,
          predicate,
          object,
          graph,
          inverse: n3Mode ? this._inversePredicate : false,
          blankPrefix: n3Mode ? this._prefixes._ : "",
          quantified: n3Mode ? this._quantified : null
        });
        if (n3Mode) {
          this._inversePredicate = false;
          this._prefixes._ = this._graph ? `${this._graph.value}.` : ".";
          this._quantified = Object.create(this._quantified);
        }
      }
      // ### `_restoreContext` restores the parent context
      // when leaving a scope (list, blank node, formula)
      _restoreContext(type, token) {
        const context = this._contextStack.pop();
        if (!context || context.type !== type)
          return this._error(`Unexpected ${token.type}`, token);
        this._subject = context.subject;
        this._predicate = context.predicate;
        this._object = context.object;
        this._graph = context.graph;
        if (this._n3Mode) {
          this._inversePredicate = context.inverse;
          this._prefixes._ = context.blankPrefix;
          this._quantified = context.quantified;
        }
      }
      // ### `_readInTopContext` reads a token when in the top context
      _readInTopContext(token) {
        switch (token.type) {
          case "eof":
            if (this._graph !== null)
              return this._error("Unclosed graph", token);
            delete this._prefixes._;
            return this._callback(null, null, this._prefixes);
          case "PREFIX":
            this._sparqlStyle = true;
          case "@prefix":
            return this._readPrefix;
          case "BASE":
            this._sparqlStyle = true;
          case "@base":
            return this._readBaseIRI;
          case "{":
            if (this._supportsNamedGraphs) {
              this._graph = "";
              this._subject = null;
              return this._readSubject;
            }
          case "GRAPH":
            if (this._supportsNamedGraphs)
              return this._readNamedGraphLabel;
          default:
            return this._readSubject(token);
        }
      }
      // ### `_readEntity` reads an IRI, prefixed name, blank node, or variable
      _readEntity(token, quantifier) {
        let value;
        switch (token.type) {
          case "IRI":
          case "typeIRI":
            const iri = this._resolveIRI(token.value);
            if (iri === null)
              return this._error("Invalid IRI", token);
            value = this._namedNode(iri);
            break;
          case "type":
          case "prefixed":
            const prefix2 = this._prefixes[token.prefix];
            if (prefix2 === void 0)
              return this._error(`Undefined prefix "${token.prefix}:"`, token);
            value = this._namedNode(prefix2 + token.value);
            break;
          case "blank":
            value = this._blankNode(this._prefixes[token.prefix] + token.value);
            break;
          case "var":
            value = this._variable(token.value.substr(1));
            break;
          default:
            return this._error(`Expected entity but got ${token.type}`, token);
        }
        if (!quantifier && this._n3Mode && value.id in this._quantified)
          value = this._quantified[value.id];
        return value;
      }
      // ### `_readSubject` reads a quad's subject
      _readSubject(token) {
        this._predicate = null;
        switch (token.type) {
          case "[":
            this._saveContext(
              "blank",
              this._graph,
              this._subject = this._blankNode(),
              null,
              null
            );
            return this._readBlankNodeHead;
          case "(":
            this._saveContext("list", this._graph, this.RDF_NIL, null, null);
            this._subject = null;
            return this._readListItem;
          case "{":
            if (!this._n3Mode)
              return this._error("Unexpected graph", token);
            this._saveContext(
              "formula",
              this._graph,
              this._graph = this._blankNode(),
              null,
              null
            );
            return this._readSubject;
          case "}":
            return this._readPunctuation(token);
          case "@forSome":
            if (!this._n3Mode)
              return this._error('Unexpected "@forSome"', token);
            this._subject = null;
            this._predicate = this.N3_FORSOME;
            this._quantifier = this._blankNode;
            return this._readQuantifierList;
          case "@forAll":
            if (!this._n3Mode)
              return this._error('Unexpected "@forAll"', token);
            this._subject = null;
            this._predicate = this.N3_FORALL;
            this._quantifier = this._variable;
            return this._readQuantifierList;
          case "literal":
            if (!this._n3Mode)
              return this._error("Unexpected literal", token);
            if (token.prefix.length === 0) {
              this._literalValue = token.value;
              return this._completeSubjectLiteral;
            } else
              this._subject = this._literal(token.value, this._namedNode(token.prefix));
            break;
          case "<<":
            if (!this._supportsRDFStar)
              return this._error("Unexpected RDF* syntax", token);
            this._saveContext("<<", this._graph, null, null, null);
            this._graph = null;
            return this._readSubject;
          default:
            if ((this._subject = this._readEntity(token)) === void 0)
              return;
            if (this._n3Mode)
              return this._getPathReader(this._readPredicateOrNamedGraph);
        }
        return this._readPredicateOrNamedGraph;
      }
      // ### `_readPredicate` reads a quad's predicate
      _readPredicate(token) {
        const type = token.type;
        switch (type) {
          case "inverse":
            this._inversePredicate = true;
          case "abbreviation":
            this._predicate = this.ABBREVIATIONS[token.value];
            break;
          case ".":
          case "]":
          case "}":
            if (this._predicate === null)
              return this._error(`Unexpected ${type}`, token);
            this._subject = null;
            return type === "]" ? this._readBlankNodeTail(token) : this._readPunctuation(token);
          case ";":
            return this._predicate !== null ? this._readPredicate : this._error("Expected predicate but got ;", token);
          case "[":
            if (this._n3Mode) {
              this._saveContext(
                "blank",
                this._graph,
                this._subject,
                this._subject = this._blankNode(),
                null
              );
              return this._readBlankNodeHead;
            }
          case "blank":
            if (!this._n3Mode)
              return this._error("Disallowed blank node as predicate", token);
          default:
            if ((this._predicate = this._readEntity(token)) === void 0)
              return;
        }
        return this._readObject;
      }
      // ### `_readObject` reads a quad's object
      _readObject(token) {
        switch (token.type) {
          case "literal":
            if (token.prefix.length === 0) {
              this._literalValue = token.value;
              return this._readDataTypeOrLang;
            } else
              this._object = this._literal(token.value, this._namedNode(token.prefix));
            break;
          case "[":
            this._saveContext(
              "blank",
              this._graph,
              this._subject,
              this._predicate,
              this._subject = this._blankNode()
            );
            return this._readBlankNodeHead;
          case "(":
            this._saveContext("list", this._graph, this._subject, this._predicate, this.RDF_NIL);
            this._subject = null;
            return this._readListItem;
          case "{":
            if (!this._n3Mode)
              return this._error("Unexpected graph", token);
            this._saveContext(
              "formula",
              this._graph,
              this._subject,
              this._predicate,
              this._graph = this._blankNode()
            );
            return this._readSubject;
          case "<<":
            if (!this._supportsRDFStar)
              return this._error("Unexpected RDF* syntax", token);
            this._saveContext("<<", this._graph, this._subject, this._predicate, null);
            this._graph = null;
            return this._readSubject;
          default:
            if ((this._object = this._readEntity(token)) === void 0)
              return;
            if (this._n3Mode)
              return this._getPathReader(this._getContextEndReader());
        }
        return this._getContextEndReader();
      }
      // ### `_readPredicateOrNamedGraph` reads a quad's predicate, or a named graph
      _readPredicateOrNamedGraph(token) {
        return token.type === "{" ? this._readGraph(token) : this._readPredicate(token);
      }
      // ### `_readGraph` reads a graph
      _readGraph(token) {
        if (token.type !== "{")
          return this._error(`Expected graph but got ${token.type}`, token);
        this._graph = this._subject, this._subject = null;
        return this._readSubject;
      }
      // ### `_readBlankNodeHead` reads the head of a blank node
      _readBlankNodeHead(token) {
        if (token.type === "]") {
          this._subject = null;
          return this._readBlankNodeTail(token);
        } else {
          this._predicate = null;
          return this._readPredicate(token);
        }
      }
      // ### `_readBlankNodeTail` reads the end of a blank node
      _readBlankNodeTail(token) {
        if (token.type !== "]")
          return this._readBlankNodePunctuation(token);
        if (this._subject !== null)
          this._emit(this._subject, this._predicate, this._object, this._graph);
        const empty = this._predicate === null;
        this._restoreContext("blank", token);
        if (this._object !== null)
          return this._getContextEndReader();
        else if (this._predicate !== null)
          return this._readObject;
        else
          return empty ? this._readPredicateOrNamedGraph : this._readPredicateAfterBlank;
      }
      // ### `_readPredicateAfterBlank` reads a predicate after an anonymous blank node
      _readPredicateAfterBlank(token) {
        switch (token.type) {
          case ".":
          case "}":
            this._subject = null;
            return this._readPunctuation(token);
          default:
            return this._readPredicate(token);
        }
      }
      // ### `_readListItem` reads items from a list
      _readListItem(token) {
        let item = null, list = null, next = this._readListItem;
        const previousList = this._subject, stack = this._contextStack, parent = stack[stack.length - 1];
        switch (token.type) {
          case "[":
            this._saveContext(
              "blank",
              this._graph,
              list = this._blankNode(),
              this.RDF_FIRST,
              this._subject = item = this._blankNode()
            );
            next = this._readBlankNodeHead;
            break;
          case "(":
            this._saveContext(
              "list",
              this._graph,
              list = this._blankNode(),
              this.RDF_FIRST,
              this.RDF_NIL
            );
            this._subject = null;
            break;
          case ")":
            this._restoreContext("list", token);
            if (stack.length !== 0 && stack[stack.length - 1].type === "list")
              this._emit(this._subject, this._predicate, this._object, this._graph);
            if (this._predicate === null) {
              next = this._readPredicate;
              if (this._subject === this.RDF_NIL)
                return next;
            } else {
              next = this._getContextEndReader();
              if (this._object === this.RDF_NIL)
                return next;
            }
            list = this.RDF_NIL;
            break;
          case "literal":
            if (token.prefix.length === 0) {
              this._literalValue = token.value;
              next = this._readListItemDataTypeOrLang;
            } else {
              item = this._literal(token.value, this._namedNode(token.prefix));
              next = this._getContextEndReader();
            }
            break;
          case "{":
            if (!this._n3Mode)
              return this._error("Unexpected graph", token);
            this._saveContext(
              "formula",
              this._graph,
              this._subject,
              this._predicate,
              this._graph = this._blankNode()
            );
            return this._readSubject;
          default:
            if ((item = this._readEntity(token)) === void 0)
              return;
        }
        if (list === null)
          this._subject = list = this._blankNode();
        if (previousList === null) {
          if (parent.predicate === null)
            parent.subject = list;
          else
            parent.object = list;
        } else {
          this._emit(previousList, this.RDF_REST, list, this._graph);
        }
        if (item !== null) {
          if (this._n3Mode && (token.type === "IRI" || token.type === "prefixed")) {
            this._saveContext("item", this._graph, list, this.RDF_FIRST, item);
            this._subject = item, this._predicate = null;
            return this._getPathReader(this._readListItem);
          }
          this._emit(list, this.RDF_FIRST, item, this._graph);
        }
        return next;
      }
      // ### `_readDataTypeOrLang` reads an _optional_ datatype or language
      _readDataTypeOrLang(token) {
        return this._completeObjectLiteral(token, false);
      }
      // ### `_readListItemDataTypeOrLang` reads an _optional_ datatype or language in a list
      _readListItemDataTypeOrLang(token) {
        return this._completeObjectLiteral(token, true);
      }
      // ### `_completeLiteral` completes a literal with an optional datatype or language
      _completeLiteral(token) {
        let literal2 = this._literal(this._literalValue);
        switch (token.type) {
          case "type":
          case "typeIRI":
            const datatype = this._readEntity(token);
            if (datatype === void 0)
              return;
            literal2 = this._literal(this._literalValue, datatype);
            token = null;
            break;
          case "langcode":
            literal2 = this._literal(this._literalValue, token.value);
            token = null;
            break;
        }
        return { token, literal: literal2 };
      }
      // Completes a literal in subject position
      _completeSubjectLiteral(token) {
        this._subject = this._completeLiteral(token).literal;
        return this._readPredicateOrNamedGraph;
      }
      // Completes a literal in object position
      _completeObjectLiteral(token, listItem) {
        const completed = this._completeLiteral(token);
        if (!completed)
          return;
        this._object = completed.literal;
        if (listItem)
          this._emit(this._subject, this.RDF_FIRST, this._object, this._graph);
        if (completed.token === null)
          return this._getContextEndReader();
        else {
          this._readCallback = this._getContextEndReader();
          return this._readCallback(completed.token);
        }
      }
      // ### `_readFormulaTail` reads the end of a formula
      _readFormulaTail(token) {
        if (token.type !== "}")
          return this._readPunctuation(token);
        if (this._subject !== null)
          this._emit(this._subject, this._predicate, this._object, this._graph);
        this._restoreContext("formula", token);
        return this._object === null ? this._readPredicate : this._getContextEndReader();
      }
      // ### `_readPunctuation` reads punctuation between quads or quad parts
      _readPunctuation(token) {
        let next, graph = this._graph;
        const subject = this._subject, inversePredicate = this._inversePredicate;
        switch (token.type) {
          case "}":
            if (this._graph === null)
              return this._error("Unexpected graph closing", token);
            if (this._n3Mode)
              return this._readFormulaTail(token);
            this._graph = null;
          case ".":
            this._subject = null;
            next = this._contextStack.length ? this._readSubject : this._readInTopContext;
            if (inversePredicate)
              this._inversePredicate = false;
            break;
          case ";":
            next = this._readPredicate;
            break;
          case ",":
            next = this._readObject;
            break;
          case "{|":
            if (!this._supportsRDFStar)
              return this._error("Unexpected RDF* syntax", token);
            const predicate = this._predicate, object = this._object;
            this._subject = this._quad(subject, predicate, object, this.DEFAULTGRAPH);
            next = this._readPredicate;
            break;
          case "|}":
            if (this._subject.termType !== "Quad")
              return this._error("Unexpected asserted triple closing", token);
            this._subject = null;
            next = this._readPunctuation;
            break;
          default:
            if (this._supportsQuads && this._graph === null && (graph = this._readEntity(token)) !== void 0) {
              next = this._readQuadPunctuation;
              break;
            }
            return this._error(`Expected punctuation to follow "${this._object.id}"`, token);
        }
        if (subject !== null) {
          const predicate = this._predicate, object = this._object;
          if (!inversePredicate)
            this._emit(subject, predicate, object, graph);
          else
            this._emit(object, predicate, subject, graph);
        }
        return next;
      }
      // ### `_readBlankNodePunctuation` reads punctuation in a blank node
      _readBlankNodePunctuation(token) {
        let next;
        switch (token.type) {
          case ";":
            next = this._readPredicate;
            break;
          case ",":
            next = this._readObject;
            break;
          default:
            return this._error(`Expected punctuation to follow "${this._object.id}"`, token);
        }
        this._emit(this._subject, this._predicate, this._object, this._graph);
        return next;
      }
      // ### `_readQuadPunctuation` reads punctuation after a quad
      _readQuadPunctuation(token) {
        if (token.type !== ".")
          return this._error("Expected dot to follow quad", token);
        return this._readInTopContext;
      }
      // ### `_readPrefix` reads the prefix of a prefix declaration
      _readPrefix(token) {
        if (token.type !== "prefix")
          return this._error("Expected prefix to follow @prefix", token);
        this._prefix = token.value;
        return this._readPrefixIRI;
      }
      // ### `_readPrefixIRI` reads the IRI of a prefix declaration
      _readPrefixIRI(token) {
        if (token.type !== "IRI")
          return this._error(`Expected IRI to follow prefix "${this._prefix}:"`, token);
        const prefixNode = this._readEntity(token);
        this._prefixes[this._prefix] = prefixNode.value;
        this._prefixCallback(this._prefix, prefixNode);
        return this._readDeclarationPunctuation;
      }
      // ### `_readBaseIRI` reads the IRI of a base declaration
      _readBaseIRI(token) {
        const iri = token.type === "IRI" && this._resolveIRI(token.value);
        if (!iri)
          return this._error("Expected valid IRI to follow base declaration", token);
        this._setBase(iri);
        return this._readDeclarationPunctuation;
      }
      // ### `_readNamedGraphLabel` reads the label of a named graph
      _readNamedGraphLabel(token) {
        switch (token.type) {
          case "IRI":
          case "blank":
          case "prefixed":
            return this._readSubject(token), this._readGraph;
          case "[":
            return this._readNamedGraphBlankLabel;
          default:
            return this._error("Invalid graph label", token);
        }
      }
      // ### `_readNamedGraphLabel` reads a blank node label of a named graph
      _readNamedGraphBlankLabel(token) {
        if (token.type !== "]")
          return this._error("Invalid graph label", token);
        this._subject = this._blankNode();
        return this._readGraph;
      }
      // ### `_readDeclarationPunctuation` reads the punctuation of a declaration
      _readDeclarationPunctuation(token) {
        if (this._sparqlStyle) {
          this._sparqlStyle = false;
          return this._readInTopContext(token);
        }
        if (token.type !== ".")
          return this._error("Expected declaration to end with a dot", token);
        return this._readInTopContext;
      }
      // Reads a list of quantified symbols from a @forSome or @forAll statement
      _readQuantifierList(token) {
        let entity;
        switch (token.type) {
          case "IRI":
          case "prefixed":
            if ((entity = this._readEntity(token, true)) !== void 0)
              break;
          default:
            return this._error(`Unexpected ${token.type}`, token);
        }
        if (!this._explicitQuantifiers)
          this._quantified[entity.id] = this._quantifier(this._blankNode().value);
        else {
          if (this._subject === null)
            this._emit(
              this._graph || this.DEFAULTGRAPH,
              this._predicate,
              this._subject = this._blankNode(),
              this.QUANTIFIERS_GRAPH
            );
          else
            this._emit(
              this._subject,
              this.RDF_REST,
              this._subject = this._blankNode(),
              this.QUANTIFIERS_GRAPH
            );
          this._emit(this._subject, this.RDF_FIRST, entity, this.QUANTIFIERS_GRAPH);
        }
        return this._readQuantifierPunctuation;
      }
      // Reads punctuation from a @forSome or @forAll statement
      _readQuantifierPunctuation(token) {
        if (token.type === ",")
          return this._readQuantifierList;
        else {
          if (this._explicitQuantifiers) {
            this._emit(this._subject, this.RDF_REST, this.RDF_NIL, this.QUANTIFIERS_GRAPH);
            this._subject = null;
          }
          this._readCallback = this._getContextEndReader();
          return this._readCallback(token);
        }
      }
      // ### `_getPathReader` reads a potential path and then resumes with the given function
      _getPathReader(afterPath) {
        this._afterPath = afterPath;
        return this._readPath;
      }
      // ### `_readPath` reads a potential path
      _readPath(token) {
        switch (token.type) {
          case "!":
            return this._readForwardPath;
          case "^":
            return this._readBackwardPath;
          default:
            const stack = this._contextStack, parent = stack.length && stack[stack.length - 1];
            if (parent && parent.type === "item") {
              const item = this._subject;
              this._restoreContext("item", token);
              this._emit(this._subject, this.RDF_FIRST, item, this._graph);
            }
            return this._afterPath(token);
        }
      }
      // ### `_readForwardPath` reads a '!' path
      _readForwardPath(token) {
        let subject, predicate;
        const object = this._blankNode();
        if ((predicate = this._readEntity(token)) === void 0)
          return;
        if (this._predicate === null)
          subject = this._subject, this._subject = object;
        else
          subject = this._object, this._object = object;
        this._emit(subject, predicate, object, this._graph);
        return this._readPath;
      }
      // ### `_readBackwardPath` reads a '^' path
      _readBackwardPath(token) {
        const subject = this._blankNode();
        let predicate, object;
        if ((predicate = this._readEntity(token)) === void 0)
          return;
        if (this._predicate === null)
          object = this._subject, this._subject = subject;
        else
          object = this._object, this._object = subject;
        this._emit(subject, predicate, object, this._graph);
        return this._readPath;
      }
      // ### `_readRDFStarTailOrGraph` reads the graph of a nested RDF* quad or the end of a nested RDF* triple
      _readRDFStarTailOrGraph(token) {
        if (token.type !== ">>") {
          if (this._supportsQuads && this._graph === null && (this._graph = this._readEntity(token)) !== void 0)
            return this._readRDFStarTail;
          return this._error(`Expected >> to follow "${this._object.id}"`, token);
        }
        return this._readRDFStarTail(token);
      }
      // ### `_readRDFStarTail` reads the end of a nested RDF* triple
      _readRDFStarTail(token) {
        if (token.type !== ">>")
          return this._error(`Expected >> but got ${token.type}`, token);
        const quad2 = this._quad(
          this._subject,
          this._predicate,
          this._object,
          this._graph || this.DEFAULTGRAPH
        );
        this._restoreContext("<<", token);
        if (this._subject === null) {
          this._subject = quad2;
          return this._readPredicate;
        } else {
          this._object = quad2;
          return this._getContextEndReader();
        }
      }
      // ### `_getContextEndReader` gets the next reader function at the end of a context
      _getContextEndReader() {
        const contextStack = this._contextStack;
        if (!contextStack.length)
          return this._readPunctuation;
        switch (contextStack[contextStack.length - 1].type) {
          case "blank":
            return this._readBlankNodeTail;
          case "list":
            return this._readListItem;
          case "formula":
            return this._readFormulaTail;
          case "<<":
            return this._readRDFStarTailOrGraph;
        }
      }
      // ### `_emit` sends a quad through the callback
      _emit(subject, predicate, object, graph) {
        this._callback(null, this._quad(subject, predicate, object, graph || this.DEFAULTGRAPH));
      }
      // ### `_error` emits an error message through the callback
      _error(message, token) {
        const err = new Error(`${message} on line ${token.line}.`);
        err.context = {
          token,
          line: token.line,
          previousToken: this._lexer.previousToken
        };
        this._callback(err);
        this._callback = noop;
      }
      // ### `_resolveIRI` resolves an IRI against the base path
      _resolveIRI(iri) {
        return /^[a-z][a-z0-9+.-]*:/i.test(iri) ? iri : this._resolveRelativeIRI(iri);
      }
      // ### `_resolveRelativeIRI` resolves an IRI against the base path,
      // assuming that a base path has been set and that the IRI is indeed relative
      _resolveRelativeIRI(iri) {
        if (!iri.length)
          return this._base;
        switch (iri[0]) {
          case "#":
            return this._base + iri;
          case "?":
            return this._base.replace(/(?:\?.*)?$/, iri);
          case "/":
            return (iri[1] === "/" ? this._baseScheme : this._baseRoot) + this._removeDotSegments(iri);
          default:
            return /^[^/:]*:/.test(iri) ? null : this._removeDotSegments(this._basePath + iri);
        }
      }
      // ### `_removeDotSegments` resolves './' and '../' path segments in an IRI as per RFC3986
      _removeDotSegments(iri) {
        if (!/(^|\/)\.\.?($|[/#?])/.test(iri))
          return iri;
        const length = iri.length;
        let result = "", i = -1, pathStart = -1, segmentStart = 0, next = "/";
        while (i < length) {
          switch (next) {
            case ":":
              if (pathStart < 0) {
                if (iri[++i] === "/" && iri[++i] === "/")
                  while ((pathStart = i + 1) < length && iri[pathStart] !== "/")
                    i = pathStart;
              }
              break;
            case "?":
            case "#":
              i = length;
              break;
            case "/":
              if (iri[i + 1] === ".") {
                next = iri[++i + 1];
                switch (next) {
                  case "/":
                    result += iri.substring(segmentStart, i - 1);
                    segmentStart = i + 1;
                    break;
                  case void 0:
                  case "?":
                  case "#":
                    return result + iri.substring(segmentStart, i) + iri.substr(i + 1);
                  case ".":
                    next = iri[++i + 1];
                    if (next === void 0 || next === "/" || next === "?" || next === "#") {
                      result += iri.substring(segmentStart, i - 2);
                      if ((segmentStart = result.lastIndexOf("/")) >= pathStart)
                        result = result.substr(0, segmentStart);
                      if (next !== "/")
                        return `${result}/${iri.substr(i + 1)}`;
                      segmentStart = i + 1;
                    }
                }
              }
          }
          next = iri[++i];
        }
        return result + iri.substring(segmentStart);
      }
      // ## Public methods
      // ### `parse` parses the N3 input and emits each parsed quad through the callback
      parse(input, quadCallback, prefixCallback) {
        this._readCallback = this._readInTopContext;
        this._sparqlStyle = false;
        this._prefixes = /* @__PURE__ */ Object.create(null);
        this._prefixes._ = this._blankNodePrefix ? this._blankNodePrefix.substr(2) : `b${blankNodePrefix++}_`;
        this._prefixCallback = prefixCallback || noop;
        this._inversePredicate = false;
        this._quantified = /* @__PURE__ */ Object.create(null);
        if (!quadCallback) {
          const quads = [];
          let error;
          this._callback = (e, t) => {
            e ? error = e : t && quads.push(t);
          };
          this._lexer.tokenize(input).every((token) => {
            return this._readCallback = this._readCallback(token);
          });
          if (error)
            throw error;
          return quads;
        }
        this._callback = quadCallback;
        this._lexer.tokenize(input, (error, token) => {
          if (error !== null)
            this._callback(error), this._callback = noop;
          else if (this._readCallback)
            this._readCallback = this._readCallback(token);
        });
      }
    };
    initDataFactory(N3Parser.prototype, N3DataFactory_default);
  }
});

// node_modules/n3/src/N3Writer.js
function characterReplacer(character) {
  let result = escapedCharacters[character];
  if (result === void 0) {
    if (character.length === 1) {
      result = character.charCodeAt(0).toString(16);
      result = "\\u0000".substr(0, 6 - result.length) + result;
    } else {
      result = ((character.charCodeAt(0) - 55296) * 1024 + character.charCodeAt(1) + 9216).toString(16);
      result = "\\U00000000".substr(0, 10 - result.length) + result;
    }
  }
  return result;
}
function escapeRegex(regex) {
  return regex.replace(/[\]\/\(\)\*\+\?\.\\\$]/g, "\\$&");
}
var DEFAULTGRAPH2, rdf2, xsd3, escape, escapeAll, escapedCharacters, SerializedTerm, N3Writer;
var init_N3Writer = __esm({
  "node_modules/n3/src/N3Writer.js"() {
    init_IRIs();
    init_N3DataFactory();
    init_N3Util();
    DEFAULTGRAPH2 = N3DataFactory_default.defaultGraph();
    ({ rdf: rdf2, xsd: xsd3 } = IRIs_default);
    escape = /["\\\t\n\r\b\f\u0000-\u0019\ud800-\udbff]/;
    escapeAll = /["\\\t\n\r\b\f\u0000-\u0019]|[\ud800-\udbff][\udc00-\udfff]/g;
    escapedCharacters = {
      "\\": "\\\\",
      '"': '\\"',
      "	": "\\t",
      "\n": "\\n",
      "\r": "\\r",
      "\b": "\\b",
      "\f": "\\f"
    };
    SerializedTerm = class extends Term {
      // Pretty-printed nodes are not equal to any other node
      // (e.g., [] does not equal [])
      equals(other) {
        return other === this;
      }
    };
    N3Writer = class {
      constructor(outputStream, options) {
        this._prefixRegex = /$0^/;
        if (outputStream && typeof outputStream.write !== "function")
          options = outputStream, outputStream = null;
        options = options || {};
        this._lists = options.lists;
        if (!outputStream) {
          let output = "";
          this._outputStream = {
            write(chunk, encoding, done) {
              output += chunk;
              done && done();
            },
            end: (done) => {
              done && done(null, output);
            }
          };
          this._endStream = true;
        } else {
          this._outputStream = outputStream;
          this._endStream = options.end === void 0 ? true : !!options.end;
        }
        this._subject = null;
        if (!/triple|quad/i.test(options.format)) {
          this._lineMode = false;
          this._graph = DEFAULTGRAPH2;
          this._prefixIRIs = /* @__PURE__ */ Object.create(null);
          options.prefixes && this.addPrefixes(options.prefixes);
          if (options.baseIRI) {
            this._baseMatcher = new RegExp(`^${escapeRegex(options.baseIRI)}${options.baseIRI.endsWith("/") ? "" : "[#?]"}`);
            this._baseLength = options.baseIRI.length;
          }
        } else {
          this._lineMode = true;
          this._writeQuad = this._writeQuadLine;
        }
      }
      // ## Private methods
      // ### Whether the current graph is the default graph
      get _inDefaultGraph() {
        return DEFAULTGRAPH2.equals(this._graph);
      }
      // ### `_write` writes the argument to the output stream
      _write(string, callback) {
        this._outputStream.write(string, "utf8", callback);
      }
      // ### `_writeQuad` writes the quad to the output stream
      _writeQuad(subject, predicate, object, graph, done) {
        try {
          if (!graph.equals(this._graph)) {
            this._write((this._subject === null ? "" : this._inDefaultGraph ? ".\n" : "\n}\n") + (DEFAULTGRAPH2.equals(graph) ? "" : `${this._encodeIriOrBlank(graph)} {
`));
            this._graph = graph;
            this._subject = null;
          }
          if (subject.equals(this._subject)) {
            if (predicate.equals(this._predicate))
              this._write(`, ${this._encodeObject(object)}`, done);
            else
              this._write(`;
    ${this._encodePredicate(this._predicate = predicate)} ${this._encodeObject(object)}`, done);
          } else
            this._write(`${(this._subject === null ? "" : ".\n") + this._encodeSubject(this._subject = subject)} ${this._encodePredicate(this._predicate = predicate)} ${this._encodeObject(object)}`, done);
        } catch (error) {
          done && done(error);
        }
      }
      // ### `_writeQuadLine` writes the quad to the output stream as a single line
      _writeQuadLine(subject, predicate, object, graph, done) {
        delete this._prefixMatch;
        this._write(this.quadToString(subject, predicate, object, graph), done);
      }
      // ### `quadToString` serializes a quad as a string
      quadToString(subject, predicate, object, graph) {
        return `${this._encodeSubject(subject)} ${this._encodeIriOrBlank(predicate)} ${this._encodeObject(object)}${graph && graph.value ? ` ${this._encodeIriOrBlank(graph)} .
` : " .\n"}`;
      }
      // ### `quadsToString` serializes an array of quads as a string
      quadsToString(quads) {
        return quads.map((t) => {
          return this.quadToString(t.subject, t.predicate, t.object, t.graph);
        }).join("");
      }
      // ### `_encodeSubject` represents a subject
      _encodeSubject(entity) {
        return entity.termType === "Quad" ? this._encodeQuad(entity) : this._encodeIriOrBlank(entity);
      }
      // ### `_encodeIriOrBlank` represents an IRI or blank node
      _encodeIriOrBlank(entity) {
        if (entity.termType !== "NamedNode") {
          if (this._lists && entity.value in this._lists)
            entity = this.list(this._lists[entity.value]);
          return "id" in entity ? entity.id : `_:${entity.value}`;
        }
        let iri = entity.value;
        if (this._baseMatcher && this._baseMatcher.test(iri))
          iri = iri.substr(this._baseLength);
        if (escape.test(iri))
          iri = iri.replace(escapeAll, characterReplacer);
        const prefixMatch = this._prefixRegex.exec(iri);
        return !prefixMatch ? `<${iri}>` : !prefixMatch[1] ? iri : this._prefixIRIs[prefixMatch[1]] + prefixMatch[2];
      }
      // ### `_encodeLiteral` represents a literal
      _encodeLiteral(literal2) {
        let value = literal2.value;
        if (escape.test(value))
          value = value.replace(escapeAll, characterReplacer);
        if (literal2.language)
          return `"${value}"@${literal2.language}`;
        if (this._lineMode) {
          if (literal2.datatype.value === xsd3.string)
            return `"${value}"`;
        } else {
          switch (literal2.datatype.value) {
            case xsd3.string:
              return `"${value}"`;
            case xsd3.boolean:
              if (value === "true" || value === "false")
                return value;
              break;
            case xsd3.integer:
              if (/^[+-]?\d+$/.test(value))
                return value;
              break;
            case xsd3.decimal:
              if (/^[+-]?\d*\.\d+$/.test(value))
                return value;
              break;
            case xsd3.double:
              if (/^[+-]?(?:\d+\.\d*|\.?\d+)[eE][+-]?\d+$/.test(value))
                return value;
              break;
          }
        }
        return `"${value}"^^${this._encodeIriOrBlank(literal2.datatype)}`;
      }
      // ### `_encodePredicate` represents a predicate
      _encodePredicate(predicate) {
        return predicate.value === rdf2.type ? "a" : this._encodeIriOrBlank(predicate);
      }
      // ### `_encodeObject` represents an object
      _encodeObject(object) {
        switch (object.termType) {
          case "Quad":
            return this._encodeQuad(object);
          case "Literal":
            return this._encodeLiteral(object);
          default:
            return this._encodeIriOrBlank(object);
        }
      }
      // ### `_encodeQuad` encodes an RDF* quad
      _encodeQuad({ subject, predicate, object, graph }) {
        return `<<${this._encodeSubject(subject)} ${this._encodePredicate(predicate)} ${this._encodeObject(object)}${isDefaultGraph(graph) ? "" : ` ${this._encodeIriOrBlank(graph)}`}>>`;
      }
      // ### `_blockedWrite` replaces `_write` after the writer has been closed
      _blockedWrite() {
        throw new Error("Cannot write because the writer has been closed.");
      }
      // ### `addQuad` adds the quad to the output stream
      addQuad(subject, predicate, object, graph, done) {
        if (object === void 0)
          this._writeQuad(subject.subject, subject.predicate, subject.object, subject.graph, predicate);
        else if (typeof graph === "function")
          this._writeQuad(subject, predicate, object, DEFAULTGRAPH2, graph);
        else
          this._writeQuad(subject, predicate, object, graph || DEFAULTGRAPH2, done);
      }
      // ### `addQuads` adds the quads to the output stream
      addQuads(quads) {
        for (let i = 0; i < quads.length; i++)
          this.addQuad(quads[i]);
      }
      // ### `addPrefix` adds the prefix to the output stream
      addPrefix(prefix2, iri, done) {
        const prefixes2 = {};
        prefixes2[prefix2] = iri;
        this.addPrefixes(prefixes2, done);
      }
      // ### `addPrefixes` adds the prefixes to the output stream
      addPrefixes(prefixes2, done) {
        if (!this._prefixIRIs)
          return done && done();
        let hasPrefixes = false;
        for (let prefix2 in prefixes2) {
          let iri = prefixes2[prefix2];
          if (typeof iri !== "string")
            iri = iri.value;
          hasPrefixes = true;
          if (this._subject !== null) {
            this._write(this._inDefaultGraph ? ".\n" : "\n}\n");
            this._subject = null, this._graph = "";
          }
          this._prefixIRIs[iri] = prefix2 += ":";
          this._write(`@prefix ${prefix2} <${iri}>.
`);
        }
        if (hasPrefixes) {
          let IRIlist = "", prefixList = "";
          for (const prefixIRI in this._prefixIRIs) {
            IRIlist += IRIlist ? `|${prefixIRI}` : prefixIRI;
            prefixList += (prefixList ? "|" : "") + this._prefixIRIs[prefixIRI];
          }
          IRIlist = escapeRegex(IRIlist, /[\]\/\(\)\*\+\?\.\\\$]/g, "\\$&");
          this._prefixRegex = new RegExp(`^(?:${prefixList})[^/]*$|^(${IRIlist})([_a-zA-Z][\\-_a-zA-Z0-9]*)$`);
        }
        this._write(hasPrefixes ? "\n" : "", done);
      }
      // ### `blank` creates a blank node with the given content
      blank(predicate, object) {
        let children = predicate, child, length;
        if (predicate === void 0)
          children = [];
        else if (predicate.termType)
          children = [{ predicate, object }];
        else if (!("length" in predicate))
          children = [predicate];
        switch (length = children.length) {
          case 0:
            return new SerializedTerm("[]");
          case 1:
            child = children[0];
            if (!(child.object instanceof SerializedTerm))
              return new SerializedTerm(`[ ${this._encodePredicate(child.predicate)} ${this._encodeObject(child.object)} ]`);
          default:
            let contents = "[";
            for (let i = 0; i < length; i++) {
              child = children[i];
              if (child.predicate.equals(predicate))
                contents += `, ${this._encodeObject(child.object)}`;
              else {
                contents += `${(i ? ";\n  " : "\n  ") + this._encodePredicate(child.predicate)} ${this._encodeObject(child.object)}`;
                predicate = child.predicate;
              }
            }
            return new SerializedTerm(`${contents}
]`);
        }
      }
      // ### `list` creates a list node with the given content
      list(elements) {
        const length = elements && elements.length || 0, contents = new Array(length);
        for (let i = 0; i < length; i++)
          contents[i] = this._encodeObject(elements[i]);
        return new SerializedTerm(`(${contents.join(" ")})`);
      }
      // ### `end` signals the end of the output stream
      end(done) {
        if (this._subject !== null) {
          this._write(this._inDefaultGraph ? ".\n" : "\n}\n");
          this._subject = null;
        }
        this._write = this._blockedWrite;
        let singleDone = done && ((error, result) => {
          singleDone = null, done(error, result);
        });
        if (this._endStream) {
          try {
            return this._outputStream.end(singleDone);
          } catch (error) {
          }
        }
        singleDone && singleDone();
      }
    };
  }
});

// node_modules/readable-stream/lib/ours/primordials.js
var require_primordials = __commonJS({
  "node_modules/readable-stream/lib/ours/primordials.js"(exports, module2) {
    "use strict";
    module2.exports = {
      ArrayIsArray(self) {
        return Array.isArray(self);
      },
      ArrayPrototypeIncludes(self, el) {
        return self.includes(el);
      },
      ArrayPrototypeIndexOf(self, el) {
        return self.indexOf(el);
      },
      ArrayPrototypeJoin(self, sep) {
        return self.join(sep);
      },
      ArrayPrototypeMap(self, fn) {
        return self.map(fn);
      },
      ArrayPrototypePop(self, el) {
        return self.pop(el);
      },
      ArrayPrototypePush(self, el) {
        return self.push(el);
      },
      ArrayPrototypeSlice(self, start, end) {
        return self.slice(start, end);
      },
      Error,
      FunctionPrototypeCall(fn, thisArgs, ...args) {
        return fn.call(thisArgs, ...args);
      },
      FunctionPrototypeSymbolHasInstance(self, instance) {
        return Function.prototype[Symbol.hasInstance].call(self, instance);
      },
      MathFloor: Math.floor,
      Number,
      NumberIsInteger: Number.isInteger,
      NumberIsNaN: Number.isNaN,
      NumberMAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
      NumberMIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
      NumberParseInt: Number.parseInt,
      ObjectDefineProperties(self, props) {
        return Object.defineProperties(self, props);
      },
      ObjectDefineProperty(self, name, prop) {
        return Object.defineProperty(self, name, prop);
      },
      ObjectGetOwnPropertyDescriptor(self, name) {
        return Object.getOwnPropertyDescriptor(self, name);
      },
      ObjectKeys(obj) {
        return Object.keys(obj);
      },
      ObjectSetPrototypeOf(target, proto) {
        return Object.setPrototypeOf(target, proto);
      },
      Promise,
      PromisePrototypeCatch(self, fn) {
        return self.catch(fn);
      },
      PromisePrototypeThen(self, thenFn, catchFn) {
        return self.then(thenFn, catchFn);
      },
      PromiseReject(err) {
        return Promise.reject(err);
      },
      ReflectApply: Reflect.apply,
      RegExpPrototypeTest(self, value) {
        return self.test(value);
      },
      SafeSet: Set,
      String,
      StringPrototypeSlice(self, start, end) {
        return self.slice(start, end);
      },
      StringPrototypeToLowerCase(self) {
        return self.toLowerCase();
      },
      StringPrototypeToUpperCase(self) {
        return self.toUpperCase();
      },
      StringPrototypeTrim(self) {
        return self.trim();
      },
      Symbol,
      SymbolFor: Symbol.for,
      SymbolAsyncIterator: Symbol.asyncIterator,
      SymbolHasInstance: Symbol.hasInstance,
      SymbolIterator: Symbol.iterator,
      TypedArrayPrototypeSet(self, buf, len) {
        return self.set(buf, len);
      },
      Uint8Array
    };
  }
});

// node_modules/readable-stream/lib/ours/util.js
var require_util = __commonJS({
  "node_modules/readable-stream/lib/ours/util.js"(exports, module2) {
    "use strict";
    var bufferModule = require("buffer");
    var AsyncFunction = Object.getPrototypeOf(async function() {
    }).constructor;
    var Blob = globalThis.Blob || bufferModule.Blob;
    var isBlob = typeof Blob !== "undefined" ? function isBlob2(b) {
      return b instanceof Blob;
    } : function isBlob2(b) {
      return false;
    };
    var AggregateError = class extends Error {
      constructor(errors) {
        if (!Array.isArray(errors)) {
          throw new TypeError(`Expected input to be an Array, got ${typeof errors}`);
        }
        let message = "";
        for (let i = 0; i < errors.length; i++) {
          message += `    ${errors[i].stack}
`;
        }
        super(message);
        this.name = "AggregateError";
        this.errors = errors;
      }
    };
    module2.exports = {
      AggregateError,
      kEmptyObject: Object.freeze({}),
      once(callback) {
        let called = false;
        return function(...args) {
          if (called) {
            return;
          }
          called = true;
          callback.apply(this, args);
        };
      },
      createDeferredPromise: function() {
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return {
          promise,
          resolve,
          reject
        };
      },
      promisify(fn) {
        return new Promise((resolve, reject) => {
          fn((err, ...args) => {
            if (err) {
              return reject(err);
            }
            return resolve(...args);
          });
        });
      },
      debuglog() {
        return function() {
        };
      },
      format(format, ...args) {
        return format.replace(/%([sdifj])/g, function(...[_unused, type]) {
          const replacement = args.shift();
          if (type === "f") {
            return replacement.toFixed(6);
          } else if (type === "j") {
            return JSON.stringify(replacement);
          } else if (type === "s" && typeof replacement === "object") {
            const ctor = replacement.constructor !== Object ? replacement.constructor.name : "";
            return `${ctor} {}`.trim();
          } else {
            return replacement.toString();
          }
        });
      },
      inspect(value) {
        switch (typeof value) {
          case "string":
            if (value.includes("'")) {
              if (!value.includes('"')) {
                return `"${value}"`;
              } else if (!value.includes("`") && !value.includes("${")) {
                return `\`${value}\``;
              }
            }
            return `'${value}'`;
          case "number":
            if (isNaN(value)) {
              return "NaN";
            } else if (Object.is(value, -0)) {
              return String(value);
            }
            return value;
          case "bigint":
            return `${String(value)}n`;
          case "boolean":
          case "undefined":
            return String(value);
          case "object":
            return "{}";
        }
      },
      types: {
        isAsyncFunction(fn) {
          return fn instanceof AsyncFunction;
        },
        isArrayBufferView(arr) {
          return ArrayBuffer.isView(arr);
        }
      },
      isBlob
    };
    module2.exports.promisify.custom = Symbol.for("nodejs.util.promisify.custom");
  }
});

// node_modules/event-target-shim/dist/event-target-shim.js
var require_event_target_shim = __commonJS({
  "node_modules/event-target-shim/dist/event-target-shim.js"(exports, module2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var privateData = /* @__PURE__ */ new WeakMap();
    var wrappers = /* @__PURE__ */ new WeakMap();
    function pd(event) {
      const retv = privateData.get(event);
      console.assert(
        retv != null,
        "'this' is expected an Event object, but got",
        event
      );
      return retv;
    }
    function setCancelFlag(data) {
      if (data.passiveListener != null) {
        if (typeof console !== "undefined" && typeof console.error === "function") {
          console.error(
            "Unable to preventDefault inside passive event listener invocation.",
            data.passiveListener
          );
        }
        return;
      }
      if (!data.event.cancelable) {
        return;
      }
      data.canceled = true;
      if (typeof data.event.preventDefault === "function") {
        data.event.preventDefault();
      }
    }
    function Event(eventTarget, event) {
      privateData.set(this, {
        eventTarget,
        event,
        eventPhase: 2,
        currentTarget: eventTarget,
        canceled: false,
        stopped: false,
        immediateStopped: false,
        passiveListener: null,
        timeStamp: event.timeStamp || Date.now()
      });
      Object.defineProperty(this, "isTrusted", { value: false, enumerable: true });
      const keys = Object.keys(event);
      for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        if (!(key in this)) {
          Object.defineProperty(this, key, defineRedirectDescriptor(key));
        }
      }
    }
    Event.prototype = {
      /**
       * The type of this event.
       * @type {string}
       */
      get type() {
        return pd(this).event.type;
      },
      /**
       * The target of this event.
       * @type {EventTarget}
       */
      get target() {
        return pd(this).eventTarget;
      },
      /**
       * The target of this event.
       * @type {EventTarget}
       */
      get currentTarget() {
        return pd(this).currentTarget;
      },
      /**
       * @returns {EventTarget[]} The composed path of this event.
       */
      composedPath() {
        const currentTarget = pd(this).currentTarget;
        if (currentTarget == null) {
          return [];
        }
        return [currentTarget];
      },
      /**
       * Constant of NONE.
       * @type {number}
       */
      get NONE() {
        return 0;
      },
      /**
       * Constant of CAPTURING_PHASE.
       * @type {number}
       */
      get CAPTURING_PHASE() {
        return 1;
      },
      /**
       * Constant of AT_TARGET.
       * @type {number}
       */
      get AT_TARGET() {
        return 2;
      },
      /**
       * Constant of BUBBLING_PHASE.
       * @type {number}
       */
      get BUBBLING_PHASE() {
        return 3;
      },
      /**
       * The target of this event.
       * @type {number}
       */
      get eventPhase() {
        return pd(this).eventPhase;
      },
      /**
       * Stop event bubbling.
       * @returns {void}
       */
      stopPropagation() {
        const data = pd(this);
        data.stopped = true;
        if (typeof data.event.stopPropagation === "function") {
          data.event.stopPropagation();
        }
      },
      /**
       * Stop event bubbling.
       * @returns {void}
       */
      stopImmediatePropagation() {
        const data = pd(this);
        data.stopped = true;
        data.immediateStopped = true;
        if (typeof data.event.stopImmediatePropagation === "function") {
          data.event.stopImmediatePropagation();
        }
      },
      /**
       * The flag to be bubbling.
       * @type {boolean}
       */
      get bubbles() {
        return Boolean(pd(this).event.bubbles);
      },
      /**
       * The flag to be cancelable.
       * @type {boolean}
       */
      get cancelable() {
        return Boolean(pd(this).event.cancelable);
      },
      /**
       * Cancel this event.
       * @returns {void}
       */
      preventDefault() {
        setCancelFlag(pd(this));
      },
      /**
       * The flag to indicate cancellation state.
       * @type {boolean}
       */
      get defaultPrevented() {
        return pd(this).canceled;
      },
      /**
       * The flag to be composed.
       * @type {boolean}
       */
      get composed() {
        return Boolean(pd(this).event.composed);
      },
      /**
       * The unix time of this event.
       * @type {number}
       */
      get timeStamp() {
        return pd(this).timeStamp;
      },
      /**
       * The target of this event.
       * @type {EventTarget}
       * @deprecated
       */
      get srcElement() {
        return pd(this).eventTarget;
      },
      /**
       * The flag to stop event bubbling.
       * @type {boolean}
       * @deprecated
       */
      get cancelBubble() {
        return pd(this).stopped;
      },
      set cancelBubble(value) {
        if (!value) {
          return;
        }
        const data = pd(this);
        data.stopped = true;
        if (typeof data.event.cancelBubble === "boolean") {
          data.event.cancelBubble = true;
        }
      },
      /**
       * The flag to indicate cancellation state.
       * @type {boolean}
       * @deprecated
       */
      get returnValue() {
        return !pd(this).canceled;
      },
      set returnValue(value) {
        if (!value) {
          setCancelFlag(pd(this));
        }
      },
      /**
       * Initialize this event object. But do nothing under event dispatching.
       * @param {string} type The event type.
       * @param {boolean} [bubbles=false] The flag to be possible to bubble up.
       * @param {boolean} [cancelable=false] The flag to be possible to cancel.
       * @deprecated
       */
      initEvent() {
      }
    };
    Object.defineProperty(Event.prototype, "constructor", {
      value: Event,
      configurable: true,
      writable: true
    });
    if (typeof window !== "undefined" && typeof window.Event !== "undefined") {
      Object.setPrototypeOf(Event.prototype, window.Event.prototype);
      wrappers.set(window.Event.prototype, Event);
    }
    function defineRedirectDescriptor(key) {
      return {
        get() {
          return pd(this).event[key];
        },
        set(value) {
          pd(this).event[key] = value;
        },
        configurable: true,
        enumerable: true
      };
    }
    function defineCallDescriptor(key) {
      return {
        value() {
          const event = pd(this).event;
          return event[key].apply(event, arguments);
        },
        configurable: true,
        enumerable: true
      };
    }
    function defineWrapper(BaseEvent, proto) {
      const keys = Object.keys(proto);
      if (keys.length === 0) {
        return BaseEvent;
      }
      function CustomEvent(eventTarget, event) {
        BaseEvent.call(this, eventTarget, event);
      }
      CustomEvent.prototype = Object.create(BaseEvent.prototype, {
        constructor: { value: CustomEvent, configurable: true, writable: true }
      });
      for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        if (!(key in BaseEvent.prototype)) {
          const descriptor = Object.getOwnPropertyDescriptor(proto, key);
          const isFunc = typeof descriptor.value === "function";
          Object.defineProperty(
            CustomEvent.prototype,
            key,
            isFunc ? defineCallDescriptor(key) : defineRedirectDescriptor(key)
          );
        }
      }
      return CustomEvent;
    }
    function getWrapper(proto) {
      if (proto == null || proto === Object.prototype) {
        return Event;
      }
      let wrapper = wrappers.get(proto);
      if (wrapper == null) {
        wrapper = defineWrapper(getWrapper(Object.getPrototypeOf(proto)), proto);
        wrappers.set(proto, wrapper);
      }
      return wrapper;
    }
    function wrapEvent(eventTarget, event) {
      const Wrapper = getWrapper(Object.getPrototypeOf(event));
      return new Wrapper(eventTarget, event);
    }
    function isStopped(event) {
      return pd(event).immediateStopped;
    }
    function setEventPhase(event, eventPhase) {
      pd(event).eventPhase = eventPhase;
    }
    function setCurrentTarget(event, currentTarget) {
      pd(event).currentTarget = currentTarget;
    }
    function setPassiveListener(event, passiveListener) {
      pd(event).passiveListener = passiveListener;
    }
    var listenersMap = /* @__PURE__ */ new WeakMap();
    var CAPTURE = 1;
    var BUBBLE = 2;
    var ATTRIBUTE = 3;
    function isObject(x) {
      return x !== null && typeof x === "object";
    }
    function getListeners(eventTarget) {
      const listeners = listenersMap.get(eventTarget);
      if (listeners == null) {
        throw new TypeError(
          "'this' is expected an EventTarget object, but got another value."
        );
      }
      return listeners;
    }
    function defineEventAttributeDescriptor(eventName) {
      return {
        get() {
          const listeners = getListeners(this);
          let node = listeners.get(eventName);
          while (node != null) {
            if (node.listenerType === ATTRIBUTE) {
              return node.listener;
            }
            node = node.next;
          }
          return null;
        },
        set(listener) {
          if (typeof listener !== "function" && !isObject(listener)) {
            listener = null;
          }
          const listeners = getListeners(this);
          let prev = null;
          let node = listeners.get(eventName);
          while (node != null) {
            if (node.listenerType === ATTRIBUTE) {
              if (prev !== null) {
                prev.next = node.next;
              } else if (node.next !== null) {
                listeners.set(eventName, node.next);
              } else {
                listeners.delete(eventName);
              }
            } else {
              prev = node;
            }
            node = node.next;
          }
          if (listener !== null) {
            const newNode = {
              listener,
              listenerType: ATTRIBUTE,
              passive: false,
              once: false,
              next: null
            };
            if (prev === null) {
              listeners.set(eventName, newNode);
            } else {
              prev.next = newNode;
            }
          }
        },
        configurable: true,
        enumerable: true
      };
    }
    function defineEventAttribute(eventTargetPrototype, eventName) {
      Object.defineProperty(
        eventTargetPrototype,
        `on${eventName}`,
        defineEventAttributeDescriptor(eventName)
      );
    }
    function defineCustomEventTarget(eventNames) {
      function CustomEventTarget() {
        EventTarget.call(this);
      }
      CustomEventTarget.prototype = Object.create(EventTarget.prototype, {
        constructor: {
          value: CustomEventTarget,
          configurable: true,
          writable: true
        }
      });
      for (let i = 0; i < eventNames.length; ++i) {
        defineEventAttribute(CustomEventTarget.prototype, eventNames[i]);
      }
      return CustomEventTarget;
    }
    function EventTarget() {
      if (this instanceof EventTarget) {
        listenersMap.set(this, /* @__PURE__ */ new Map());
        return;
      }
      if (arguments.length === 1 && Array.isArray(arguments[0])) {
        return defineCustomEventTarget(arguments[0]);
      }
      if (arguments.length > 0) {
        const types = new Array(arguments.length);
        for (let i = 0; i < arguments.length; ++i) {
          types[i] = arguments[i];
        }
        return defineCustomEventTarget(types);
      }
      throw new TypeError("Cannot call a class as a function");
    }
    EventTarget.prototype = {
      /**
       * Add a given listener to this event target.
       * @param {string} eventName The event name to add.
       * @param {Function} listener The listener to add.
       * @param {boolean|{capture?:boolean,passive?:boolean,once?:boolean}} [options] The options for this listener.
       * @returns {void}
       */
      addEventListener(eventName, listener, options) {
        if (listener == null) {
          return;
        }
        if (typeof listener !== "function" && !isObject(listener)) {
          throw new TypeError("'listener' should be a function or an object.");
        }
        const listeners = getListeners(this);
        const optionsIsObj = isObject(options);
        const capture = optionsIsObj ? Boolean(options.capture) : Boolean(options);
        const listenerType = capture ? CAPTURE : BUBBLE;
        const newNode = {
          listener,
          listenerType,
          passive: optionsIsObj && Boolean(options.passive),
          once: optionsIsObj && Boolean(options.once),
          next: null
        };
        let node = listeners.get(eventName);
        if (node === void 0) {
          listeners.set(eventName, newNode);
          return;
        }
        let prev = null;
        while (node != null) {
          if (node.listener === listener && node.listenerType === listenerType) {
            return;
          }
          prev = node;
          node = node.next;
        }
        prev.next = newNode;
      },
      /**
       * Remove a given listener from this event target.
       * @param {string} eventName The event name to remove.
       * @param {Function} listener The listener to remove.
       * @param {boolean|{capture?:boolean,passive?:boolean,once?:boolean}} [options] The options for this listener.
       * @returns {void}
       */
      removeEventListener(eventName, listener, options) {
        if (listener == null) {
          return;
        }
        const listeners = getListeners(this);
        const capture = isObject(options) ? Boolean(options.capture) : Boolean(options);
        const listenerType = capture ? CAPTURE : BUBBLE;
        let prev = null;
        let node = listeners.get(eventName);
        while (node != null) {
          if (node.listener === listener && node.listenerType === listenerType) {
            if (prev !== null) {
              prev.next = node.next;
            } else if (node.next !== null) {
              listeners.set(eventName, node.next);
            } else {
              listeners.delete(eventName);
            }
            return;
          }
          prev = node;
          node = node.next;
        }
      },
      /**
       * Dispatch a given event.
       * @param {Event|{type:string}} event The event to dispatch.
       * @returns {boolean} `false` if canceled.
       */
      dispatchEvent(event) {
        if (event == null || typeof event.type !== "string") {
          throw new TypeError('"event.type" should be a string.');
        }
        const listeners = getListeners(this);
        const eventName = event.type;
        let node = listeners.get(eventName);
        if (node == null) {
          return true;
        }
        const wrappedEvent = wrapEvent(this, event);
        let prev = null;
        while (node != null) {
          if (node.once) {
            if (prev !== null) {
              prev.next = node.next;
            } else if (node.next !== null) {
              listeners.set(eventName, node.next);
            } else {
              listeners.delete(eventName);
            }
          } else {
            prev = node;
          }
          setPassiveListener(
            wrappedEvent,
            node.passive ? node.listener : null
          );
          if (typeof node.listener === "function") {
            try {
              node.listener.call(this, wrappedEvent);
            } catch (err) {
              if (typeof console !== "undefined" && typeof console.error === "function") {
                console.error(err);
              }
            }
          } else if (node.listenerType !== ATTRIBUTE && typeof node.listener.handleEvent === "function") {
            node.listener.handleEvent(wrappedEvent);
          }
          if (isStopped(wrappedEvent)) {
            break;
          }
          node = node.next;
        }
        setPassiveListener(wrappedEvent, null);
        setEventPhase(wrappedEvent, 0);
        setCurrentTarget(wrappedEvent, null);
        return !wrappedEvent.defaultPrevented;
      }
    };
    Object.defineProperty(EventTarget.prototype, "constructor", {
      value: EventTarget,
      configurable: true,
      writable: true
    });
    if (typeof window !== "undefined" && typeof window.EventTarget !== "undefined") {
      Object.setPrototypeOf(EventTarget.prototype, window.EventTarget.prototype);
    }
    exports.defineEventAttribute = defineEventAttribute;
    exports.EventTarget = EventTarget;
    exports.default = EventTarget;
    module2.exports = EventTarget;
    module2.exports.EventTarget = module2.exports["default"] = EventTarget;
    module2.exports.defineEventAttribute = defineEventAttribute;
  }
});

// node_modules/abort-controller/dist/abort-controller.js
var require_abort_controller = __commonJS({
  "node_modules/abort-controller/dist/abort-controller.js"(exports, module2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var eventTargetShim = require_event_target_shim();
    var AbortSignal = class extends eventTargetShim.EventTarget {
      /**
       * AbortSignal cannot be constructed directly.
       */
      constructor() {
        super();
        throw new TypeError("AbortSignal cannot be constructed directly");
      }
      /**
       * Returns `true` if this `AbortSignal`'s `AbortController` has signaled to abort, and `false` otherwise.
       */
      get aborted() {
        const aborted = abortedFlags.get(this);
        if (typeof aborted !== "boolean") {
          throw new TypeError(`Expected 'this' to be an 'AbortSignal' object, but got ${this === null ? "null" : typeof this}`);
        }
        return aborted;
      }
    };
    eventTargetShim.defineEventAttribute(AbortSignal.prototype, "abort");
    function createAbortSignal() {
      const signal = Object.create(AbortSignal.prototype);
      eventTargetShim.EventTarget.call(signal);
      abortedFlags.set(signal, false);
      return signal;
    }
    function abortSignal(signal) {
      if (abortedFlags.get(signal) !== false) {
        return;
      }
      abortedFlags.set(signal, true);
      signal.dispatchEvent({ type: "abort" });
    }
    var abortedFlags = /* @__PURE__ */ new WeakMap();
    Object.defineProperties(AbortSignal.prototype, {
      aborted: { enumerable: true }
    });
    if (typeof Symbol === "function" && typeof Symbol.toStringTag === "symbol") {
      Object.defineProperty(AbortSignal.prototype, Symbol.toStringTag, {
        configurable: true,
        value: "AbortSignal"
      });
    }
    var AbortController = class {
      /**
       * Initialize this controller.
       */
      constructor() {
        signals.set(this, createAbortSignal());
      }
      /**
       * Returns the `AbortSignal` object associated with this object.
       */
      get signal() {
        return getSignal(this);
      }
      /**
       * Abort and signal to any observers that the associated activity is to be aborted.
       */
      abort() {
        abortSignal(getSignal(this));
      }
    };
    var signals = /* @__PURE__ */ new WeakMap();
    function getSignal(controller) {
      const signal = signals.get(controller);
      if (signal == null) {
        throw new TypeError(`Expected 'this' to be an 'AbortController' object, but got ${controller === null ? "null" : typeof controller}`);
      }
      return signal;
    }
    Object.defineProperties(AbortController.prototype, {
      signal: { enumerable: true },
      abort: { enumerable: true }
    });
    if (typeof Symbol === "function" && typeof Symbol.toStringTag === "symbol") {
      Object.defineProperty(AbortController.prototype, Symbol.toStringTag, {
        configurable: true,
        value: "AbortController"
      });
    }
    exports.AbortController = AbortController;
    exports.AbortSignal = AbortSignal;
    exports.default = AbortController;
    module2.exports = AbortController;
    module2.exports.AbortController = module2.exports["default"] = AbortController;
    module2.exports.AbortSignal = AbortSignal;
  }
});

// node_modules/readable-stream/lib/ours/errors.js
var require_errors = __commonJS({
  "node_modules/readable-stream/lib/ours/errors.js"(exports, module2) {
    "use strict";
    var { format, inspect, AggregateError: CustomAggregateError } = require_util();
    var AggregateError = globalThis.AggregateError || CustomAggregateError;
    var kIsNodeError = Symbol("kIsNodeError");
    var kTypes = [
      "string",
      "function",
      "number",
      "object",
      // Accept 'Function' and 'Object' as alternative to the lower cased version.
      "Function",
      "Object",
      "boolean",
      "bigint",
      "symbol"
    ];
    var classRegExp = /^([A-Z][a-z0-9]*)+$/;
    var nodeInternalPrefix = "__node_internal_";
    var codes = {};
    function assert(value, message) {
      if (!value) {
        throw new codes.ERR_INTERNAL_ASSERTION(message);
      }
    }
    function addNumericalSeparator(val) {
      let res = "";
      let i = val.length;
      const start = val[0] === "-" ? 1 : 0;
      for (; i >= start + 4; i -= 3) {
        res = `_${val.slice(i - 3, i)}${res}`;
      }
      return `${val.slice(0, i)}${res}`;
    }
    function getMessage(key, msg, args) {
      if (typeof msg === "function") {
        assert(
          msg.length <= args.length,
          // Default options do not count.
          `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${msg.length}).`
        );
        return msg(...args);
      }
      const expectedLength = (msg.match(/%[dfijoOs]/g) || []).length;
      assert(
        expectedLength === args.length,
        `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${expectedLength}).`
      );
      if (args.length === 0) {
        return msg;
      }
      return format(msg, ...args);
    }
    function E(code, message, Base) {
      if (!Base) {
        Base = Error;
      }
      class NodeError extends Base {
        constructor(...args) {
          super(getMessage(code, message, args));
        }
        toString() {
          return `${this.name} [${code}]: ${this.message}`;
        }
      }
      Object.defineProperties(NodeError.prototype, {
        name: {
          value: Base.name,
          writable: true,
          enumerable: false,
          configurable: true
        },
        toString: {
          value() {
            return `${this.name} [${code}]: ${this.message}`;
          },
          writable: true,
          enumerable: false,
          configurable: true
        }
      });
      NodeError.prototype.code = code;
      NodeError.prototype[kIsNodeError] = true;
      codes[code] = NodeError;
    }
    function hideStackFrames(fn) {
      const hidden = nodeInternalPrefix + fn.name;
      Object.defineProperty(fn, "name", {
        value: hidden
      });
      return fn;
    }
    function aggregateTwoErrors(innerError, outerError) {
      if (innerError && outerError && innerError !== outerError) {
        if (Array.isArray(outerError.errors)) {
          outerError.errors.push(innerError);
          return outerError;
        }
        const err = new AggregateError([outerError, innerError], outerError.message);
        err.code = outerError.code;
        return err;
      }
      return innerError || outerError;
    }
    var AbortError = class extends Error {
      constructor(message = "The operation was aborted", options = void 0) {
        if (options !== void 0 && typeof options !== "object") {
          throw new codes.ERR_INVALID_ARG_TYPE("options", "Object", options);
        }
        super(message, options);
        this.code = "ABORT_ERR";
        this.name = "AbortError";
      }
    };
    E("ERR_ASSERTION", "%s", Error);
    E(
      "ERR_INVALID_ARG_TYPE",
      (name, expected, actual) => {
        assert(typeof name === "string", "'name' must be a string");
        if (!Array.isArray(expected)) {
          expected = [expected];
        }
        let msg = "The ";
        if (name.endsWith(" argument")) {
          msg += `${name} `;
        } else {
          msg += `"${name}" ${name.includes(".") ? "property" : "argument"} `;
        }
        msg += "must be ";
        const types = [];
        const instances = [];
        const other = [];
        for (const value of expected) {
          assert(typeof value === "string", "All expected entries have to be of type string");
          if (kTypes.includes(value)) {
            types.push(value.toLowerCase());
          } else if (classRegExp.test(value)) {
            instances.push(value);
          } else {
            assert(value !== "object", 'The value "object" should be written as "Object"');
            other.push(value);
          }
        }
        if (instances.length > 0) {
          const pos = types.indexOf("object");
          if (pos !== -1) {
            types.splice(types, pos, 1);
            instances.push("Object");
          }
        }
        if (types.length > 0) {
          switch (types.length) {
            case 1:
              msg += `of type ${types[0]}`;
              break;
            case 2:
              msg += `one of type ${types[0]} or ${types[1]}`;
              break;
            default: {
              const last = types.pop();
              msg += `one of type ${types.join(", ")}, or ${last}`;
            }
          }
          if (instances.length > 0 || other.length > 0) {
            msg += " or ";
          }
        }
        if (instances.length > 0) {
          switch (instances.length) {
            case 1:
              msg += `an instance of ${instances[0]}`;
              break;
            case 2:
              msg += `an instance of ${instances[0]} or ${instances[1]}`;
              break;
            default: {
              const last = instances.pop();
              msg += `an instance of ${instances.join(", ")}, or ${last}`;
            }
          }
          if (other.length > 0) {
            msg += " or ";
          }
        }
        switch (other.length) {
          case 0:
            break;
          case 1:
            if (other[0].toLowerCase() !== other[0]) {
              msg += "an ";
            }
            msg += `${other[0]}`;
            break;
          case 2:
            msg += `one of ${other[0]} or ${other[1]}`;
            break;
          default: {
            const last = other.pop();
            msg += `one of ${other.join(", ")}, or ${last}`;
          }
        }
        if (actual == null) {
          msg += `. Received ${actual}`;
        } else if (typeof actual === "function" && actual.name) {
          msg += `. Received function ${actual.name}`;
        } else if (typeof actual === "object") {
          var _actual$constructor;
          if ((_actual$constructor = actual.constructor) !== null && _actual$constructor !== void 0 && _actual$constructor.name) {
            msg += `. Received an instance of ${actual.constructor.name}`;
          } else {
            const inspected = inspect(actual, {
              depth: -1
            });
            msg += `. Received ${inspected}`;
          }
        } else {
          let inspected = inspect(actual, {
            colors: false
          });
          if (inspected.length > 25) {
            inspected = `${inspected.slice(0, 25)}...`;
          }
          msg += `. Received type ${typeof actual} (${inspected})`;
        }
        return msg;
      },
      TypeError
    );
    E(
      "ERR_INVALID_ARG_VALUE",
      (name, value, reason = "is invalid") => {
        let inspected = inspect(value);
        if (inspected.length > 128) {
          inspected = inspected.slice(0, 128) + "...";
        }
        const type = name.includes(".") ? "property" : "argument";
        return `The ${type} '${name}' ${reason}. Received ${inspected}`;
      },
      TypeError
    );
    E(
      "ERR_INVALID_RETURN_VALUE",
      (input, name, value) => {
        var _value$constructor;
        const type = value !== null && value !== void 0 && (_value$constructor = value.constructor) !== null && _value$constructor !== void 0 && _value$constructor.name ? `instance of ${value.constructor.name}` : `type ${typeof value}`;
        return `Expected ${input} to be returned from the "${name}" function but got ${type}.`;
      },
      TypeError
    );
    E(
      "ERR_MISSING_ARGS",
      (...args) => {
        assert(args.length > 0, "At least one arg needs to be specified");
        let msg;
        const len = args.length;
        args = (Array.isArray(args) ? args : [args]).map((a) => `"${a}"`).join(" or ");
        switch (len) {
          case 1:
            msg += `The ${args[0]} argument`;
            break;
          case 2:
            msg += `The ${args[0]} and ${args[1]} arguments`;
            break;
          default:
            {
              const last = args.pop();
              msg += `The ${args.join(", ")}, and ${last} arguments`;
            }
            break;
        }
        return `${msg} must be specified`;
      },
      TypeError
    );
    E(
      "ERR_OUT_OF_RANGE",
      (str, range, input) => {
        assert(range, 'Missing "range" argument');
        let received;
        if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
          received = addNumericalSeparator(String(input));
        } else if (typeof input === "bigint") {
          received = String(input);
          if (input > 2n ** 32n || input < -(2n ** 32n)) {
            received = addNumericalSeparator(received);
          }
          received += "n";
        } else {
          received = inspect(input);
        }
        return `The value of "${str}" is out of range. It must be ${range}. Received ${received}`;
      },
      RangeError
    );
    E("ERR_MULTIPLE_CALLBACK", "Callback called multiple times", Error);
    E("ERR_METHOD_NOT_IMPLEMENTED", "The %s method is not implemented", Error);
    E("ERR_STREAM_ALREADY_FINISHED", "Cannot call %s after a stream was finished", Error);
    E("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable", Error);
    E("ERR_STREAM_DESTROYED", "Cannot call %s after a stream was destroyed", Error);
    E("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError);
    E("ERR_STREAM_PREMATURE_CLOSE", "Premature close", Error);
    E("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF", Error);
    E("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event", Error);
    E("ERR_STREAM_WRITE_AFTER_END", "write after end", Error);
    E("ERR_UNKNOWN_ENCODING", "Unknown encoding: %s", TypeError);
    module2.exports = {
      AbortError,
      aggregateTwoErrors: hideStackFrames(aggregateTwoErrors),
      hideStackFrames,
      codes
    };
  }
});

// node_modules/readable-stream/lib/internal/validators.js
var require_validators = __commonJS({
  "node_modules/readable-stream/lib/internal/validators.js"(exports, module2) {
    "use strict";
    var {
      ArrayIsArray,
      ArrayPrototypeIncludes,
      ArrayPrototypeJoin,
      ArrayPrototypeMap,
      NumberIsInteger,
      NumberIsNaN,
      NumberMAX_SAFE_INTEGER,
      NumberMIN_SAFE_INTEGER,
      NumberParseInt,
      ObjectPrototypeHasOwnProperty,
      RegExpPrototypeExec,
      String: String2,
      StringPrototypeToUpperCase,
      StringPrototypeTrim
    } = require_primordials();
    var {
      hideStackFrames,
      codes: { ERR_SOCKET_BAD_PORT, ERR_INVALID_ARG_TYPE, ERR_INVALID_ARG_VALUE, ERR_OUT_OF_RANGE, ERR_UNKNOWN_SIGNAL }
    } = require_errors();
    var { normalizeEncoding } = require_util();
    var { isAsyncFunction, isArrayBufferView } = require_util().types;
    var signals = {};
    function isInt32(value) {
      return value === (value | 0);
    }
    function isUint32(value) {
      return value === value >>> 0;
    }
    var octalReg = /^[0-7]+$/;
    var modeDesc = "must be a 32-bit unsigned integer or an octal string";
    function parseFileMode(value, name, def) {
      if (typeof value === "undefined") {
        value = def;
      }
      if (typeof value === "string") {
        if (RegExpPrototypeExec(octalReg, value) === null) {
          throw new ERR_INVALID_ARG_VALUE(name, value, modeDesc);
        }
        value = NumberParseInt(value, 8);
      }
      validateUint32(value, name);
      return value;
    }
    var validateInteger = hideStackFrames((value, name, min = NumberMIN_SAFE_INTEGER, max = NumberMAX_SAFE_INTEGER) => {
      if (typeof value !== "number")
        throw new ERR_INVALID_ARG_TYPE(name, "number", value);
      if (!NumberIsInteger(value))
        throw new ERR_OUT_OF_RANGE(name, "an integer", value);
      if (value < min || value > max)
        throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
    });
    var validateInt32 = hideStackFrames((value, name, min = -2147483648, max = 2147483647) => {
      if (typeof value !== "number") {
        throw new ERR_INVALID_ARG_TYPE(name, "number", value);
      }
      if (!NumberIsInteger(value)) {
        throw new ERR_OUT_OF_RANGE(name, "an integer", value);
      }
      if (value < min || value > max) {
        throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
      }
    });
    var validateUint32 = hideStackFrames((value, name, positive = false) => {
      if (typeof value !== "number") {
        throw new ERR_INVALID_ARG_TYPE(name, "number", value);
      }
      if (!NumberIsInteger(value)) {
        throw new ERR_OUT_OF_RANGE(name, "an integer", value);
      }
      const min = positive ? 1 : 0;
      const max = 4294967295;
      if (value < min || value > max) {
        throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
      }
    });
    function validateString(value, name) {
      if (typeof value !== "string")
        throw new ERR_INVALID_ARG_TYPE(name, "string", value);
    }
    function validateNumber(value, name, min = void 0, max) {
      if (typeof value !== "number")
        throw new ERR_INVALID_ARG_TYPE(name, "number", value);
      if (min != null && value < min || max != null && value > max || (min != null || max != null) && NumberIsNaN(value)) {
        throw new ERR_OUT_OF_RANGE(
          name,
          `${min != null ? `>= ${min}` : ""}${min != null && max != null ? " && " : ""}${max != null ? `<= ${max}` : ""}`,
          value
        );
      }
    }
    var validateOneOf = hideStackFrames((value, name, oneOf) => {
      if (!ArrayPrototypeIncludes(oneOf, value)) {
        const allowed = ArrayPrototypeJoin(
          ArrayPrototypeMap(oneOf, (v) => typeof v === "string" ? `'${v}'` : String2(v)),
          ", "
        );
        const reason = "must be one of: " + allowed;
        throw new ERR_INVALID_ARG_VALUE(name, value, reason);
      }
    });
    function validateBoolean(value, name) {
      if (typeof value !== "boolean")
        throw new ERR_INVALID_ARG_TYPE(name, "boolean", value);
    }
    function getOwnPropertyValueOrDefault(options, key, defaultValue) {
      return options == null || !ObjectPrototypeHasOwnProperty(options, key) ? defaultValue : options[key];
    }
    var validateObject = hideStackFrames((value, name, options = null) => {
      const allowArray = getOwnPropertyValueOrDefault(options, "allowArray", false);
      const allowFunction = getOwnPropertyValueOrDefault(options, "allowFunction", false);
      const nullable = getOwnPropertyValueOrDefault(options, "nullable", false);
      if (!nullable && value === null || !allowArray && ArrayIsArray(value) || typeof value !== "object" && (!allowFunction || typeof value !== "function")) {
        throw new ERR_INVALID_ARG_TYPE(name, "Object", value);
      }
    });
    var validateDictionary = hideStackFrames((value, name) => {
      if (value != null && typeof value !== "object" && typeof value !== "function") {
        throw new ERR_INVALID_ARG_TYPE(name, "a dictionary", value);
      }
    });
    var validateArray = hideStackFrames((value, name, minLength = 0) => {
      if (!ArrayIsArray(value)) {
        throw new ERR_INVALID_ARG_TYPE(name, "Array", value);
      }
      if (value.length < minLength) {
        const reason = `must be longer than ${minLength}`;
        throw new ERR_INVALID_ARG_VALUE(name, value, reason);
      }
    });
    function validateStringArray(value, name) {
      validateArray(value, name);
      for (let i = 0; i < value.length; i++) {
        validateString(value[i], `${name}[${i}]`);
      }
    }
    function validateBooleanArray(value, name) {
      validateArray(value, name);
      for (let i = 0; i < value.length; i++) {
        validateBoolean(value[i], `${name}[${i}]`);
      }
    }
    function validateSignalName(signal, name = "signal") {
      validateString(signal, name);
      if (signals[signal] === void 0) {
        if (signals[StringPrototypeToUpperCase(signal)] !== void 0) {
          throw new ERR_UNKNOWN_SIGNAL(signal + " (signals must use all capital letters)");
        }
        throw new ERR_UNKNOWN_SIGNAL(signal);
      }
    }
    var validateBuffer = hideStackFrames((buffer, name = "buffer") => {
      if (!isArrayBufferView(buffer)) {
        throw new ERR_INVALID_ARG_TYPE(name, ["Buffer", "TypedArray", "DataView"], buffer);
      }
    });
    function validateEncoding(data, encoding) {
      const normalizedEncoding = normalizeEncoding(encoding);
      const length = data.length;
      if (normalizedEncoding === "hex" && length % 2 !== 0) {
        throw new ERR_INVALID_ARG_VALUE("encoding", encoding, `is invalid for data of length ${length}`);
      }
    }
    function validatePort(port, name = "Port", allowZero = true) {
      if (typeof port !== "number" && typeof port !== "string" || typeof port === "string" && StringPrototypeTrim(port).length === 0 || +port !== +port >>> 0 || port > 65535 || port === 0 && !allowZero) {
        throw new ERR_SOCKET_BAD_PORT(name, port, allowZero);
      }
      return port | 0;
    }
    var validateAbortSignal = hideStackFrames((signal, name) => {
      if (signal !== void 0 && (signal === null || typeof signal !== "object" || !("aborted" in signal))) {
        throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
      }
    });
    var validateFunction = hideStackFrames((value, name) => {
      if (typeof value !== "function")
        throw new ERR_INVALID_ARG_TYPE(name, "Function", value);
    });
    var validatePlainFunction = hideStackFrames((value, name) => {
      if (typeof value !== "function" || isAsyncFunction(value))
        throw new ERR_INVALID_ARG_TYPE(name, "Function", value);
    });
    var validateUndefined = hideStackFrames((value, name) => {
      if (value !== void 0)
        throw new ERR_INVALID_ARG_TYPE(name, "undefined", value);
    });
    function validateUnion(value, name, union) {
      if (!ArrayPrototypeIncludes(union, value)) {
        throw new ERR_INVALID_ARG_TYPE(name, `('${ArrayPrototypeJoin(union, "|")}')`, value);
      }
    }
    var linkValueRegExp = /^(?:<[^>]*>)(?:\s*;\s*[^;"\s]+(?:=(")?[^;"\s]*\1)?)*$/;
    function validateLinkHeaderFormat(value, name) {
      if (typeof value === "undefined" || !RegExpPrototypeExec(linkValueRegExp, value)) {
        throw new ERR_INVALID_ARG_VALUE(
          name,
          value,
          'must be an array or string of format "</styles.css>; rel=preload; as=style"'
        );
      }
    }
    function validateLinkHeaderValue(hints) {
      if (typeof hints === "string") {
        validateLinkHeaderFormat(hints, "hints");
        return hints;
      } else if (ArrayIsArray(hints)) {
        const hintsLength = hints.length;
        let result = "";
        if (hintsLength === 0) {
          return result;
        }
        for (let i = 0; i < hintsLength; i++) {
          const link = hints[i];
          validateLinkHeaderFormat(link, "hints");
          result += link;
          if (i !== hintsLength - 1) {
            result += ", ";
          }
        }
        return result;
      }
      throw new ERR_INVALID_ARG_VALUE(
        "hints",
        hints,
        'must be an array or string of format "</styles.css>; rel=preload; as=style"'
      );
    }
    module2.exports = {
      isInt32,
      isUint32,
      parseFileMode,
      validateArray,
      validateStringArray,
      validateBooleanArray,
      validateBoolean,
      validateBuffer,
      validateDictionary,
      validateEncoding,
      validateFunction,
      validateInt32,
      validateInteger,
      validateNumber,
      validateObject,
      validateOneOf,
      validatePlainFunction,
      validatePort,
      validateSignalName,
      validateString,
      validateUint32,
      validateUndefined,
      validateUnion,
      validateAbortSignal,
      validateLinkHeaderValue
    };
  }
});

// node_modules/process/index.js
var require_process = __commonJS({
  "node_modules/process/index.js"(exports, module2) {
    module2.exports = global.process;
  }
});

// node_modules/readable-stream/lib/internal/streams/utils.js
var require_utils = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/utils.js"(exports, module2) {
    "use strict";
    var { Symbol: Symbol2, SymbolAsyncIterator, SymbolIterator, SymbolFor } = require_primordials();
    var kDestroyed = Symbol2("kDestroyed");
    var kIsErrored = Symbol2("kIsErrored");
    var kIsReadable = Symbol2("kIsReadable");
    var kIsDisturbed = Symbol2("kIsDisturbed");
    var kIsClosedPromise = SymbolFor("nodejs.webstream.isClosedPromise");
    var kControllerErrorFunction = SymbolFor("nodejs.webstream.controllerErrorFunction");
    function isReadableNodeStream(obj, strict = false) {
      var _obj$_readableState;
      return !!(obj && typeof obj.pipe === "function" && typeof obj.on === "function" && (!strict || typeof obj.pause === "function" && typeof obj.resume === "function") && (!obj._writableState || ((_obj$_readableState = obj._readableState) === null || _obj$_readableState === void 0 ? void 0 : _obj$_readableState.readable) !== false) && // Duplex
      (!obj._writableState || obj._readableState));
    }
    function isWritableNodeStream(obj) {
      var _obj$_writableState;
      return !!(obj && typeof obj.write === "function" && typeof obj.on === "function" && (!obj._readableState || ((_obj$_writableState = obj._writableState) === null || _obj$_writableState === void 0 ? void 0 : _obj$_writableState.writable) !== false));
    }
    function isDuplexNodeStream(obj) {
      return !!(obj && typeof obj.pipe === "function" && obj._readableState && typeof obj.on === "function" && typeof obj.write === "function");
    }
    function isNodeStream(obj) {
      return obj && (obj._readableState || obj._writableState || typeof obj.write === "function" && typeof obj.on === "function" || typeof obj.pipe === "function" && typeof obj.on === "function");
    }
    function isReadableStream(obj) {
      return !!(obj && !isNodeStream(obj) && typeof obj.pipeThrough === "function" && typeof obj.getReader === "function" && typeof obj.cancel === "function");
    }
    function isWritableStream(obj) {
      return !!(obj && !isNodeStream(obj) && typeof obj.getWriter === "function" && typeof obj.abort === "function");
    }
    function isTransformStream(obj) {
      return !!(obj && !isNodeStream(obj) && typeof obj.readable === "object" && typeof obj.writable === "object");
    }
    function isWebStream(obj) {
      return isReadableStream(obj) || isWritableStream(obj) || isTransformStream(obj);
    }
    function isIterable(obj, isAsync) {
      if (obj == null)
        return false;
      if (isAsync === true)
        return typeof obj[SymbolAsyncIterator] === "function";
      if (isAsync === false)
        return typeof obj[SymbolIterator] === "function";
      return typeof obj[SymbolAsyncIterator] === "function" || typeof obj[SymbolIterator] === "function";
    }
    function isDestroyed(stream) {
      if (!isNodeStream(stream))
        return null;
      const wState = stream._writableState;
      const rState = stream._readableState;
      const state = wState || rState;
      return !!(stream.destroyed || stream[kDestroyed] || state !== null && state !== void 0 && state.destroyed);
    }
    function isWritableEnded(stream) {
      if (!isWritableNodeStream(stream))
        return null;
      if (stream.writableEnded === true)
        return true;
      const wState = stream._writableState;
      if (wState !== null && wState !== void 0 && wState.errored)
        return false;
      if (typeof (wState === null || wState === void 0 ? void 0 : wState.ended) !== "boolean")
        return null;
      return wState.ended;
    }
    function isWritableFinished(stream, strict) {
      if (!isWritableNodeStream(stream))
        return null;
      if (stream.writableFinished === true)
        return true;
      const wState = stream._writableState;
      if (wState !== null && wState !== void 0 && wState.errored)
        return false;
      if (typeof (wState === null || wState === void 0 ? void 0 : wState.finished) !== "boolean")
        return null;
      return !!(wState.finished || strict === false && wState.ended === true && wState.length === 0);
    }
    function isReadableEnded(stream) {
      if (!isReadableNodeStream(stream))
        return null;
      if (stream.readableEnded === true)
        return true;
      const rState = stream._readableState;
      if (!rState || rState.errored)
        return false;
      if (typeof (rState === null || rState === void 0 ? void 0 : rState.ended) !== "boolean")
        return null;
      return rState.ended;
    }
    function isReadableFinished(stream, strict) {
      if (!isReadableNodeStream(stream))
        return null;
      const rState = stream._readableState;
      if (rState !== null && rState !== void 0 && rState.errored)
        return false;
      if (typeof (rState === null || rState === void 0 ? void 0 : rState.endEmitted) !== "boolean")
        return null;
      return !!(rState.endEmitted || strict === false && rState.ended === true && rState.length === 0);
    }
    function isReadable(stream) {
      if (stream && stream[kIsReadable] != null)
        return stream[kIsReadable];
      if (typeof (stream === null || stream === void 0 ? void 0 : stream.readable) !== "boolean")
        return null;
      if (isDestroyed(stream))
        return false;
      return isReadableNodeStream(stream) && stream.readable && !isReadableFinished(stream);
    }
    function isWritable(stream) {
      if (typeof (stream === null || stream === void 0 ? void 0 : stream.writable) !== "boolean")
        return null;
      if (isDestroyed(stream))
        return false;
      return isWritableNodeStream(stream) && stream.writable && !isWritableEnded(stream);
    }
    function isFinished(stream, opts) {
      if (!isNodeStream(stream)) {
        return null;
      }
      if (isDestroyed(stream)) {
        return true;
      }
      if ((opts === null || opts === void 0 ? void 0 : opts.readable) !== false && isReadable(stream)) {
        return false;
      }
      if ((opts === null || opts === void 0 ? void 0 : opts.writable) !== false && isWritable(stream)) {
        return false;
      }
      return true;
    }
    function isWritableErrored(stream) {
      var _stream$_writableStat, _stream$_writableStat2;
      if (!isNodeStream(stream)) {
        return null;
      }
      if (stream.writableErrored) {
        return stream.writableErrored;
      }
      return (_stream$_writableStat = (_stream$_writableStat2 = stream._writableState) === null || _stream$_writableStat2 === void 0 ? void 0 : _stream$_writableStat2.errored) !== null && _stream$_writableStat !== void 0 ? _stream$_writableStat : null;
    }
    function isReadableErrored(stream) {
      var _stream$_readableStat, _stream$_readableStat2;
      if (!isNodeStream(stream)) {
        return null;
      }
      if (stream.readableErrored) {
        return stream.readableErrored;
      }
      return (_stream$_readableStat = (_stream$_readableStat2 = stream._readableState) === null || _stream$_readableStat2 === void 0 ? void 0 : _stream$_readableStat2.errored) !== null && _stream$_readableStat !== void 0 ? _stream$_readableStat : null;
    }
    function isClosed(stream) {
      if (!isNodeStream(stream)) {
        return null;
      }
      if (typeof stream.closed === "boolean") {
        return stream.closed;
      }
      const wState = stream._writableState;
      const rState = stream._readableState;
      if (typeof (wState === null || wState === void 0 ? void 0 : wState.closed) === "boolean" || typeof (rState === null || rState === void 0 ? void 0 : rState.closed) === "boolean") {
        return (wState === null || wState === void 0 ? void 0 : wState.closed) || (rState === null || rState === void 0 ? void 0 : rState.closed);
      }
      if (typeof stream._closed === "boolean" && isOutgoingMessage(stream)) {
        return stream._closed;
      }
      return null;
    }
    function isOutgoingMessage(stream) {
      return typeof stream._closed === "boolean" && typeof stream._defaultKeepAlive === "boolean" && typeof stream._removedConnection === "boolean" && typeof stream._removedContLen === "boolean";
    }
    function isServerResponse(stream) {
      return typeof stream._sent100 === "boolean" && isOutgoingMessage(stream);
    }
    function isServerRequest(stream) {
      var _stream$req;
      return typeof stream._consuming === "boolean" && typeof stream._dumped === "boolean" && ((_stream$req = stream.req) === null || _stream$req === void 0 ? void 0 : _stream$req.upgradeOrConnect) === void 0;
    }
    function willEmitClose(stream) {
      if (!isNodeStream(stream))
        return null;
      const wState = stream._writableState;
      const rState = stream._readableState;
      const state = wState || rState;
      return !state && isServerResponse(stream) || !!(state && state.autoDestroy && state.emitClose && state.closed === false);
    }
    function isDisturbed(stream) {
      var _stream$kIsDisturbed;
      return !!(stream && ((_stream$kIsDisturbed = stream[kIsDisturbed]) !== null && _stream$kIsDisturbed !== void 0 ? _stream$kIsDisturbed : stream.readableDidRead || stream.readableAborted));
    }
    function isErrored(stream) {
      var _ref, _ref2, _ref3, _ref4, _ref5, _stream$kIsErrored, _stream$_readableStat3, _stream$_writableStat3, _stream$_readableStat4, _stream$_writableStat4;
      return !!(stream && ((_ref = (_ref2 = (_ref3 = (_ref4 = (_ref5 = (_stream$kIsErrored = stream[kIsErrored]) !== null && _stream$kIsErrored !== void 0 ? _stream$kIsErrored : stream.readableErrored) !== null && _ref5 !== void 0 ? _ref5 : stream.writableErrored) !== null && _ref4 !== void 0 ? _ref4 : (_stream$_readableStat3 = stream._readableState) === null || _stream$_readableStat3 === void 0 ? void 0 : _stream$_readableStat3.errorEmitted) !== null && _ref3 !== void 0 ? _ref3 : (_stream$_writableStat3 = stream._writableState) === null || _stream$_writableStat3 === void 0 ? void 0 : _stream$_writableStat3.errorEmitted) !== null && _ref2 !== void 0 ? _ref2 : (_stream$_readableStat4 = stream._readableState) === null || _stream$_readableStat4 === void 0 ? void 0 : _stream$_readableStat4.errored) !== null && _ref !== void 0 ? _ref : (_stream$_writableStat4 = stream._writableState) === null || _stream$_writableStat4 === void 0 ? void 0 : _stream$_writableStat4.errored));
    }
    module2.exports = {
      kDestroyed,
      isDisturbed,
      kIsDisturbed,
      isErrored,
      kIsErrored,
      isReadable,
      kIsReadable,
      kIsClosedPromise,
      kControllerErrorFunction,
      isClosed,
      isDestroyed,
      isDuplexNodeStream,
      isFinished,
      isIterable,
      isReadableNodeStream,
      isReadableStream,
      isReadableEnded,
      isReadableFinished,
      isReadableErrored,
      isNodeStream,
      isWebStream,
      isWritable,
      isWritableNodeStream,
      isWritableStream,
      isWritableEnded,
      isWritableFinished,
      isWritableErrored,
      isServerRequest,
      isServerResponse,
      willEmitClose,
      isTransformStream
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/end-of-stream.js
var require_end_of_stream = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/end-of-stream.js"(exports, module2) {
    var process2 = require_process();
    var { AbortError, codes } = require_errors();
    var { ERR_INVALID_ARG_TYPE, ERR_STREAM_PREMATURE_CLOSE } = codes;
    var { kEmptyObject, once } = require_util();
    var { validateAbortSignal, validateFunction, validateObject, validateBoolean } = require_validators();
    var { Promise: Promise2, PromisePrototypeThen } = require_primordials();
    var {
      isClosed,
      isReadable,
      isReadableNodeStream,
      isReadableStream,
      isReadableFinished,
      isReadableErrored,
      isWritable,
      isWritableNodeStream,
      isWritableStream,
      isWritableFinished,
      isWritableErrored,
      isNodeStream,
      willEmitClose: _willEmitClose,
      kIsClosedPromise
    } = require_utils();
    function isRequest(stream) {
      return stream.setHeader && typeof stream.abort === "function";
    }
    var nop = () => {
    };
    function eos(stream, options, callback) {
      var _options$readable, _options$writable;
      if (arguments.length === 2) {
        callback = options;
        options = kEmptyObject;
      } else if (options == null) {
        options = kEmptyObject;
      } else {
        validateObject(options, "options");
      }
      validateFunction(callback, "callback");
      validateAbortSignal(options.signal, "options.signal");
      callback = once(callback);
      if (isReadableStream(stream) || isWritableStream(stream)) {
        return eosWeb(stream, options, callback);
      }
      if (!isNodeStream(stream)) {
        throw new ERR_INVALID_ARG_TYPE("stream", ["ReadableStream", "WritableStream", "Stream"], stream);
      }
      const readable = (_options$readable = options.readable) !== null && _options$readable !== void 0 ? _options$readable : isReadableNodeStream(stream);
      const writable = (_options$writable = options.writable) !== null && _options$writable !== void 0 ? _options$writable : isWritableNodeStream(stream);
      const wState = stream._writableState;
      const rState = stream._readableState;
      const onlegacyfinish = () => {
        if (!stream.writable) {
          onfinish();
        }
      };
      let willEmitClose = _willEmitClose(stream) && isReadableNodeStream(stream) === readable && isWritableNodeStream(stream) === writable;
      let writableFinished = isWritableFinished(stream, false);
      const onfinish = () => {
        writableFinished = true;
        if (stream.destroyed) {
          willEmitClose = false;
        }
        if (willEmitClose && (!stream.readable || readable)) {
          return;
        }
        if (!readable || readableFinished) {
          callback.call(stream);
        }
      };
      let readableFinished = isReadableFinished(stream, false);
      const onend = () => {
        readableFinished = true;
        if (stream.destroyed) {
          willEmitClose = false;
        }
        if (willEmitClose && (!stream.writable || writable)) {
          return;
        }
        if (!writable || writableFinished) {
          callback.call(stream);
        }
      };
      const onerror = (err) => {
        callback.call(stream, err);
      };
      let closed = isClosed(stream);
      const onclose = () => {
        closed = true;
        const errored = isWritableErrored(stream) || isReadableErrored(stream);
        if (errored && typeof errored !== "boolean") {
          return callback.call(stream, errored);
        }
        if (readable && !readableFinished && isReadableNodeStream(stream, true)) {
          if (!isReadableFinished(stream, false))
            return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE());
        }
        if (writable && !writableFinished) {
          if (!isWritableFinished(stream, false))
            return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE());
        }
        callback.call(stream);
      };
      const onclosed = () => {
        closed = true;
        const errored = isWritableErrored(stream) || isReadableErrored(stream);
        if (errored && typeof errored !== "boolean") {
          return callback.call(stream, errored);
        }
        callback.call(stream);
      };
      const onrequest = () => {
        stream.req.on("finish", onfinish);
      };
      if (isRequest(stream)) {
        stream.on("complete", onfinish);
        if (!willEmitClose) {
          stream.on("abort", onclose);
        }
        if (stream.req) {
          onrequest();
        } else {
          stream.on("request", onrequest);
        }
      } else if (writable && !wState) {
        stream.on("end", onlegacyfinish);
        stream.on("close", onlegacyfinish);
      }
      if (!willEmitClose && typeof stream.aborted === "boolean") {
        stream.on("aborted", onclose);
      }
      stream.on("end", onend);
      stream.on("finish", onfinish);
      if (options.error !== false) {
        stream.on("error", onerror);
      }
      stream.on("close", onclose);
      if (closed) {
        process2.nextTick(onclose);
      } else if (wState !== null && wState !== void 0 && wState.errorEmitted || rState !== null && rState !== void 0 && rState.errorEmitted) {
        if (!willEmitClose) {
          process2.nextTick(onclosed);
        }
      } else if (!readable && (!willEmitClose || isReadable(stream)) && (writableFinished || isWritable(stream) === false)) {
        process2.nextTick(onclosed);
      } else if (!writable && (!willEmitClose || isWritable(stream)) && (readableFinished || isReadable(stream) === false)) {
        process2.nextTick(onclosed);
      } else if (rState && stream.req && stream.aborted) {
        process2.nextTick(onclosed);
      }
      const cleanup = () => {
        callback = nop;
        stream.removeListener("aborted", onclose);
        stream.removeListener("complete", onfinish);
        stream.removeListener("abort", onclose);
        stream.removeListener("request", onrequest);
        if (stream.req)
          stream.req.removeListener("finish", onfinish);
        stream.removeListener("end", onlegacyfinish);
        stream.removeListener("close", onlegacyfinish);
        stream.removeListener("finish", onfinish);
        stream.removeListener("end", onend);
        stream.removeListener("error", onerror);
        stream.removeListener("close", onclose);
      };
      if (options.signal && !closed) {
        const abort = () => {
          const endCallback = callback;
          cleanup();
          endCallback.call(
            stream,
            new AbortError(void 0, {
              cause: options.signal.reason
            })
          );
        };
        if (options.signal.aborted) {
          process2.nextTick(abort);
        } else {
          const originalCallback = callback;
          callback = once((...args) => {
            options.signal.removeEventListener("abort", abort);
            originalCallback.apply(stream, args);
          });
          options.signal.addEventListener("abort", abort);
        }
      }
      return cleanup;
    }
    function eosWeb(stream, options, callback) {
      let isAborted = false;
      let abort = nop;
      if (options.signal) {
        abort = () => {
          isAborted = true;
          callback.call(
            stream,
            new AbortError(void 0, {
              cause: options.signal.reason
            })
          );
        };
        if (options.signal.aborted) {
          process2.nextTick(abort);
        } else {
          const originalCallback = callback;
          callback = once((...args) => {
            options.signal.removeEventListener("abort", abort);
            originalCallback.apply(stream, args);
          });
          options.signal.addEventListener("abort", abort);
        }
      }
      const resolverFn = (...args) => {
        if (!isAborted) {
          process2.nextTick(() => callback.apply(stream, args));
        }
      };
      PromisePrototypeThen(stream[kIsClosedPromise].promise, resolverFn, resolverFn);
      return nop;
    }
    function finished(stream, opts) {
      var _opts;
      let autoCleanup = false;
      if (opts === null) {
        opts = kEmptyObject;
      }
      if ((_opts = opts) !== null && _opts !== void 0 && _opts.cleanup) {
        validateBoolean(opts.cleanup, "cleanup");
        autoCleanup = opts.cleanup;
      }
      return new Promise2((resolve, reject) => {
        const cleanup = eos(stream, opts, (err) => {
          if (autoCleanup) {
            cleanup();
          }
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    module2.exports = eos;
    module2.exports.finished = finished;
  }
});

// node_modules/readable-stream/lib/internal/streams/destroy.js
var require_destroy = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/destroy.js"(exports, module2) {
    "use strict";
    var process2 = require_process();
    var {
      aggregateTwoErrors,
      codes: { ERR_MULTIPLE_CALLBACK },
      AbortError
    } = require_errors();
    var { Symbol: Symbol2 } = require_primordials();
    var { kDestroyed, isDestroyed, isFinished, isServerRequest } = require_utils();
    var kDestroy = Symbol2("kDestroy");
    var kConstruct = Symbol2("kConstruct");
    function checkError(err, w, r) {
      if (err) {
        err.stack;
        if (w && !w.errored) {
          w.errored = err;
        }
        if (r && !r.errored) {
          r.errored = err;
        }
      }
    }
    function destroy(err, cb) {
      const r = this._readableState;
      const w = this._writableState;
      const s = w || r;
      if (w !== null && w !== void 0 && w.destroyed || r !== null && r !== void 0 && r.destroyed) {
        if (typeof cb === "function") {
          cb();
        }
        return this;
      }
      checkError(err, w, r);
      if (w) {
        w.destroyed = true;
      }
      if (r) {
        r.destroyed = true;
      }
      if (!s.constructed) {
        this.once(kDestroy, function(er) {
          _destroy(this, aggregateTwoErrors(er, err), cb);
        });
      } else {
        _destroy(this, err, cb);
      }
      return this;
    }
    function _destroy(self, err, cb) {
      let called = false;
      function onDestroy(err2) {
        if (called) {
          return;
        }
        called = true;
        const r = self._readableState;
        const w = self._writableState;
        checkError(err2, w, r);
        if (w) {
          w.closed = true;
        }
        if (r) {
          r.closed = true;
        }
        if (typeof cb === "function") {
          cb(err2);
        }
        if (err2) {
          process2.nextTick(emitErrorCloseNT, self, err2);
        } else {
          process2.nextTick(emitCloseNT, self);
        }
      }
      try {
        self._destroy(err || null, onDestroy);
      } catch (err2) {
        onDestroy(err2);
      }
    }
    function emitErrorCloseNT(self, err) {
      emitErrorNT(self, err);
      emitCloseNT(self);
    }
    function emitCloseNT(self) {
      const r = self._readableState;
      const w = self._writableState;
      if (w) {
        w.closeEmitted = true;
      }
      if (r) {
        r.closeEmitted = true;
      }
      if (w !== null && w !== void 0 && w.emitClose || r !== null && r !== void 0 && r.emitClose) {
        self.emit("close");
      }
    }
    function emitErrorNT(self, err) {
      const r = self._readableState;
      const w = self._writableState;
      if (w !== null && w !== void 0 && w.errorEmitted || r !== null && r !== void 0 && r.errorEmitted) {
        return;
      }
      if (w) {
        w.errorEmitted = true;
      }
      if (r) {
        r.errorEmitted = true;
      }
      self.emit("error", err);
    }
    function undestroy() {
      const r = this._readableState;
      const w = this._writableState;
      if (r) {
        r.constructed = true;
        r.closed = false;
        r.closeEmitted = false;
        r.destroyed = false;
        r.errored = null;
        r.errorEmitted = false;
        r.reading = false;
        r.ended = r.readable === false;
        r.endEmitted = r.readable === false;
      }
      if (w) {
        w.constructed = true;
        w.destroyed = false;
        w.closed = false;
        w.closeEmitted = false;
        w.errored = null;
        w.errorEmitted = false;
        w.finalCalled = false;
        w.prefinished = false;
        w.ended = w.writable === false;
        w.ending = w.writable === false;
        w.finished = w.writable === false;
      }
    }
    function errorOrDestroy(stream, err, sync) {
      const r = stream._readableState;
      const w = stream._writableState;
      if (w !== null && w !== void 0 && w.destroyed || r !== null && r !== void 0 && r.destroyed) {
        return this;
      }
      if (r !== null && r !== void 0 && r.autoDestroy || w !== null && w !== void 0 && w.autoDestroy)
        stream.destroy(err);
      else if (err) {
        err.stack;
        if (w && !w.errored) {
          w.errored = err;
        }
        if (r && !r.errored) {
          r.errored = err;
        }
        if (sync) {
          process2.nextTick(emitErrorNT, stream, err);
        } else {
          emitErrorNT(stream, err);
        }
      }
    }
    function construct(stream, cb) {
      if (typeof stream._construct !== "function") {
        return;
      }
      const r = stream._readableState;
      const w = stream._writableState;
      if (r) {
        r.constructed = false;
      }
      if (w) {
        w.constructed = false;
      }
      stream.once(kConstruct, cb);
      if (stream.listenerCount(kConstruct) > 1) {
        return;
      }
      process2.nextTick(constructNT, stream);
    }
    function constructNT(stream) {
      let called = false;
      function onConstruct(err) {
        if (called) {
          errorOrDestroy(stream, err !== null && err !== void 0 ? err : new ERR_MULTIPLE_CALLBACK());
          return;
        }
        called = true;
        const r = stream._readableState;
        const w = stream._writableState;
        const s = w || r;
        if (r) {
          r.constructed = true;
        }
        if (w) {
          w.constructed = true;
        }
        if (s.destroyed) {
          stream.emit(kDestroy, err);
        } else if (err) {
          errorOrDestroy(stream, err, true);
        } else {
          process2.nextTick(emitConstructNT, stream);
        }
      }
      try {
        stream._construct((err) => {
          process2.nextTick(onConstruct, err);
        });
      } catch (err) {
        process2.nextTick(onConstruct, err);
      }
    }
    function emitConstructNT(stream) {
      stream.emit(kConstruct);
    }
    function isRequest(stream) {
      return (stream === null || stream === void 0 ? void 0 : stream.setHeader) && typeof stream.abort === "function";
    }
    function emitCloseLegacy(stream) {
      stream.emit("close");
    }
    function emitErrorCloseLegacy(stream, err) {
      stream.emit("error", err);
      process2.nextTick(emitCloseLegacy, stream);
    }
    function destroyer(stream, err) {
      if (!stream || isDestroyed(stream)) {
        return;
      }
      if (!err && !isFinished(stream)) {
        err = new AbortError();
      }
      if (isServerRequest(stream)) {
        stream.socket = null;
        stream.destroy(err);
      } else if (isRequest(stream)) {
        stream.abort();
      } else if (isRequest(stream.req)) {
        stream.req.abort();
      } else if (typeof stream.destroy === "function") {
        stream.destroy(err);
      } else if (typeof stream.close === "function") {
        stream.close();
      } else if (err) {
        process2.nextTick(emitErrorCloseLegacy, stream, err);
      } else {
        process2.nextTick(emitCloseLegacy, stream);
      }
      if (!stream.destroyed) {
        stream[kDestroyed] = true;
      }
    }
    module2.exports = {
      construct,
      destroyer,
      destroy,
      undestroy,
      errorOrDestroy
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/legacy.js
var require_legacy = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/legacy.js"(exports, module2) {
    "use strict";
    var { ArrayIsArray, ObjectSetPrototypeOf } = require_primordials();
    var { EventEmitter: EE } = require("events");
    function Stream(opts) {
      EE.call(this, opts);
    }
    ObjectSetPrototypeOf(Stream.prototype, EE.prototype);
    ObjectSetPrototypeOf(Stream, EE);
    Stream.prototype.pipe = function(dest, options) {
      const source = this;
      function ondata(chunk) {
        if (dest.writable && dest.write(chunk) === false && source.pause) {
          source.pause();
        }
      }
      source.on("data", ondata);
      function ondrain() {
        if (source.readable && source.resume) {
          source.resume();
        }
      }
      dest.on("drain", ondrain);
      if (!dest._isStdio && (!options || options.end !== false)) {
        source.on("end", onend);
        source.on("close", onclose);
      }
      let didOnEnd = false;
      function onend() {
        if (didOnEnd)
          return;
        didOnEnd = true;
        dest.end();
      }
      function onclose() {
        if (didOnEnd)
          return;
        didOnEnd = true;
        if (typeof dest.destroy === "function")
          dest.destroy();
      }
      function onerror(er) {
        cleanup();
        if (EE.listenerCount(this, "error") === 0) {
          this.emit("error", er);
        }
      }
      prependListener(source, "error", onerror);
      prependListener(dest, "error", onerror);
      function cleanup() {
        source.removeListener("data", ondata);
        dest.removeListener("drain", ondrain);
        source.removeListener("end", onend);
        source.removeListener("close", onclose);
        source.removeListener("error", onerror);
        dest.removeListener("error", onerror);
        source.removeListener("end", cleanup);
        source.removeListener("close", cleanup);
        dest.removeListener("close", cleanup);
      }
      source.on("end", cleanup);
      source.on("close", cleanup);
      dest.on("close", cleanup);
      dest.emit("pipe", source);
      return dest;
    };
    function prependListener(emitter, event, fn) {
      if (typeof emitter.prependListener === "function")
        return emitter.prependListener(event, fn);
      if (!emitter._events || !emitter._events[event])
        emitter.on(event, fn);
      else if (ArrayIsArray(emitter._events[event]))
        emitter._events[event].unshift(fn);
      else
        emitter._events[event] = [fn, emitter._events[event]];
    }
    module2.exports = {
      Stream,
      prependListener
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/add-abort-signal.js
var require_add_abort_signal = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/add-abort-signal.js"(exports, module2) {
    "use strict";
    var { AbortError, codes } = require_errors();
    var { isNodeStream, isWebStream, kControllerErrorFunction } = require_utils();
    var eos = require_end_of_stream();
    var { ERR_INVALID_ARG_TYPE } = codes;
    var validateAbortSignal = (signal, name) => {
      if (typeof signal !== "object" || !("aborted" in signal)) {
        throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
      }
    };
    module2.exports.addAbortSignal = function addAbortSignal(signal, stream) {
      validateAbortSignal(signal, "signal");
      if (!isNodeStream(stream) && !isWebStream(stream)) {
        throw new ERR_INVALID_ARG_TYPE("stream", ["ReadableStream", "WritableStream", "Stream"], stream);
      }
      return module2.exports.addAbortSignalNoValidate(signal, stream);
    };
    module2.exports.addAbortSignalNoValidate = function(signal, stream) {
      if (typeof signal !== "object" || !("aborted" in signal)) {
        return stream;
      }
      const onAbort = isNodeStream(stream) ? () => {
        stream.destroy(
          new AbortError(void 0, {
            cause: signal.reason
          })
        );
      } : () => {
        stream[kControllerErrorFunction](
          new AbortError(void 0, {
            cause: signal.reason
          })
        );
      };
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener("abort", onAbort);
        eos(stream, () => signal.removeEventListener("abort", onAbort));
      }
      return stream;
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/buffer_list.js
var require_buffer_list = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/buffer_list.js"(exports, module2) {
    "use strict";
    var { StringPrototypeSlice, SymbolIterator, TypedArrayPrototypeSet, Uint8Array: Uint8Array2 } = require_primordials();
    var { Buffer: Buffer2 } = require("buffer");
    var { inspect } = require_util();
    module2.exports = class BufferList {
      constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
      }
      push(v) {
        const entry = {
          data: v,
          next: null
        };
        if (this.length > 0)
          this.tail.next = entry;
        else
          this.head = entry;
        this.tail = entry;
        ++this.length;
      }
      unshift(v) {
        const entry = {
          data: v,
          next: this.head
        };
        if (this.length === 0)
          this.tail = entry;
        this.head = entry;
        ++this.length;
      }
      shift() {
        if (this.length === 0)
          return;
        const ret = this.head.data;
        if (this.length === 1)
          this.head = this.tail = null;
        else
          this.head = this.head.next;
        --this.length;
        return ret;
      }
      clear() {
        this.head = this.tail = null;
        this.length = 0;
      }
      join(s) {
        if (this.length === 0)
          return "";
        let p = this.head;
        let ret = "" + p.data;
        while ((p = p.next) !== null)
          ret += s + p.data;
        return ret;
      }
      concat(n) {
        if (this.length === 0)
          return Buffer2.alloc(0);
        const ret = Buffer2.allocUnsafe(n >>> 0);
        let p = this.head;
        let i = 0;
        while (p) {
          TypedArrayPrototypeSet(ret, p.data, i);
          i += p.data.length;
          p = p.next;
        }
        return ret;
      }
      // Consumes a specified amount of bytes or characters from the buffered data.
      consume(n, hasStrings) {
        const data = this.head.data;
        if (n < data.length) {
          const slice = data.slice(0, n);
          this.head.data = data.slice(n);
          return slice;
        }
        if (n === data.length) {
          return this.shift();
        }
        return hasStrings ? this._getString(n) : this._getBuffer(n);
      }
      first() {
        return this.head.data;
      }
      *[SymbolIterator]() {
        for (let p = this.head; p; p = p.next) {
          yield p.data;
        }
      }
      // Consumes a specified amount of characters from the buffered data.
      _getString(n) {
        let ret = "";
        let p = this.head;
        let c = 0;
        do {
          const str = p.data;
          if (n > str.length) {
            ret += str;
            n -= str.length;
          } else {
            if (n === str.length) {
              ret += str;
              ++c;
              if (p.next)
                this.head = p.next;
              else
                this.head = this.tail = null;
            } else {
              ret += StringPrototypeSlice(str, 0, n);
              this.head = p;
              p.data = StringPrototypeSlice(str, n);
            }
            break;
          }
          ++c;
        } while ((p = p.next) !== null);
        this.length -= c;
        return ret;
      }
      // Consumes a specified amount of bytes from the buffered data.
      _getBuffer(n) {
        const ret = Buffer2.allocUnsafe(n);
        const retLen = n;
        let p = this.head;
        let c = 0;
        do {
          const buf = p.data;
          if (n > buf.length) {
            TypedArrayPrototypeSet(ret, buf, retLen - n);
            n -= buf.length;
          } else {
            if (n === buf.length) {
              TypedArrayPrototypeSet(ret, buf, retLen - n);
              ++c;
              if (p.next)
                this.head = p.next;
              else
                this.head = this.tail = null;
            } else {
              TypedArrayPrototypeSet(ret, new Uint8Array2(buf.buffer, buf.byteOffset, n), retLen - n);
              this.head = p;
              p.data = buf.slice(n);
            }
            break;
          }
          ++c;
        } while ((p = p.next) !== null);
        this.length -= c;
        return ret;
      }
      // Make sure the linked list only shows the minimal necessary information.
      [Symbol.for("nodejs.util.inspect.custom")](_, options) {
        return inspect(this, {
          ...options,
          // Only inspect one level.
          depth: 0,
          // It should not recurse.
          customInspect: false
        });
      }
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/state.js
var require_state = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/state.js"(exports, module2) {
    "use strict";
    var { MathFloor, NumberIsInteger } = require_primordials();
    var { ERR_INVALID_ARG_VALUE } = require_errors().codes;
    function highWaterMarkFrom(options, isDuplex, duplexKey) {
      return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
    }
    function getDefaultHighWaterMark(objectMode) {
      return objectMode ? 16 : 16 * 1024;
    }
    function getHighWaterMark(state, options, duplexKey, isDuplex) {
      const hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
      if (hwm != null) {
        if (!NumberIsInteger(hwm) || hwm < 0) {
          const name = isDuplex ? `options.${duplexKey}` : "options.highWaterMark";
          throw new ERR_INVALID_ARG_VALUE(name, hwm);
        }
        return MathFloor(hwm);
      }
      return getDefaultHighWaterMark(state.objectMode);
    }
    module2.exports = {
      getHighWaterMark,
      getDefaultHighWaterMark
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/from.js
var require_from = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/from.js"(exports, module2) {
    "use strict";
    var process2 = require_process();
    var { PromisePrototypeThen, SymbolAsyncIterator, SymbolIterator } = require_primordials();
    var { Buffer: Buffer2 } = require("buffer");
    var { ERR_INVALID_ARG_TYPE, ERR_STREAM_NULL_VALUES } = require_errors().codes;
    function from(Readable2, iterable, opts) {
      let iterator;
      if (typeof iterable === "string" || iterable instanceof Buffer2) {
        return new Readable2({
          objectMode: true,
          ...opts,
          read() {
            this.push(iterable);
            this.push(null);
          }
        });
      }
      let isAsync;
      if (iterable && iterable[SymbolAsyncIterator]) {
        isAsync = true;
        iterator = iterable[SymbolAsyncIterator]();
      } else if (iterable && iterable[SymbolIterator]) {
        isAsync = false;
        iterator = iterable[SymbolIterator]();
      } else {
        throw new ERR_INVALID_ARG_TYPE("iterable", ["Iterable"], iterable);
      }
      const readable = new Readable2({
        objectMode: true,
        highWaterMark: 1,
        // TODO(ronag): What options should be allowed?
        ...opts
      });
      let reading = false;
      readable._read = function() {
        if (!reading) {
          reading = true;
          next();
        }
      };
      readable._destroy = function(error, cb) {
        PromisePrototypeThen(
          close(error),
          () => process2.nextTick(cb, error),
          // nextTick is here in case cb throws
          (e) => process2.nextTick(cb, e || error)
        );
      };
      async function close(error) {
        const hadError = error !== void 0 && error !== null;
        const hasThrow = typeof iterator.throw === "function";
        if (hadError && hasThrow) {
          const { value, done } = await iterator.throw(error);
          await value;
          if (done) {
            return;
          }
        }
        if (typeof iterator.return === "function") {
          const { value } = await iterator.return();
          await value;
        }
      }
      async function next() {
        for (; ; ) {
          try {
            const { value, done } = isAsync ? await iterator.next() : iterator.next();
            if (done) {
              readable.push(null);
            } else {
              const res = value && typeof value.then === "function" ? await value : value;
              if (res === null) {
                reading = false;
                throw new ERR_STREAM_NULL_VALUES();
              } else if (readable.push(res)) {
                continue;
              } else {
                reading = false;
              }
            }
          } catch (err) {
            readable.destroy(err);
          }
          break;
        }
      }
      return readable;
    }
    module2.exports = from;
  }
});

// node_modules/readable-stream/lib/internal/streams/readable.js
var require_readable = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/readable.js"(exports, module2) {
    var process2 = require_process();
    var {
      ArrayPrototypeIndexOf,
      NumberIsInteger,
      NumberIsNaN,
      NumberParseInt,
      ObjectDefineProperties,
      ObjectKeys,
      ObjectSetPrototypeOf,
      Promise: Promise2,
      SafeSet,
      SymbolAsyncIterator,
      Symbol: Symbol2
    } = require_primordials();
    module2.exports = Readable2;
    Readable2.ReadableState = ReadableState;
    var { EventEmitter: EE } = require("events");
    var { Stream, prependListener } = require_legacy();
    var { Buffer: Buffer2 } = require("buffer");
    var { addAbortSignal } = require_add_abort_signal();
    var eos = require_end_of_stream();
    var debug = require_util().debuglog("stream", (fn) => {
      debug = fn;
    });
    var BufferList = require_buffer_list();
    var destroyImpl = require_destroy();
    var { getHighWaterMark, getDefaultHighWaterMark } = require_state();
    var {
      aggregateTwoErrors,
      codes: {
        ERR_INVALID_ARG_TYPE,
        ERR_METHOD_NOT_IMPLEMENTED,
        ERR_OUT_OF_RANGE,
        ERR_STREAM_PUSH_AFTER_EOF,
        ERR_STREAM_UNSHIFT_AFTER_END_EVENT
      }
    } = require_errors();
    var { validateObject } = require_validators();
    var kPaused = Symbol2("kPaused");
    var { StringDecoder } = require("string_decoder");
    var from = require_from();
    ObjectSetPrototypeOf(Readable2.prototype, Stream.prototype);
    ObjectSetPrototypeOf(Readable2, Stream);
    var nop = () => {
    };
    var { errorOrDestroy } = destroyImpl;
    function ReadableState(options, stream, isDuplex) {
      if (typeof isDuplex !== "boolean")
        isDuplex = stream instanceof require_duplex();
      this.objectMode = !!(options && options.objectMode);
      if (isDuplex)
        this.objectMode = this.objectMode || !!(options && options.readableObjectMode);
      this.highWaterMark = options ? getHighWaterMark(this, options, "readableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
      this.buffer = new BufferList();
      this.length = 0;
      this.pipes = [];
      this.flowing = null;
      this.ended = false;
      this.endEmitted = false;
      this.reading = false;
      this.constructed = true;
      this.sync = true;
      this.needReadable = false;
      this.emittedReadable = false;
      this.readableListening = false;
      this.resumeScheduled = false;
      this[kPaused] = null;
      this.errorEmitted = false;
      this.emitClose = !options || options.emitClose !== false;
      this.autoDestroy = !options || options.autoDestroy !== false;
      this.destroyed = false;
      this.errored = null;
      this.closed = false;
      this.closeEmitted = false;
      this.defaultEncoding = options && options.defaultEncoding || "utf8";
      this.awaitDrainWriters = null;
      this.multiAwaitDrain = false;
      this.readingMore = false;
      this.dataEmitted = false;
      this.decoder = null;
      this.encoding = null;
      if (options && options.encoding) {
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    function Readable2(options) {
      if (!(this instanceof Readable2))
        return new Readable2(options);
      const isDuplex = this instanceof require_duplex();
      this._readableState = new ReadableState(options, this, isDuplex);
      if (options) {
        if (typeof options.read === "function")
          this._read = options.read;
        if (typeof options.destroy === "function")
          this._destroy = options.destroy;
        if (typeof options.construct === "function")
          this._construct = options.construct;
        if (options.signal && !isDuplex)
          addAbortSignal(options.signal, this);
      }
      Stream.call(this, options);
      destroyImpl.construct(this, () => {
        if (this._readableState.needReadable) {
          maybeReadMore(this, this._readableState);
        }
      });
    }
    Readable2.prototype.destroy = destroyImpl.destroy;
    Readable2.prototype._undestroy = destroyImpl.undestroy;
    Readable2.prototype._destroy = function(err, cb) {
      cb(err);
    };
    Readable2.prototype[EE.captureRejectionSymbol] = function(err) {
      this.destroy(err);
    };
    Readable2.prototype.push = function(chunk, encoding) {
      return readableAddChunk(this, chunk, encoding, false);
    };
    Readable2.prototype.unshift = function(chunk, encoding) {
      return readableAddChunk(this, chunk, encoding, true);
    };
    function readableAddChunk(stream, chunk, encoding, addToFront) {
      debug("readableAddChunk", chunk);
      const state = stream._readableState;
      let err;
      if (!state.objectMode) {
        if (typeof chunk === "string") {
          encoding = encoding || state.defaultEncoding;
          if (state.encoding !== encoding) {
            if (addToFront && state.encoding) {
              chunk = Buffer2.from(chunk, encoding).toString(state.encoding);
            } else {
              chunk = Buffer2.from(chunk, encoding);
              encoding = "";
            }
          }
        } else if (chunk instanceof Buffer2) {
          encoding = "";
        } else if (Stream._isUint8Array(chunk)) {
          chunk = Stream._uint8ArrayToBuffer(chunk);
          encoding = "";
        } else if (chunk != null) {
          err = new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "Uint8Array"], chunk);
        }
      }
      if (err) {
        errorOrDestroy(stream, err);
      } else if (chunk === null) {
        state.reading = false;
        onEofChunk(stream, state);
      } else if (state.objectMode || chunk && chunk.length > 0) {
        if (addToFront) {
          if (state.endEmitted)
            errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());
          else if (state.destroyed || state.errored)
            return false;
          else
            addChunk(stream, state, chunk, true);
        } else if (state.ended) {
          errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
        } else if (state.destroyed || state.errored) {
          return false;
        } else {
          state.reading = false;
          if (state.decoder && !encoding) {
            chunk = state.decoder.write(chunk);
            if (state.objectMode || chunk.length !== 0)
              addChunk(stream, state, chunk, false);
            else
              maybeReadMore(stream, state);
          } else {
            addChunk(stream, state, chunk, false);
          }
        }
      } else if (!addToFront) {
        state.reading = false;
        maybeReadMore(stream, state);
      }
      return !state.ended && (state.length < state.highWaterMark || state.length === 0);
    }
    function addChunk(stream, state, chunk, addToFront) {
      if (state.flowing && state.length === 0 && !state.sync && stream.listenerCount("data") > 0) {
        if (state.multiAwaitDrain) {
          state.awaitDrainWriters.clear();
        } else {
          state.awaitDrainWriters = null;
        }
        state.dataEmitted = true;
        stream.emit("data", chunk);
      } else {
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);
        if (state.needReadable)
          emitReadable(stream);
      }
      maybeReadMore(stream, state);
    }
    Readable2.prototype.isPaused = function() {
      const state = this._readableState;
      return state[kPaused] === true || state.flowing === false;
    };
    Readable2.prototype.setEncoding = function(enc) {
      const decoder = new StringDecoder(enc);
      this._readableState.decoder = decoder;
      this._readableState.encoding = this._readableState.decoder.encoding;
      const buffer = this._readableState.buffer;
      let content = "";
      for (const data of buffer) {
        content += decoder.write(data);
      }
      buffer.clear();
      if (content !== "")
        buffer.push(content);
      this._readableState.length = content.length;
      return this;
    };
    var MAX_HWM = 1073741824;
    function computeNewHighWaterMark(n) {
      if (n > MAX_HWM) {
        throw new ERR_OUT_OF_RANGE("size", "<= 1GiB", n);
      } else {
        n--;
        n |= n >>> 1;
        n |= n >>> 2;
        n |= n >>> 4;
        n |= n >>> 8;
        n |= n >>> 16;
        n++;
      }
      return n;
    }
    function howMuchToRead(n, state) {
      if (n <= 0 || state.length === 0 && state.ended)
        return 0;
      if (state.objectMode)
        return 1;
      if (NumberIsNaN(n)) {
        if (state.flowing && state.length)
          return state.buffer.first().length;
        return state.length;
      }
      if (n <= state.length)
        return n;
      return state.ended ? state.length : 0;
    }
    Readable2.prototype.read = function(n) {
      debug("read", n);
      if (n === void 0) {
        n = NaN;
      } else if (!NumberIsInteger(n)) {
        n = NumberParseInt(n, 10);
      }
      const state = this._readableState;
      const nOrig = n;
      if (n > state.highWaterMark)
        state.highWaterMark = computeNewHighWaterMark(n);
      if (n !== 0)
        state.emittedReadable = false;
      if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
        debug("read: emitReadable", state.length, state.ended);
        if (state.length === 0 && state.ended)
          endReadable(this);
        else
          emitReadable(this);
        return null;
      }
      n = howMuchToRead(n, state);
      if (n === 0 && state.ended) {
        if (state.length === 0)
          endReadable(this);
        return null;
      }
      let doRead = state.needReadable;
      debug("need readable", doRead);
      if (state.length === 0 || state.length - n < state.highWaterMark) {
        doRead = true;
        debug("length less than watermark", doRead);
      }
      if (state.ended || state.reading || state.destroyed || state.errored || !state.constructed) {
        doRead = false;
        debug("reading, ended or constructing", doRead);
      } else if (doRead) {
        debug("do read");
        state.reading = true;
        state.sync = true;
        if (state.length === 0)
          state.needReadable = true;
        try {
          this._read(state.highWaterMark);
        } catch (err) {
          errorOrDestroy(this, err);
        }
        state.sync = false;
        if (!state.reading)
          n = howMuchToRead(nOrig, state);
      }
      let ret;
      if (n > 0)
        ret = fromList(n, state);
      else
        ret = null;
      if (ret === null) {
        state.needReadable = state.length <= state.highWaterMark;
        n = 0;
      } else {
        state.length -= n;
        if (state.multiAwaitDrain) {
          state.awaitDrainWriters.clear();
        } else {
          state.awaitDrainWriters = null;
        }
      }
      if (state.length === 0) {
        if (!state.ended)
          state.needReadable = true;
        if (nOrig !== n && state.ended)
          endReadable(this);
      }
      if (ret !== null && !state.errorEmitted && !state.closeEmitted) {
        state.dataEmitted = true;
        this.emit("data", ret);
      }
      return ret;
    };
    function onEofChunk(stream, state) {
      debug("onEofChunk");
      if (state.ended)
        return;
      if (state.decoder) {
        const chunk = state.decoder.end();
        if (chunk && chunk.length) {
          state.buffer.push(chunk);
          state.length += state.objectMode ? 1 : chunk.length;
        }
      }
      state.ended = true;
      if (state.sync) {
        emitReadable(stream);
      } else {
        state.needReadable = false;
        state.emittedReadable = true;
        emitReadable_(stream);
      }
    }
    function emitReadable(stream) {
      const state = stream._readableState;
      debug("emitReadable", state.needReadable, state.emittedReadable);
      state.needReadable = false;
      if (!state.emittedReadable) {
        debug("emitReadable", state.flowing);
        state.emittedReadable = true;
        process2.nextTick(emitReadable_, stream);
      }
    }
    function emitReadable_(stream) {
      const state = stream._readableState;
      debug("emitReadable_", state.destroyed, state.length, state.ended);
      if (!state.destroyed && !state.errored && (state.length || state.ended)) {
        stream.emit("readable");
        state.emittedReadable = false;
      }
      state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
      flow(stream);
    }
    function maybeReadMore(stream, state) {
      if (!state.readingMore && state.constructed) {
        state.readingMore = true;
        process2.nextTick(maybeReadMore_, stream, state);
      }
    }
    function maybeReadMore_(stream, state) {
      while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
        const len = state.length;
        debug("maybeReadMore read 0");
        stream.read(0);
        if (len === state.length)
          break;
      }
      state.readingMore = false;
    }
    Readable2.prototype._read = function(n) {
      throw new ERR_METHOD_NOT_IMPLEMENTED("_read()");
    };
    Readable2.prototype.pipe = function(dest, pipeOpts) {
      const src = this;
      const state = this._readableState;
      if (state.pipes.length === 1) {
        if (!state.multiAwaitDrain) {
          state.multiAwaitDrain = true;
          state.awaitDrainWriters = new SafeSet(state.awaitDrainWriters ? [state.awaitDrainWriters] : []);
        }
      }
      state.pipes.push(dest);
      debug("pipe count=%d opts=%j", state.pipes.length, pipeOpts);
      const doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process2.stdout && dest !== process2.stderr;
      const endFn = doEnd ? onend : unpipe;
      if (state.endEmitted)
        process2.nextTick(endFn);
      else
        src.once("end", endFn);
      dest.on("unpipe", onunpipe);
      function onunpipe(readable, unpipeInfo) {
        debug("onunpipe");
        if (readable === src) {
          if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
            unpipeInfo.hasUnpiped = true;
            cleanup();
          }
        }
      }
      function onend() {
        debug("onend");
        dest.end();
      }
      let ondrain;
      let cleanedUp = false;
      function cleanup() {
        debug("cleanup");
        dest.removeListener("close", onclose);
        dest.removeListener("finish", onfinish);
        if (ondrain) {
          dest.removeListener("drain", ondrain);
        }
        dest.removeListener("error", onerror);
        dest.removeListener("unpipe", onunpipe);
        src.removeListener("end", onend);
        src.removeListener("end", unpipe);
        src.removeListener("data", ondata);
        cleanedUp = true;
        if (ondrain && state.awaitDrainWriters && (!dest._writableState || dest._writableState.needDrain))
          ondrain();
      }
      function pause() {
        if (!cleanedUp) {
          if (state.pipes.length === 1 && state.pipes[0] === dest) {
            debug("false write response, pause", 0);
            state.awaitDrainWriters = dest;
            state.multiAwaitDrain = false;
          } else if (state.pipes.length > 1 && state.pipes.includes(dest)) {
            debug("false write response, pause", state.awaitDrainWriters.size);
            state.awaitDrainWriters.add(dest);
          }
          src.pause();
        }
        if (!ondrain) {
          ondrain = pipeOnDrain(src, dest);
          dest.on("drain", ondrain);
        }
      }
      src.on("data", ondata);
      function ondata(chunk) {
        debug("ondata");
        const ret = dest.write(chunk);
        debug("dest.write", ret);
        if (ret === false) {
          pause();
        }
      }
      function onerror(er) {
        debug("onerror", er);
        unpipe();
        dest.removeListener("error", onerror);
        if (dest.listenerCount("error") === 0) {
          const s = dest._writableState || dest._readableState;
          if (s && !s.errorEmitted) {
            errorOrDestroy(dest, er);
          } else {
            dest.emit("error", er);
          }
        }
      }
      prependListener(dest, "error", onerror);
      function onclose() {
        dest.removeListener("finish", onfinish);
        unpipe();
      }
      dest.once("close", onclose);
      function onfinish() {
        debug("onfinish");
        dest.removeListener("close", onclose);
        unpipe();
      }
      dest.once("finish", onfinish);
      function unpipe() {
        debug("unpipe");
        src.unpipe(dest);
      }
      dest.emit("pipe", src);
      if (dest.writableNeedDrain === true) {
        if (state.flowing) {
          pause();
        }
      } else if (!state.flowing) {
        debug("pipe resume");
        src.resume();
      }
      return dest;
    };
    function pipeOnDrain(src, dest) {
      return function pipeOnDrainFunctionResult() {
        const state = src._readableState;
        if (state.awaitDrainWriters === dest) {
          debug("pipeOnDrain", 1);
          state.awaitDrainWriters = null;
        } else if (state.multiAwaitDrain) {
          debug("pipeOnDrain", state.awaitDrainWriters.size);
          state.awaitDrainWriters.delete(dest);
        }
        if ((!state.awaitDrainWriters || state.awaitDrainWriters.size === 0) && src.listenerCount("data")) {
          src.resume();
        }
      };
    }
    Readable2.prototype.unpipe = function(dest) {
      const state = this._readableState;
      const unpipeInfo = {
        hasUnpiped: false
      };
      if (state.pipes.length === 0)
        return this;
      if (!dest) {
        const dests = state.pipes;
        state.pipes = [];
        this.pause();
        for (let i = 0; i < dests.length; i++)
          dests[i].emit("unpipe", this, {
            hasUnpiped: false
          });
        return this;
      }
      const index = ArrayPrototypeIndexOf(state.pipes, dest);
      if (index === -1)
        return this;
      state.pipes.splice(index, 1);
      if (state.pipes.length === 0)
        this.pause();
      dest.emit("unpipe", this, unpipeInfo);
      return this;
    };
    Readable2.prototype.on = function(ev, fn) {
      const res = Stream.prototype.on.call(this, ev, fn);
      const state = this._readableState;
      if (ev === "data") {
        state.readableListening = this.listenerCount("readable") > 0;
        if (state.flowing !== false)
          this.resume();
      } else if (ev === "readable") {
        if (!state.endEmitted && !state.readableListening) {
          state.readableListening = state.needReadable = true;
          state.flowing = false;
          state.emittedReadable = false;
          debug("on readable", state.length, state.reading);
          if (state.length) {
            emitReadable(this);
          } else if (!state.reading) {
            process2.nextTick(nReadingNextTick, this);
          }
        }
      }
      return res;
    };
    Readable2.prototype.addListener = Readable2.prototype.on;
    Readable2.prototype.removeListener = function(ev, fn) {
      const res = Stream.prototype.removeListener.call(this, ev, fn);
      if (ev === "readable") {
        process2.nextTick(updateReadableListening, this);
      }
      return res;
    };
    Readable2.prototype.off = Readable2.prototype.removeListener;
    Readable2.prototype.removeAllListeners = function(ev) {
      const res = Stream.prototype.removeAllListeners.apply(this, arguments);
      if (ev === "readable" || ev === void 0) {
        process2.nextTick(updateReadableListening, this);
      }
      return res;
    };
    function updateReadableListening(self) {
      const state = self._readableState;
      state.readableListening = self.listenerCount("readable") > 0;
      if (state.resumeScheduled && state[kPaused] === false) {
        state.flowing = true;
      } else if (self.listenerCount("data") > 0) {
        self.resume();
      } else if (!state.readableListening) {
        state.flowing = null;
      }
    }
    function nReadingNextTick(self) {
      debug("readable nexttick read 0");
      self.read(0);
    }
    Readable2.prototype.resume = function() {
      const state = this._readableState;
      if (!state.flowing) {
        debug("resume");
        state.flowing = !state.readableListening;
        resume(this, state);
      }
      state[kPaused] = false;
      return this;
    };
    function resume(stream, state) {
      if (!state.resumeScheduled) {
        state.resumeScheduled = true;
        process2.nextTick(resume_, stream, state);
      }
    }
    function resume_(stream, state) {
      debug("resume", state.reading);
      if (!state.reading) {
        stream.read(0);
      }
      state.resumeScheduled = false;
      stream.emit("resume");
      flow(stream);
      if (state.flowing && !state.reading)
        stream.read(0);
    }
    Readable2.prototype.pause = function() {
      debug("call pause flowing=%j", this._readableState.flowing);
      if (this._readableState.flowing !== false) {
        debug("pause");
        this._readableState.flowing = false;
        this.emit("pause");
      }
      this._readableState[kPaused] = true;
      return this;
    };
    function flow(stream) {
      const state = stream._readableState;
      debug("flow", state.flowing);
      while (state.flowing && stream.read() !== null)
        ;
    }
    Readable2.prototype.wrap = function(stream) {
      let paused = false;
      stream.on("data", (chunk) => {
        if (!this.push(chunk) && stream.pause) {
          paused = true;
          stream.pause();
        }
      });
      stream.on("end", () => {
        this.push(null);
      });
      stream.on("error", (err) => {
        errorOrDestroy(this, err);
      });
      stream.on("close", () => {
        this.destroy();
      });
      stream.on("destroy", () => {
        this.destroy();
      });
      this._read = () => {
        if (paused && stream.resume) {
          paused = false;
          stream.resume();
        }
      };
      const streamKeys = ObjectKeys(stream);
      for (let j = 1; j < streamKeys.length; j++) {
        const i = streamKeys[j];
        if (this[i] === void 0 && typeof stream[i] === "function") {
          this[i] = stream[i].bind(stream);
        }
      }
      return this;
    };
    Readable2.prototype[SymbolAsyncIterator] = function() {
      return streamToAsyncIterator(this);
    };
    Readable2.prototype.iterator = function(options) {
      if (options !== void 0) {
        validateObject(options, "options");
      }
      return streamToAsyncIterator(this, options);
    };
    function streamToAsyncIterator(stream, options) {
      if (typeof stream.read !== "function") {
        stream = Readable2.wrap(stream, {
          objectMode: true
        });
      }
      const iter = createAsyncIterator(stream, options);
      iter.stream = stream;
      return iter;
    }
    async function* createAsyncIterator(stream, options) {
      let callback = nop;
      function next(resolve) {
        if (this === stream) {
          callback();
          callback = nop;
        } else {
          callback = resolve;
        }
      }
      stream.on("readable", next);
      let error;
      const cleanup = eos(
        stream,
        {
          writable: false
        },
        (err) => {
          error = err ? aggregateTwoErrors(error, err) : null;
          callback();
          callback = nop;
        }
      );
      try {
        while (true) {
          const chunk = stream.destroyed ? null : stream.read();
          if (chunk !== null) {
            yield chunk;
          } else if (error) {
            throw error;
          } else if (error === null) {
            return;
          } else {
            await new Promise2(next);
          }
        }
      } catch (err) {
        error = aggregateTwoErrors(error, err);
        throw error;
      } finally {
        if ((error || (options === null || options === void 0 ? void 0 : options.destroyOnReturn) !== false) && (error === void 0 || stream._readableState.autoDestroy)) {
          destroyImpl.destroyer(stream, null);
        } else {
          stream.off("readable", next);
          cleanup();
        }
      }
    }
    ObjectDefineProperties(Readable2.prototype, {
      readable: {
        __proto__: null,
        get() {
          const r = this._readableState;
          return !!r && r.readable !== false && !r.destroyed && !r.errorEmitted && !r.endEmitted;
        },
        set(val) {
          if (this._readableState) {
            this._readableState.readable = !!val;
          }
        }
      },
      readableDidRead: {
        __proto__: null,
        enumerable: false,
        get: function() {
          return this._readableState.dataEmitted;
        }
      },
      readableAborted: {
        __proto__: null,
        enumerable: false,
        get: function() {
          return !!(this._readableState.readable !== false && (this._readableState.destroyed || this._readableState.errored) && !this._readableState.endEmitted);
        }
      },
      readableHighWaterMark: {
        __proto__: null,
        enumerable: false,
        get: function() {
          return this._readableState.highWaterMark;
        }
      },
      readableBuffer: {
        __proto__: null,
        enumerable: false,
        get: function() {
          return this._readableState && this._readableState.buffer;
        }
      },
      readableFlowing: {
        __proto__: null,
        enumerable: false,
        get: function() {
          return this._readableState.flowing;
        },
        set: function(state) {
          if (this._readableState) {
            this._readableState.flowing = state;
          }
        }
      },
      readableLength: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._readableState.length;
        }
      },
      readableObjectMode: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._readableState ? this._readableState.objectMode : false;
        }
      },
      readableEncoding: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._readableState ? this._readableState.encoding : null;
        }
      },
      errored: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._readableState ? this._readableState.errored : null;
        }
      },
      closed: {
        __proto__: null,
        get() {
          return this._readableState ? this._readableState.closed : false;
        }
      },
      destroyed: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._readableState ? this._readableState.destroyed : false;
        },
        set(value) {
          if (!this._readableState) {
            return;
          }
          this._readableState.destroyed = value;
        }
      },
      readableEnded: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._readableState ? this._readableState.endEmitted : false;
        }
      }
    });
    ObjectDefineProperties(ReadableState.prototype, {
      // Legacy getter for `pipesCount`.
      pipesCount: {
        __proto__: null,
        get() {
          return this.pipes.length;
        }
      },
      // Legacy property for `paused`.
      paused: {
        __proto__: null,
        get() {
          return this[kPaused] !== false;
        },
        set(value) {
          this[kPaused] = !!value;
        }
      }
    });
    Readable2._fromList = fromList;
    function fromList(n, state) {
      if (state.length === 0)
        return null;
      let ret;
      if (state.objectMode)
        ret = state.buffer.shift();
      else if (!n || n >= state.length) {
        if (state.decoder)
          ret = state.buffer.join("");
        else if (state.buffer.length === 1)
          ret = state.buffer.first();
        else
          ret = state.buffer.concat(state.length);
        state.buffer.clear();
      } else {
        ret = state.buffer.consume(n, state.decoder);
      }
      return ret;
    }
    function endReadable(stream) {
      const state = stream._readableState;
      debug("endReadable", state.endEmitted);
      if (!state.endEmitted) {
        state.ended = true;
        process2.nextTick(endReadableNT, state, stream);
      }
    }
    function endReadableNT(state, stream) {
      debug("endReadableNT", state.endEmitted, state.length);
      if (!state.errored && !state.closeEmitted && !state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.emit("end");
        if (stream.writable && stream.allowHalfOpen === false) {
          process2.nextTick(endWritableNT, stream);
        } else if (state.autoDestroy) {
          const wState = stream._writableState;
          const autoDestroy = !wState || wState.autoDestroy && // We don't expect the writable to ever 'finish'
          // if writable is explicitly set to false.
          (wState.finished || wState.writable === false);
          if (autoDestroy) {
            stream.destroy();
          }
        }
      }
    }
    function endWritableNT(stream) {
      const writable = stream.writable && !stream.writableEnded && !stream.destroyed;
      if (writable) {
        stream.end();
      }
    }
    Readable2.from = function(iterable, opts) {
      return from(Readable2, iterable, opts);
    };
    var webStreamsAdapters;
    function lazyWebStreams() {
      if (webStreamsAdapters === void 0)
        webStreamsAdapters = {};
      return webStreamsAdapters;
    }
    Readable2.fromWeb = function(readableStream, options) {
      return lazyWebStreams().newStreamReadableFromReadableStream(readableStream, options);
    };
    Readable2.toWeb = function(streamReadable, options) {
      return lazyWebStreams().newReadableStreamFromStreamReadable(streamReadable, options);
    };
    Readable2.wrap = function(src, options) {
      var _ref, _src$readableObjectMo;
      return new Readable2({
        objectMode: (_ref = (_src$readableObjectMo = src.readableObjectMode) !== null && _src$readableObjectMo !== void 0 ? _src$readableObjectMo : src.objectMode) !== null && _ref !== void 0 ? _ref : true,
        ...options,
        destroy(err, callback) {
          destroyImpl.destroyer(src, err);
          callback(err);
        }
      }).wrap(src);
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/writable.js
var require_writable = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/writable.js"(exports, module2) {
    var process2 = require_process();
    var {
      ArrayPrototypeSlice,
      Error: Error2,
      FunctionPrototypeSymbolHasInstance,
      ObjectDefineProperty,
      ObjectDefineProperties,
      ObjectSetPrototypeOf,
      StringPrototypeToLowerCase,
      Symbol: Symbol2,
      SymbolHasInstance
    } = require_primordials();
    module2.exports = Writable;
    Writable.WritableState = WritableState;
    var { EventEmitter: EE } = require("events");
    var Stream = require_legacy().Stream;
    var { Buffer: Buffer2 } = require("buffer");
    var destroyImpl = require_destroy();
    var { addAbortSignal } = require_add_abort_signal();
    var { getHighWaterMark, getDefaultHighWaterMark } = require_state();
    var {
      ERR_INVALID_ARG_TYPE,
      ERR_METHOD_NOT_IMPLEMENTED,
      ERR_MULTIPLE_CALLBACK,
      ERR_STREAM_CANNOT_PIPE,
      ERR_STREAM_DESTROYED,
      ERR_STREAM_ALREADY_FINISHED,
      ERR_STREAM_NULL_VALUES,
      ERR_STREAM_WRITE_AFTER_END,
      ERR_UNKNOWN_ENCODING
    } = require_errors().codes;
    var { errorOrDestroy } = destroyImpl;
    ObjectSetPrototypeOf(Writable.prototype, Stream.prototype);
    ObjectSetPrototypeOf(Writable, Stream);
    function nop() {
    }
    var kOnFinished = Symbol2("kOnFinished");
    function WritableState(options, stream, isDuplex) {
      if (typeof isDuplex !== "boolean")
        isDuplex = stream instanceof require_duplex();
      this.objectMode = !!(options && options.objectMode);
      if (isDuplex)
        this.objectMode = this.objectMode || !!(options && options.writableObjectMode);
      this.highWaterMark = options ? getHighWaterMark(this, options, "writableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
      this.finalCalled = false;
      this.needDrain = false;
      this.ending = false;
      this.ended = false;
      this.finished = false;
      this.destroyed = false;
      const noDecode = !!(options && options.decodeStrings === false);
      this.decodeStrings = !noDecode;
      this.defaultEncoding = options && options.defaultEncoding || "utf8";
      this.length = 0;
      this.writing = false;
      this.corked = 0;
      this.sync = true;
      this.bufferProcessing = false;
      this.onwrite = onwrite.bind(void 0, stream);
      this.writecb = null;
      this.writelen = 0;
      this.afterWriteTickInfo = null;
      resetBuffer(this);
      this.pendingcb = 0;
      this.constructed = true;
      this.prefinished = false;
      this.errorEmitted = false;
      this.emitClose = !options || options.emitClose !== false;
      this.autoDestroy = !options || options.autoDestroy !== false;
      this.errored = null;
      this.closed = false;
      this.closeEmitted = false;
      this[kOnFinished] = [];
    }
    function resetBuffer(state) {
      state.buffered = [];
      state.bufferedIndex = 0;
      state.allBuffers = true;
      state.allNoop = true;
    }
    WritableState.prototype.getBuffer = function getBuffer() {
      return ArrayPrototypeSlice(this.buffered, this.bufferedIndex);
    };
    ObjectDefineProperty(WritableState.prototype, "bufferedRequestCount", {
      __proto__: null,
      get() {
        return this.buffered.length - this.bufferedIndex;
      }
    });
    function Writable(options) {
      const isDuplex = this instanceof require_duplex();
      if (!isDuplex && !FunctionPrototypeSymbolHasInstance(Writable, this))
        return new Writable(options);
      this._writableState = new WritableState(options, this, isDuplex);
      if (options) {
        if (typeof options.write === "function")
          this._write = options.write;
        if (typeof options.writev === "function")
          this._writev = options.writev;
        if (typeof options.destroy === "function")
          this._destroy = options.destroy;
        if (typeof options.final === "function")
          this._final = options.final;
        if (typeof options.construct === "function")
          this._construct = options.construct;
        if (options.signal)
          addAbortSignal(options.signal, this);
      }
      Stream.call(this, options);
      destroyImpl.construct(this, () => {
        const state = this._writableState;
        if (!state.writing) {
          clearBuffer(this, state);
        }
        finishMaybe(this, state);
      });
    }
    ObjectDefineProperty(Writable, SymbolHasInstance, {
      __proto__: null,
      value: function(object) {
        if (FunctionPrototypeSymbolHasInstance(this, object))
          return true;
        if (this !== Writable)
          return false;
        return object && object._writableState instanceof WritableState;
      }
    });
    Writable.prototype.pipe = function() {
      errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
    };
    function _write(stream, chunk, encoding, cb) {
      const state = stream._writableState;
      if (typeof encoding === "function") {
        cb = encoding;
        encoding = state.defaultEncoding;
      } else {
        if (!encoding)
          encoding = state.defaultEncoding;
        else if (encoding !== "buffer" && !Buffer2.isEncoding(encoding))
          throw new ERR_UNKNOWN_ENCODING(encoding);
        if (typeof cb !== "function")
          cb = nop;
      }
      if (chunk === null) {
        throw new ERR_STREAM_NULL_VALUES();
      } else if (!state.objectMode) {
        if (typeof chunk === "string") {
          if (state.decodeStrings !== false) {
            chunk = Buffer2.from(chunk, encoding);
            encoding = "buffer";
          }
        } else if (chunk instanceof Buffer2) {
          encoding = "buffer";
        } else if (Stream._isUint8Array(chunk)) {
          chunk = Stream._uint8ArrayToBuffer(chunk);
          encoding = "buffer";
        } else {
          throw new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "Uint8Array"], chunk);
        }
      }
      let err;
      if (state.ending) {
        err = new ERR_STREAM_WRITE_AFTER_END();
      } else if (state.destroyed) {
        err = new ERR_STREAM_DESTROYED("write");
      }
      if (err) {
        process2.nextTick(cb, err);
        errorOrDestroy(stream, err, true);
        return err;
      }
      state.pendingcb++;
      return writeOrBuffer(stream, state, chunk, encoding, cb);
    }
    Writable.prototype.write = function(chunk, encoding, cb) {
      return _write(this, chunk, encoding, cb) === true;
    };
    Writable.prototype.cork = function() {
      this._writableState.corked++;
    };
    Writable.prototype.uncork = function() {
      const state = this._writableState;
      if (state.corked) {
        state.corked--;
        if (!state.writing)
          clearBuffer(this, state);
      }
    };
    Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
      if (typeof encoding === "string")
        encoding = StringPrototypeToLowerCase(encoding);
      if (!Buffer2.isEncoding(encoding))
        throw new ERR_UNKNOWN_ENCODING(encoding);
      this._writableState.defaultEncoding = encoding;
      return this;
    };
    function writeOrBuffer(stream, state, chunk, encoding, callback) {
      const len = state.objectMode ? 1 : chunk.length;
      state.length += len;
      const ret = state.length < state.highWaterMark;
      if (!ret)
        state.needDrain = true;
      if (state.writing || state.corked || state.errored || !state.constructed) {
        state.buffered.push({
          chunk,
          encoding,
          callback
        });
        if (state.allBuffers && encoding !== "buffer") {
          state.allBuffers = false;
        }
        if (state.allNoop && callback !== nop) {
          state.allNoop = false;
        }
      } else {
        state.writelen = len;
        state.writecb = callback;
        state.writing = true;
        state.sync = true;
        stream._write(chunk, encoding, state.onwrite);
        state.sync = false;
      }
      return ret && !state.errored && !state.destroyed;
    }
    function doWrite(stream, state, writev, len, chunk, encoding, cb) {
      state.writelen = len;
      state.writecb = cb;
      state.writing = true;
      state.sync = true;
      if (state.destroyed)
        state.onwrite(new ERR_STREAM_DESTROYED("write"));
      else if (writev)
        stream._writev(chunk, state.onwrite);
      else
        stream._write(chunk, encoding, state.onwrite);
      state.sync = false;
    }
    function onwriteError(stream, state, er, cb) {
      --state.pendingcb;
      cb(er);
      errorBuffer(state);
      errorOrDestroy(stream, er);
    }
    function onwrite(stream, er) {
      const state = stream._writableState;
      const sync = state.sync;
      const cb = state.writecb;
      if (typeof cb !== "function") {
        errorOrDestroy(stream, new ERR_MULTIPLE_CALLBACK());
        return;
      }
      state.writing = false;
      state.writecb = null;
      state.length -= state.writelen;
      state.writelen = 0;
      if (er) {
        er.stack;
        if (!state.errored) {
          state.errored = er;
        }
        if (stream._readableState && !stream._readableState.errored) {
          stream._readableState.errored = er;
        }
        if (sync) {
          process2.nextTick(onwriteError, stream, state, er, cb);
        } else {
          onwriteError(stream, state, er, cb);
        }
      } else {
        if (state.buffered.length > state.bufferedIndex) {
          clearBuffer(stream, state);
        }
        if (sync) {
          if (state.afterWriteTickInfo !== null && state.afterWriteTickInfo.cb === cb) {
            state.afterWriteTickInfo.count++;
          } else {
            state.afterWriteTickInfo = {
              count: 1,
              cb,
              stream,
              state
            };
            process2.nextTick(afterWriteTick, state.afterWriteTickInfo);
          }
        } else {
          afterWrite(stream, state, 1, cb);
        }
      }
    }
    function afterWriteTick({ stream, state, count, cb }) {
      state.afterWriteTickInfo = null;
      return afterWrite(stream, state, count, cb);
    }
    function afterWrite(stream, state, count, cb) {
      const needDrain = !state.ending && !stream.destroyed && state.length === 0 && state.needDrain;
      if (needDrain) {
        state.needDrain = false;
        stream.emit("drain");
      }
      while (count-- > 0) {
        state.pendingcb--;
        cb();
      }
      if (state.destroyed) {
        errorBuffer(state);
      }
      finishMaybe(stream, state);
    }
    function errorBuffer(state) {
      if (state.writing) {
        return;
      }
      for (let n = state.bufferedIndex; n < state.buffered.length; ++n) {
        var _state$errored;
        const { chunk, callback } = state.buffered[n];
        const len = state.objectMode ? 1 : chunk.length;
        state.length -= len;
        callback(
          (_state$errored = state.errored) !== null && _state$errored !== void 0 ? _state$errored : new ERR_STREAM_DESTROYED("write")
        );
      }
      const onfinishCallbacks = state[kOnFinished].splice(0);
      for (let i = 0; i < onfinishCallbacks.length; i++) {
        var _state$errored2;
        onfinishCallbacks[i](
          (_state$errored2 = state.errored) !== null && _state$errored2 !== void 0 ? _state$errored2 : new ERR_STREAM_DESTROYED("end")
        );
      }
      resetBuffer(state);
    }
    function clearBuffer(stream, state) {
      if (state.corked || state.bufferProcessing || state.destroyed || !state.constructed) {
        return;
      }
      const { buffered, bufferedIndex, objectMode } = state;
      const bufferedLength = buffered.length - bufferedIndex;
      if (!bufferedLength) {
        return;
      }
      let i = bufferedIndex;
      state.bufferProcessing = true;
      if (bufferedLength > 1 && stream._writev) {
        state.pendingcb -= bufferedLength - 1;
        const callback = state.allNoop ? nop : (err) => {
          for (let n = i; n < buffered.length; ++n) {
            buffered[n].callback(err);
          }
        };
        const chunks = state.allNoop && i === 0 ? buffered : ArrayPrototypeSlice(buffered, i);
        chunks.allBuffers = state.allBuffers;
        doWrite(stream, state, true, state.length, chunks, "", callback);
        resetBuffer(state);
      } else {
        do {
          const { chunk, encoding, callback } = buffered[i];
          buffered[i++] = null;
          const len = objectMode ? 1 : chunk.length;
          doWrite(stream, state, false, len, chunk, encoding, callback);
        } while (i < buffered.length && !state.writing);
        if (i === buffered.length) {
          resetBuffer(state);
        } else if (i > 256) {
          buffered.splice(0, i);
          state.bufferedIndex = 0;
        } else {
          state.bufferedIndex = i;
        }
      }
      state.bufferProcessing = false;
    }
    Writable.prototype._write = function(chunk, encoding, cb) {
      if (this._writev) {
        this._writev(
          [
            {
              chunk,
              encoding
            }
          ],
          cb
        );
      } else {
        throw new ERR_METHOD_NOT_IMPLEMENTED("_write()");
      }
    };
    Writable.prototype._writev = null;
    Writable.prototype.end = function(chunk, encoding, cb) {
      const state = this._writableState;
      if (typeof chunk === "function") {
        cb = chunk;
        chunk = null;
        encoding = null;
      } else if (typeof encoding === "function") {
        cb = encoding;
        encoding = null;
      }
      let err;
      if (chunk !== null && chunk !== void 0) {
        const ret = _write(this, chunk, encoding);
        if (ret instanceof Error2) {
          err = ret;
        }
      }
      if (state.corked) {
        state.corked = 1;
        this.uncork();
      }
      if (err) {
      } else if (!state.errored && !state.ending) {
        state.ending = true;
        finishMaybe(this, state, true);
        state.ended = true;
      } else if (state.finished) {
        err = new ERR_STREAM_ALREADY_FINISHED("end");
      } else if (state.destroyed) {
        err = new ERR_STREAM_DESTROYED("end");
      }
      if (typeof cb === "function") {
        if (err || state.finished) {
          process2.nextTick(cb, err);
        } else {
          state[kOnFinished].push(cb);
        }
      }
      return this;
    };
    function needFinish(state) {
      return state.ending && !state.destroyed && state.constructed && state.length === 0 && !state.errored && state.buffered.length === 0 && !state.finished && !state.writing && !state.errorEmitted && !state.closeEmitted;
    }
    function callFinal(stream, state) {
      let called = false;
      function onFinish(err) {
        if (called) {
          errorOrDestroy(stream, err !== null && err !== void 0 ? err : ERR_MULTIPLE_CALLBACK());
          return;
        }
        called = true;
        state.pendingcb--;
        if (err) {
          const onfinishCallbacks = state[kOnFinished].splice(0);
          for (let i = 0; i < onfinishCallbacks.length; i++) {
            onfinishCallbacks[i](err);
          }
          errorOrDestroy(stream, err, state.sync);
        } else if (needFinish(state)) {
          state.prefinished = true;
          stream.emit("prefinish");
          state.pendingcb++;
          process2.nextTick(finish, stream, state);
        }
      }
      state.sync = true;
      state.pendingcb++;
      try {
        stream._final(onFinish);
      } catch (err) {
        onFinish(err);
      }
      state.sync = false;
    }
    function prefinish(stream, state) {
      if (!state.prefinished && !state.finalCalled) {
        if (typeof stream._final === "function" && !state.destroyed) {
          state.finalCalled = true;
          callFinal(stream, state);
        } else {
          state.prefinished = true;
          stream.emit("prefinish");
        }
      }
    }
    function finishMaybe(stream, state, sync) {
      if (needFinish(state)) {
        prefinish(stream, state);
        if (state.pendingcb === 0) {
          if (sync) {
            state.pendingcb++;
            process2.nextTick(
              (stream2, state2) => {
                if (needFinish(state2)) {
                  finish(stream2, state2);
                } else {
                  state2.pendingcb--;
                }
              },
              stream,
              state
            );
          } else if (needFinish(state)) {
            state.pendingcb++;
            finish(stream, state);
          }
        }
      }
    }
    function finish(stream, state) {
      state.pendingcb--;
      state.finished = true;
      const onfinishCallbacks = state[kOnFinished].splice(0);
      for (let i = 0; i < onfinishCallbacks.length; i++) {
        onfinishCallbacks[i]();
      }
      stream.emit("finish");
      if (state.autoDestroy) {
        const rState = stream._readableState;
        const autoDestroy = !rState || rState.autoDestroy && // We don't expect the readable to ever 'end'
        // if readable is explicitly set to false.
        (rState.endEmitted || rState.readable === false);
        if (autoDestroy) {
          stream.destroy();
        }
      }
    }
    ObjectDefineProperties(Writable.prototype, {
      closed: {
        __proto__: null,
        get() {
          return this._writableState ? this._writableState.closed : false;
        }
      },
      destroyed: {
        __proto__: null,
        get() {
          return this._writableState ? this._writableState.destroyed : false;
        },
        set(value) {
          if (this._writableState) {
            this._writableState.destroyed = value;
          }
        }
      },
      writable: {
        __proto__: null,
        get() {
          const w = this._writableState;
          return !!w && w.writable !== false && !w.destroyed && !w.errored && !w.ending && !w.ended;
        },
        set(val) {
          if (this._writableState) {
            this._writableState.writable = !!val;
          }
        }
      },
      writableFinished: {
        __proto__: null,
        get() {
          return this._writableState ? this._writableState.finished : false;
        }
      },
      writableObjectMode: {
        __proto__: null,
        get() {
          return this._writableState ? this._writableState.objectMode : false;
        }
      },
      writableBuffer: {
        __proto__: null,
        get() {
          return this._writableState && this._writableState.getBuffer();
        }
      },
      writableEnded: {
        __proto__: null,
        get() {
          return this._writableState ? this._writableState.ending : false;
        }
      },
      writableNeedDrain: {
        __proto__: null,
        get() {
          const wState = this._writableState;
          if (!wState)
            return false;
          return !wState.destroyed && !wState.ending && wState.needDrain;
        }
      },
      writableHighWaterMark: {
        __proto__: null,
        get() {
          return this._writableState && this._writableState.highWaterMark;
        }
      },
      writableCorked: {
        __proto__: null,
        get() {
          return this._writableState ? this._writableState.corked : 0;
        }
      },
      writableLength: {
        __proto__: null,
        get() {
          return this._writableState && this._writableState.length;
        }
      },
      errored: {
        __proto__: null,
        enumerable: false,
        get() {
          return this._writableState ? this._writableState.errored : null;
        }
      },
      writableAborted: {
        __proto__: null,
        enumerable: false,
        get: function() {
          return !!(this._writableState.writable !== false && (this._writableState.destroyed || this._writableState.errored) && !this._writableState.finished);
        }
      }
    });
    var destroy = destroyImpl.destroy;
    Writable.prototype.destroy = function(err, cb) {
      const state = this._writableState;
      if (!state.destroyed && (state.bufferedIndex < state.buffered.length || state[kOnFinished].length)) {
        process2.nextTick(errorBuffer, state);
      }
      destroy.call(this, err, cb);
      return this;
    };
    Writable.prototype._undestroy = destroyImpl.undestroy;
    Writable.prototype._destroy = function(err, cb) {
      cb(err);
    };
    Writable.prototype[EE.captureRejectionSymbol] = function(err) {
      this.destroy(err);
    };
    var webStreamsAdapters;
    function lazyWebStreams() {
      if (webStreamsAdapters === void 0)
        webStreamsAdapters = {};
      return webStreamsAdapters;
    }
    Writable.fromWeb = function(writableStream, options) {
      return lazyWebStreams().newStreamWritableFromWritableStream(writableStream, options);
    };
    Writable.toWeb = function(streamWritable) {
      return lazyWebStreams().newWritableStreamFromStreamWritable(streamWritable);
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/duplexify.js
var require_duplexify = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/duplexify.js"(exports, module2) {
    var process2 = require_process();
    var bufferModule = require("buffer");
    var {
      isReadable,
      isWritable,
      isIterable,
      isNodeStream,
      isReadableNodeStream,
      isWritableNodeStream,
      isDuplexNodeStream
    } = require_utils();
    var eos = require_end_of_stream();
    var {
      AbortError,
      codes: { ERR_INVALID_ARG_TYPE, ERR_INVALID_RETURN_VALUE }
    } = require_errors();
    var { destroyer } = require_destroy();
    var Duplex = require_duplex();
    var Readable2 = require_readable();
    var { createDeferredPromise } = require_util();
    var from = require_from();
    var Blob = globalThis.Blob || bufferModule.Blob;
    var isBlob = typeof Blob !== "undefined" ? function isBlob2(b) {
      return b instanceof Blob;
    } : function isBlob2(b) {
      return false;
    };
    var AbortController = globalThis.AbortController || require_abort_controller().AbortController;
    var { FunctionPrototypeCall } = require_primordials();
    var Duplexify = class extends Duplex {
      constructor(options) {
        super(options);
        if ((options === null || options === void 0 ? void 0 : options.readable) === false) {
          this._readableState.readable = false;
          this._readableState.ended = true;
          this._readableState.endEmitted = true;
        }
        if ((options === null || options === void 0 ? void 0 : options.writable) === false) {
          this._writableState.writable = false;
          this._writableState.ending = true;
          this._writableState.ended = true;
          this._writableState.finished = true;
        }
      }
    };
    module2.exports = function duplexify(body, name) {
      if (isDuplexNodeStream(body)) {
        return body;
      }
      if (isReadableNodeStream(body)) {
        return _duplexify({
          readable: body
        });
      }
      if (isWritableNodeStream(body)) {
        return _duplexify({
          writable: body
        });
      }
      if (isNodeStream(body)) {
        return _duplexify({
          writable: false,
          readable: false
        });
      }
      if (typeof body === "function") {
        const { value, write, final, destroy } = fromAsyncGen(body);
        if (isIterable(value)) {
          return from(Duplexify, value, {
            // TODO (ronag): highWaterMark?
            objectMode: true,
            write,
            final,
            destroy
          });
        }
        const then2 = value === null || value === void 0 ? void 0 : value.then;
        if (typeof then2 === "function") {
          let d;
          const promise = FunctionPrototypeCall(
            then2,
            value,
            (val) => {
              if (val != null) {
                throw new ERR_INVALID_RETURN_VALUE("nully", "body", val);
              }
            },
            (err) => {
              destroyer(d, err);
            }
          );
          return d = new Duplexify({
            // TODO (ronag): highWaterMark?
            objectMode: true,
            readable: false,
            write,
            final(cb) {
              final(async () => {
                try {
                  await promise;
                  process2.nextTick(cb, null);
                } catch (err) {
                  process2.nextTick(cb, err);
                }
              });
            },
            destroy
          });
        }
        throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or AsyncFunction", name, value);
      }
      if (isBlob(body)) {
        return duplexify(body.arrayBuffer());
      }
      if (isIterable(body)) {
        return from(Duplexify, body, {
          // TODO (ronag): highWaterMark?
          objectMode: true,
          writable: false
        });
      }
      if (typeof (body === null || body === void 0 ? void 0 : body.writable) === "object" || typeof (body === null || body === void 0 ? void 0 : body.readable) === "object") {
        const readable = body !== null && body !== void 0 && body.readable ? isReadableNodeStream(body === null || body === void 0 ? void 0 : body.readable) ? body === null || body === void 0 ? void 0 : body.readable : duplexify(body.readable) : void 0;
        const writable = body !== null && body !== void 0 && body.writable ? isWritableNodeStream(body === null || body === void 0 ? void 0 : body.writable) ? body === null || body === void 0 ? void 0 : body.writable : duplexify(body.writable) : void 0;
        return _duplexify({
          readable,
          writable
        });
      }
      const then = body === null || body === void 0 ? void 0 : body.then;
      if (typeof then === "function") {
        let d;
        FunctionPrototypeCall(
          then,
          body,
          (val) => {
            if (val != null) {
              d.push(val);
            }
            d.push(null);
          },
          (err) => {
            destroyer(d, err);
          }
        );
        return d = new Duplexify({
          objectMode: true,
          writable: false,
          read() {
          }
        });
      }
      throw new ERR_INVALID_ARG_TYPE(
        name,
        [
          "Blob",
          "ReadableStream",
          "WritableStream",
          "Stream",
          "Iterable",
          "AsyncIterable",
          "Function",
          "{ readable, writable } pair",
          "Promise"
        ],
        body
      );
    };
    function fromAsyncGen(fn) {
      let { promise, resolve } = createDeferredPromise();
      const ac = new AbortController();
      const signal = ac.signal;
      const value = fn(
        async function* () {
          while (true) {
            const _promise = promise;
            promise = null;
            const { chunk, done, cb } = await _promise;
            process2.nextTick(cb);
            if (done)
              return;
            if (signal.aborted)
              throw new AbortError(void 0, {
                cause: signal.reason
              });
            ({ promise, resolve } = createDeferredPromise());
            yield chunk;
          }
        }(),
        {
          signal
        }
      );
      return {
        value,
        write(chunk, encoding, cb) {
          const _resolve = resolve;
          resolve = null;
          _resolve({
            chunk,
            done: false,
            cb
          });
        },
        final(cb) {
          const _resolve = resolve;
          resolve = null;
          _resolve({
            done: true,
            cb
          });
        },
        destroy(err, cb) {
          ac.abort();
          cb(err);
        }
      };
    }
    function _duplexify(pair) {
      const r = pair.readable && typeof pair.readable.read !== "function" ? Readable2.wrap(pair.readable) : pair.readable;
      const w = pair.writable;
      let readable = !!isReadable(r);
      let writable = !!isWritable(w);
      let ondrain;
      let onfinish;
      let onreadable;
      let onclose;
      let d;
      function onfinished(err) {
        const cb = onclose;
        onclose = null;
        if (cb) {
          cb(err);
        } else if (err) {
          d.destroy(err);
        }
      }
      d = new Duplexify({
        // TODO (ronag): highWaterMark?
        readableObjectMode: !!(r !== null && r !== void 0 && r.readableObjectMode),
        writableObjectMode: !!(w !== null && w !== void 0 && w.writableObjectMode),
        readable,
        writable
      });
      if (writable) {
        eos(w, (err) => {
          writable = false;
          if (err) {
            destroyer(r, err);
          }
          onfinished(err);
        });
        d._write = function(chunk, encoding, callback) {
          if (w.write(chunk, encoding)) {
            callback();
          } else {
            ondrain = callback;
          }
        };
        d._final = function(callback) {
          w.end();
          onfinish = callback;
        };
        w.on("drain", function() {
          if (ondrain) {
            const cb = ondrain;
            ondrain = null;
            cb();
          }
        });
        w.on("finish", function() {
          if (onfinish) {
            const cb = onfinish;
            onfinish = null;
            cb();
          }
        });
      }
      if (readable) {
        eos(r, (err) => {
          readable = false;
          if (err) {
            destroyer(r, err);
          }
          onfinished(err);
        });
        r.on("readable", function() {
          if (onreadable) {
            const cb = onreadable;
            onreadable = null;
            cb();
          }
        });
        r.on("end", function() {
          d.push(null);
        });
        d._read = function() {
          while (true) {
            const buf = r.read();
            if (buf === null) {
              onreadable = d._read;
              return;
            }
            if (!d.push(buf)) {
              return;
            }
          }
        };
      }
      d._destroy = function(err, callback) {
        if (!err && onclose !== null) {
          err = new AbortError();
        }
        onreadable = null;
        ondrain = null;
        onfinish = null;
        if (onclose === null) {
          callback(err);
        } else {
          onclose = callback;
          destroyer(w, err);
          destroyer(r, err);
        }
      };
      return d;
    }
  }
});

// node_modules/readable-stream/lib/internal/streams/duplex.js
var require_duplex = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/duplex.js"(exports, module2) {
    "use strict";
    var {
      ObjectDefineProperties,
      ObjectGetOwnPropertyDescriptor,
      ObjectKeys,
      ObjectSetPrototypeOf
    } = require_primordials();
    module2.exports = Duplex;
    var Readable2 = require_readable();
    var Writable = require_writable();
    ObjectSetPrototypeOf(Duplex.prototype, Readable2.prototype);
    ObjectSetPrototypeOf(Duplex, Readable2);
    {
      const keys = ObjectKeys(Writable.prototype);
      for (let i = 0; i < keys.length; i++) {
        const method = keys[i];
        if (!Duplex.prototype[method])
          Duplex.prototype[method] = Writable.prototype[method];
      }
    }
    function Duplex(options) {
      if (!(this instanceof Duplex))
        return new Duplex(options);
      Readable2.call(this, options);
      Writable.call(this, options);
      if (options) {
        this.allowHalfOpen = options.allowHalfOpen !== false;
        if (options.readable === false) {
          this._readableState.readable = false;
          this._readableState.ended = true;
          this._readableState.endEmitted = true;
        }
        if (options.writable === false) {
          this._writableState.writable = false;
          this._writableState.ending = true;
          this._writableState.ended = true;
          this._writableState.finished = true;
        }
      } else {
        this.allowHalfOpen = true;
      }
    }
    ObjectDefineProperties(Duplex.prototype, {
      writable: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writable")
      },
      writableHighWaterMark: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableHighWaterMark")
      },
      writableObjectMode: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableObjectMode")
      },
      writableBuffer: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableBuffer")
      },
      writableLength: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableLength")
      },
      writableFinished: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableFinished")
      },
      writableCorked: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableCorked")
      },
      writableEnded: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableEnded")
      },
      writableNeedDrain: {
        __proto__: null,
        ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableNeedDrain")
      },
      destroyed: {
        __proto__: null,
        get() {
          if (this._readableState === void 0 || this._writableState === void 0) {
            return false;
          }
          return this._readableState.destroyed && this._writableState.destroyed;
        },
        set(value) {
          if (this._readableState && this._writableState) {
            this._readableState.destroyed = value;
            this._writableState.destroyed = value;
          }
        }
      }
    });
    var webStreamsAdapters;
    function lazyWebStreams() {
      if (webStreamsAdapters === void 0)
        webStreamsAdapters = {};
      return webStreamsAdapters;
    }
    Duplex.fromWeb = function(pair, options) {
      return lazyWebStreams().newStreamDuplexFromReadableWritablePair(pair, options);
    };
    Duplex.toWeb = function(duplex) {
      return lazyWebStreams().newReadableWritablePairFromDuplex(duplex);
    };
    var duplexify;
    Duplex.from = function(body) {
      if (!duplexify) {
        duplexify = require_duplexify();
      }
      return duplexify(body, "body");
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/transform.js
var require_transform = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/transform.js"(exports, module2) {
    "use strict";
    var { ObjectSetPrototypeOf, Symbol: Symbol2 } = require_primordials();
    module2.exports = Transform3;
    var { ERR_METHOD_NOT_IMPLEMENTED } = require_errors().codes;
    var Duplex = require_duplex();
    var { getHighWaterMark } = require_state();
    ObjectSetPrototypeOf(Transform3.prototype, Duplex.prototype);
    ObjectSetPrototypeOf(Transform3, Duplex);
    var kCallback = Symbol2("kCallback");
    function Transform3(options) {
      if (!(this instanceof Transform3))
        return new Transform3(options);
      const readableHighWaterMark = options ? getHighWaterMark(this, options, "readableHighWaterMark", true) : null;
      if (readableHighWaterMark === 0) {
        options = {
          ...options,
          highWaterMark: null,
          readableHighWaterMark,
          // TODO (ronag): 0 is not optimal since we have
          // a "bug" where we check needDrain before calling _write and not after.
          // Refs: https://github.com/nodejs/node/pull/32887
          // Refs: https://github.com/nodejs/node/pull/35941
          writableHighWaterMark: options.writableHighWaterMark || 0
        };
      }
      Duplex.call(this, options);
      this._readableState.sync = false;
      this[kCallback] = null;
      if (options) {
        if (typeof options.transform === "function")
          this._transform = options.transform;
        if (typeof options.flush === "function")
          this._flush = options.flush;
      }
      this.on("prefinish", prefinish);
    }
    function final(cb) {
      if (typeof this._flush === "function" && !this.destroyed) {
        this._flush((er, data) => {
          if (er) {
            if (cb) {
              cb(er);
            } else {
              this.destroy(er);
            }
            return;
          }
          if (data != null) {
            this.push(data);
          }
          this.push(null);
          if (cb) {
            cb();
          }
        });
      } else {
        this.push(null);
        if (cb) {
          cb();
        }
      }
    }
    function prefinish() {
      if (this._final !== final) {
        final.call(this);
      }
    }
    Transform3.prototype._final = final;
    Transform3.prototype._transform = function(chunk, encoding, callback) {
      throw new ERR_METHOD_NOT_IMPLEMENTED("_transform()");
    };
    Transform3.prototype._write = function(chunk, encoding, callback) {
      const rState = this._readableState;
      const wState = this._writableState;
      const length = rState.length;
      this._transform(chunk, encoding, (err, val) => {
        if (err) {
          callback(err);
          return;
        }
        if (val != null) {
          this.push(val);
        }
        if (wState.ended || // Backwards compat.
        length === rState.length || // Backwards compat.
        rState.length < rState.highWaterMark) {
          callback();
        } else {
          this[kCallback] = callback;
        }
      });
    };
    Transform3.prototype._read = function() {
      if (this[kCallback]) {
        const callback = this[kCallback];
        this[kCallback] = null;
        callback();
      }
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/passthrough.js
var require_passthrough = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/passthrough.js"(exports, module2) {
    "use strict";
    var { ObjectSetPrototypeOf } = require_primordials();
    module2.exports = PassThrough;
    var Transform3 = require_transform();
    ObjectSetPrototypeOf(PassThrough.prototype, Transform3.prototype);
    ObjectSetPrototypeOf(PassThrough, Transform3);
    function PassThrough(options) {
      if (!(this instanceof PassThrough))
        return new PassThrough(options);
      Transform3.call(this, options);
    }
    PassThrough.prototype._transform = function(chunk, encoding, cb) {
      cb(null, chunk);
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/pipeline.js
var require_pipeline = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/pipeline.js"(exports, module2) {
    var process2 = require_process();
    var { ArrayIsArray, Promise: Promise2, SymbolAsyncIterator } = require_primordials();
    var eos = require_end_of_stream();
    var { once } = require_util();
    var destroyImpl = require_destroy();
    var Duplex = require_duplex();
    var {
      aggregateTwoErrors,
      codes: {
        ERR_INVALID_ARG_TYPE,
        ERR_INVALID_RETURN_VALUE,
        ERR_MISSING_ARGS,
        ERR_STREAM_DESTROYED,
        ERR_STREAM_PREMATURE_CLOSE
      },
      AbortError
    } = require_errors();
    var { validateFunction, validateAbortSignal } = require_validators();
    var {
      isIterable,
      isReadable,
      isReadableNodeStream,
      isNodeStream,
      isTransformStream,
      isWebStream,
      isReadableStream,
      isReadableEnded
    } = require_utils();
    var AbortController = globalThis.AbortController || require_abort_controller().AbortController;
    var PassThrough;
    var Readable2;
    function destroyer(stream, reading, writing) {
      let finished = false;
      stream.on("close", () => {
        finished = true;
      });
      const cleanup = eos(
        stream,
        {
          readable: reading,
          writable: writing
        },
        (err) => {
          finished = !err;
        }
      );
      return {
        destroy: (err) => {
          if (finished)
            return;
          finished = true;
          destroyImpl.destroyer(stream, err || new ERR_STREAM_DESTROYED("pipe"));
        },
        cleanup
      };
    }
    function popCallback(streams) {
      validateFunction(streams[streams.length - 1], "streams[stream.length - 1]");
      return streams.pop();
    }
    function makeAsyncIterable(val) {
      if (isIterable(val)) {
        return val;
      } else if (isReadableNodeStream(val)) {
        return fromReadable(val);
      }
      throw new ERR_INVALID_ARG_TYPE("val", ["Readable", "Iterable", "AsyncIterable"], val);
    }
    async function* fromReadable(val) {
      if (!Readable2) {
        Readable2 = require_readable();
      }
      yield* Readable2.prototype[SymbolAsyncIterator].call(val);
    }
    async function pumpToNode(iterable, writable, finish, { end }) {
      let error;
      let onresolve = null;
      const resume = (err) => {
        if (err) {
          error = err;
        }
        if (onresolve) {
          const callback = onresolve;
          onresolve = null;
          callback();
        }
      };
      const wait = () => new Promise2((resolve, reject) => {
        if (error) {
          reject(error);
        } else {
          onresolve = () => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          };
        }
      });
      writable.on("drain", resume);
      const cleanup = eos(
        writable,
        {
          readable: false
        },
        resume
      );
      try {
        if (writable.writableNeedDrain) {
          await wait();
        }
        for await (const chunk of iterable) {
          if (!writable.write(chunk)) {
            await wait();
          }
        }
        if (end) {
          writable.end();
        }
        await wait();
        finish();
      } catch (err) {
        finish(error !== err ? aggregateTwoErrors(error, err) : err);
      } finally {
        cleanup();
        writable.off("drain", resume);
      }
    }
    async function pumpToWeb(readable, writable, finish, { end }) {
      if (isTransformStream(writable)) {
        writable = writable.writable;
      }
      const writer = writable.getWriter();
      try {
        for await (const chunk of readable) {
          await writer.ready;
          writer.write(chunk).catch(() => {
          });
        }
        await writer.ready;
        if (end) {
          await writer.close();
        }
        finish();
      } catch (err) {
        try {
          await writer.abort(err);
          finish(err);
        } catch (err2) {
          finish(err2);
        }
      }
    }
    function pipeline(...streams) {
      return pipelineImpl(streams, once(popCallback(streams)));
    }
    function pipelineImpl(streams, callback, opts) {
      if (streams.length === 1 && ArrayIsArray(streams[0])) {
        streams = streams[0];
      }
      if (streams.length < 2) {
        throw new ERR_MISSING_ARGS("streams");
      }
      const ac = new AbortController();
      const signal = ac.signal;
      const outerSignal = opts === null || opts === void 0 ? void 0 : opts.signal;
      const lastStreamCleanup = [];
      validateAbortSignal(outerSignal, "options.signal");
      function abort() {
        finishImpl(new AbortError());
      }
      outerSignal === null || outerSignal === void 0 ? void 0 : outerSignal.addEventListener("abort", abort);
      let error;
      let value;
      const destroys = [];
      let finishCount = 0;
      function finish(err) {
        finishImpl(err, --finishCount === 0);
      }
      function finishImpl(err, final) {
        if (err && (!error || error.code === "ERR_STREAM_PREMATURE_CLOSE")) {
          error = err;
        }
        if (!error && !final) {
          return;
        }
        while (destroys.length) {
          destroys.shift()(error);
        }
        outerSignal === null || outerSignal === void 0 ? void 0 : outerSignal.removeEventListener("abort", abort);
        ac.abort();
        if (final) {
          if (!error) {
            lastStreamCleanup.forEach((fn) => fn());
          }
          process2.nextTick(callback, error, value);
        }
      }
      let ret;
      for (let i = 0; i < streams.length; i++) {
        const stream = streams[i];
        const reading = i < streams.length - 1;
        const writing = i > 0;
        const end = reading || (opts === null || opts === void 0 ? void 0 : opts.end) !== false;
        const isLastStream = i === streams.length - 1;
        if (isNodeStream(stream)) {
          let onError2 = function(err) {
            if (err && err.name !== "AbortError" && err.code !== "ERR_STREAM_PREMATURE_CLOSE") {
              finish(err);
            }
          };
          var onError = onError2;
          if (end) {
            const { destroy, cleanup } = destroyer(stream, reading, writing);
            destroys.push(destroy);
            if (isReadable(stream) && isLastStream) {
              lastStreamCleanup.push(cleanup);
            }
          }
          stream.on("error", onError2);
          if (isReadable(stream) && isLastStream) {
            lastStreamCleanup.push(() => {
              stream.removeListener("error", onError2);
            });
          }
        }
        if (i === 0) {
          if (typeof stream === "function") {
            ret = stream({
              signal
            });
            if (!isIterable(ret)) {
              throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or Stream", "source", ret);
            }
          } else if (isIterable(stream) || isReadableNodeStream(stream) || isTransformStream(stream)) {
            ret = stream;
          } else {
            ret = Duplex.from(stream);
          }
        } else if (typeof stream === "function") {
          if (isTransformStream(ret)) {
            var _ret;
            ret = makeAsyncIterable((_ret = ret) === null || _ret === void 0 ? void 0 : _ret.readable);
          } else {
            ret = makeAsyncIterable(ret);
          }
          ret = stream(ret, {
            signal
          });
          if (reading) {
            if (!isIterable(ret, true)) {
              throw new ERR_INVALID_RETURN_VALUE("AsyncIterable", `transform[${i - 1}]`, ret);
            }
          } else {
            var _ret2;
            if (!PassThrough) {
              PassThrough = require_passthrough();
            }
            const pt = new PassThrough({
              objectMode: true
            });
            const then = (_ret2 = ret) === null || _ret2 === void 0 ? void 0 : _ret2.then;
            if (typeof then === "function") {
              finishCount++;
              then.call(
                ret,
                (val) => {
                  value = val;
                  if (val != null) {
                    pt.write(val);
                  }
                  if (end) {
                    pt.end();
                  }
                  process2.nextTick(finish);
                },
                (err) => {
                  pt.destroy(err);
                  process2.nextTick(finish, err);
                }
              );
            } else if (isIterable(ret, true)) {
              finishCount++;
              pumpToNode(ret, pt, finish, {
                end
              });
            } else if (isReadableStream(ret) || isTransformStream(ret)) {
              const toRead = ret.readable || ret;
              finishCount++;
              pumpToNode(toRead, pt, finish, {
                end
              });
            } else {
              throw new ERR_INVALID_RETURN_VALUE("AsyncIterable or Promise", "destination", ret);
            }
            ret = pt;
            const { destroy, cleanup } = destroyer(ret, false, true);
            destroys.push(destroy);
            if (isLastStream) {
              lastStreamCleanup.push(cleanup);
            }
          }
        } else if (isNodeStream(stream)) {
          if (isReadableNodeStream(ret)) {
            finishCount += 2;
            const cleanup = pipe(ret, stream, finish, {
              end
            });
            if (isReadable(stream) && isLastStream) {
              lastStreamCleanup.push(cleanup);
            }
          } else if (isTransformStream(ret) || isReadableStream(ret)) {
            const toRead = ret.readable || ret;
            finishCount++;
            pumpToNode(toRead, stream, finish, {
              end
            });
          } else if (isIterable(ret)) {
            finishCount++;
            pumpToNode(ret, stream, finish, {
              end
            });
          } else {
            throw new ERR_INVALID_ARG_TYPE(
              "val",
              ["Readable", "Iterable", "AsyncIterable", "ReadableStream", "TransformStream"],
              ret
            );
          }
          ret = stream;
        } else if (isWebStream(stream)) {
          if (isReadableNodeStream(ret)) {
            finishCount++;
            pumpToWeb(makeAsyncIterable(ret), stream, finish, {
              end
            });
          } else if (isReadableStream(ret) || isIterable(ret)) {
            finishCount++;
            pumpToWeb(ret, stream, finish, {
              end
            });
          } else if (isTransformStream(ret)) {
            finishCount++;
            pumpToWeb(ret.readable, stream, finish, {
              end
            });
          } else {
            throw new ERR_INVALID_ARG_TYPE(
              "val",
              ["Readable", "Iterable", "AsyncIterable", "ReadableStream", "TransformStream"],
              ret
            );
          }
          ret = stream;
        } else {
          ret = Duplex.from(stream);
        }
      }
      if (signal !== null && signal !== void 0 && signal.aborted || outerSignal !== null && outerSignal !== void 0 && outerSignal.aborted) {
        process2.nextTick(abort);
      }
      return ret;
    }
    function pipe(src, dst, finish, { end }) {
      let ended = false;
      dst.on("close", () => {
        if (!ended) {
          finish(new ERR_STREAM_PREMATURE_CLOSE());
        }
      });
      src.pipe(dst, {
        end: false
      });
      if (end) {
        let endFn2 = function() {
          ended = true;
          dst.end();
        };
        var endFn = endFn2;
        if (isReadableEnded(src)) {
          process2.nextTick(endFn2);
        } else {
          src.once("end", endFn2);
        }
      } else {
        finish();
      }
      eos(
        src,
        {
          readable: true,
          writable: false
        },
        (err) => {
          const rState = src._readableState;
          if (err && err.code === "ERR_STREAM_PREMATURE_CLOSE" && rState && rState.ended && !rState.errored && !rState.errorEmitted) {
            src.once("end", finish).once("error", finish);
          } else {
            finish(err);
          }
        }
      );
      return eos(
        dst,
        {
          readable: false,
          writable: true
        },
        finish
      );
    }
    module2.exports = {
      pipelineImpl,
      pipeline
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/compose.js
var require_compose = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/compose.js"(exports, module2) {
    "use strict";
    var { pipeline } = require_pipeline();
    var Duplex = require_duplex();
    var { destroyer } = require_destroy();
    var {
      isNodeStream,
      isReadable,
      isWritable,
      isWebStream,
      isTransformStream,
      isWritableStream,
      isReadableStream
    } = require_utils();
    var {
      AbortError,
      codes: { ERR_INVALID_ARG_VALUE, ERR_MISSING_ARGS }
    } = require_errors();
    var eos = require_end_of_stream();
    module2.exports = function compose(...streams) {
      if (streams.length === 0) {
        throw new ERR_MISSING_ARGS("streams");
      }
      if (streams.length === 1) {
        return Duplex.from(streams[0]);
      }
      const orgStreams = [...streams];
      if (typeof streams[0] === "function") {
        streams[0] = Duplex.from(streams[0]);
      }
      if (typeof streams[streams.length - 1] === "function") {
        const idx = streams.length - 1;
        streams[idx] = Duplex.from(streams[idx]);
      }
      for (let n = 0; n < streams.length; ++n) {
        if (!isNodeStream(streams[n]) && !isWebStream(streams[n])) {
          continue;
        }
        if (n < streams.length - 1 && !(isReadable(streams[n]) || isReadableStream(streams[n]) || isTransformStream(streams[n]))) {
          throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], "must be readable");
        }
        if (n > 0 && !(isWritable(streams[n]) || isWritableStream(streams[n]) || isTransformStream(streams[n]))) {
          throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], "must be writable");
        }
      }
      let ondrain;
      let onfinish;
      let onreadable;
      let onclose;
      let d;
      function onfinished(err) {
        const cb = onclose;
        onclose = null;
        if (cb) {
          cb(err);
        } else if (err) {
          d.destroy(err);
        } else if (!readable && !writable) {
          d.destroy();
        }
      }
      const head = streams[0];
      const tail = pipeline(streams, onfinished);
      const writable = !!(isWritable(head) || isWritableStream(head) || isTransformStream(head));
      const readable = !!(isReadable(tail) || isReadableStream(tail) || isTransformStream(tail));
      d = new Duplex({
        // TODO (ronag): highWaterMark?
        writableObjectMode: !!(head !== null && head !== void 0 && head.writableObjectMode),
        readableObjectMode: !!(tail !== null && tail !== void 0 && tail.writableObjectMode),
        writable,
        readable
      });
      if (writable) {
        if (isNodeStream(head)) {
          d._write = function(chunk, encoding, callback) {
            if (head.write(chunk, encoding)) {
              callback();
            } else {
              ondrain = callback;
            }
          };
          d._final = function(callback) {
            head.end();
            onfinish = callback;
          };
          head.on("drain", function() {
            if (ondrain) {
              const cb = ondrain;
              ondrain = null;
              cb();
            }
          });
        } else if (isWebStream(head)) {
          const writable2 = isTransformStream(head) ? head.writable : head;
          const writer = writable2.getWriter();
          d._write = async function(chunk, encoding, callback) {
            try {
              await writer.ready;
              writer.write(chunk).catch(() => {
              });
              callback();
            } catch (err) {
              callback(err);
            }
          };
          d._final = async function(callback) {
            try {
              await writer.ready;
              writer.close().catch(() => {
              });
              onfinish = callback;
            } catch (err) {
              callback(err);
            }
          };
        }
        const toRead = isTransformStream(tail) ? tail.readable : tail;
        eos(toRead, () => {
          if (onfinish) {
            const cb = onfinish;
            onfinish = null;
            cb();
          }
        });
      }
      if (readable) {
        if (isNodeStream(tail)) {
          tail.on("readable", function() {
            if (onreadable) {
              const cb = onreadable;
              onreadable = null;
              cb();
            }
          });
          tail.on("end", function() {
            d.push(null);
          });
          d._read = function() {
            while (true) {
              const buf = tail.read();
              if (buf === null) {
                onreadable = d._read;
                return;
              }
              if (!d.push(buf)) {
                return;
              }
            }
          };
        } else if (isWebStream(tail)) {
          const readable2 = isTransformStream(tail) ? tail.readable : tail;
          const reader = readable2.getReader();
          d._read = async function() {
            while (true) {
              try {
                const { value, done } = await reader.read();
                if (!d.push(value)) {
                  return;
                }
                if (done) {
                  d.push(null);
                  return;
                }
              } catch {
                return;
              }
            }
          };
        }
      }
      d._destroy = function(err, callback) {
        if (!err && onclose !== null) {
          err = new AbortError();
        }
        onreadable = null;
        ondrain = null;
        onfinish = null;
        if (onclose === null) {
          callback(err);
        } else {
          onclose = callback;
          if (isNodeStream(tail)) {
            destroyer(tail, err);
          }
        }
      };
      return d;
    };
  }
});

// node_modules/readable-stream/lib/internal/streams/operators.js
var require_operators = __commonJS({
  "node_modules/readable-stream/lib/internal/streams/operators.js"(exports, module2) {
    "use strict";
    var AbortController = globalThis.AbortController || require_abort_controller().AbortController;
    var {
      codes: { ERR_INVALID_ARG_VALUE, ERR_INVALID_ARG_TYPE, ERR_MISSING_ARGS, ERR_OUT_OF_RANGE },
      AbortError
    } = require_errors();
    var { validateAbortSignal, validateInteger, validateObject } = require_validators();
    var kWeakHandler = require_primordials().Symbol("kWeak");
    var { finished } = require_end_of_stream();
    var staticCompose = require_compose();
    var { addAbortSignalNoValidate } = require_add_abort_signal();
    var { isWritable, isNodeStream } = require_utils();
    var {
      ArrayPrototypePush,
      MathFloor,
      Number: Number2,
      NumberIsNaN,
      Promise: Promise2,
      PromiseReject,
      PromisePrototypeThen,
      Symbol: Symbol2
    } = require_primordials();
    var kEmpty = Symbol2("kEmpty");
    var kEof = Symbol2("kEof");
    function compose(stream, options) {
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      if (isNodeStream(stream) && !isWritable(stream)) {
        throw new ERR_INVALID_ARG_VALUE("stream", stream, "must be writable");
      }
      const composedStream = staticCompose(this, stream);
      if (options !== null && options !== void 0 && options.signal) {
        addAbortSignalNoValidate(options.signal, composedStream);
      }
      return composedStream;
    }
    function map(fn, options) {
      if (typeof fn !== "function") {
        throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
      }
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      let concurrency = 1;
      if ((options === null || options === void 0 ? void 0 : options.concurrency) != null) {
        concurrency = MathFloor(options.concurrency);
      }
      validateInteger(concurrency, "concurrency", 1);
      return async function* map2() {
        var _options$signal, _options$signal2;
        const ac = new AbortController();
        const stream = this;
        const queue = [];
        const signal = ac.signal;
        const signalOpt = {
          signal
        };
        const abort = () => ac.abort();
        if (options !== null && options !== void 0 && (_options$signal = options.signal) !== null && _options$signal !== void 0 && _options$signal.aborted) {
          abort();
        }
        options === null || options === void 0 ? void 0 : (_options$signal2 = options.signal) === null || _options$signal2 === void 0 ? void 0 : _options$signal2.addEventListener("abort", abort);
        let next;
        let resume;
        let done = false;
        function onDone() {
          done = true;
        }
        async function pump() {
          try {
            for await (let val of stream) {
              var _val;
              if (done) {
                return;
              }
              if (signal.aborted) {
                throw new AbortError();
              }
              try {
                val = fn(val, signalOpt);
              } catch (err) {
                val = PromiseReject(err);
              }
              if (val === kEmpty) {
                continue;
              }
              if (typeof ((_val = val) === null || _val === void 0 ? void 0 : _val.catch) === "function") {
                val.catch(onDone);
              }
              queue.push(val);
              if (next) {
                next();
                next = null;
              }
              if (!done && queue.length && queue.length >= concurrency) {
                await new Promise2((resolve) => {
                  resume = resolve;
                });
              }
            }
            queue.push(kEof);
          } catch (err) {
            const val = PromiseReject(err);
            PromisePrototypeThen(val, void 0, onDone);
            queue.push(val);
          } finally {
            var _options$signal3;
            done = true;
            if (next) {
              next();
              next = null;
            }
            options === null || options === void 0 ? void 0 : (_options$signal3 = options.signal) === null || _options$signal3 === void 0 ? void 0 : _options$signal3.removeEventListener("abort", abort);
          }
        }
        pump();
        try {
          while (true) {
            while (queue.length > 0) {
              const val = await queue[0];
              if (val === kEof) {
                return;
              }
              if (signal.aborted) {
                throw new AbortError();
              }
              if (val !== kEmpty) {
                yield val;
              }
              queue.shift();
              if (resume) {
                resume();
                resume = null;
              }
            }
            await new Promise2((resolve) => {
              next = resolve;
            });
          }
        } finally {
          ac.abort();
          done = true;
          if (resume) {
            resume();
            resume = null;
          }
        }
      }.call(this);
    }
    function asIndexedPairs(options = void 0) {
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      return async function* asIndexedPairs2() {
        let index = 0;
        for await (const val of this) {
          var _options$signal4;
          if (options !== null && options !== void 0 && (_options$signal4 = options.signal) !== null && _options$signal4 !== void 0 && _options$signal4.aborted) {
            throw new AbortError({
              cause: options.signal.reason
            });
          }
          yield [index++, val];
        }
      }.call(this);
    }
    async function some(fn, options = void 0) {
      for await (const unused of filter.call(this, fn, options)) {
        return true;
      }
      return false;
    }
    async function every(fn, options = void 0) {
      if (typeof fn !== "function") {
        throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
      }
      return !await some.call(
        this,
        async (...args) => {
          return !await fn(...args);
        },
        options
      );
    }
    async function find(fn, options) {
      for await (const result of filter.call(this, fn, options)) {
        return result;
      }
      return void 0;
    }
    async function forEach(fn, options) {
      if (typeof fn !== "function") {
        throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
      }
      async function forEachFn(value, options2) {
        await fn(value, options2);
        return kEmpty;
      }
      for await (const unused of map.call(this, forEachFn, options))
        ;
    }
    function filter(fn, options) {
      if (typeof fn !== "function") {
        throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
      }
      async function filterFn(value, options2) {
        if (await fn(value, options2)) {
          return value;
        }
        return kEmpty;
      }
      return map.call(this, filterFn, options);
    }
    var ReduceAwareErrMissingArgs = class extends ERR_MISSING_ARGS {
      constructor() {
        super("reduce");
        this.message = "Reduce of an empty stream requires an initial value";
      }
    };
    async function reduce(reducer, initialValue, options) {
      var _options$signal5;
      if (typeof reducer !== "function") {
        throw new ERR_INVALID_ARG_TYPE("reducer", ["Function", "AsyncFunction"], reducer);
      }
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      let hasInitialValue = arguments.length > 1;
      if (options !== null && options !== void 0 && (_options$signal5 = options.signal) !== null && _options$signal5 !== void 0 && _options$signal5.aborted) {
        const err = new AbortError(void 0, {
          cause: options.signal.reason
        });
        this.once("error", () => {
        });
        await finished(this.destroy(err));
        throw err;
      }
      const ac = new AbortController();
      const signal = ac.signal;
      if (options !== null && options !== void 0 && options.signal) {
        const opts = {
          once: true,
          [kWeakHandler]: this
        };
        options.signal.addEventListener("abort", () => ac.abort(), opts);
      }
      let gotAnyItemFromStream = false;
      try {
        for await (const value of this) {
          var _options$signal6;
          gotAnyItemFromStream = true;
          if (options !== null && options !== void 0 && (_options$signal6 = options.signal) !== null && _options$signal6 !== void 0 && _options$signal6.aborted) {
            throw new AbortError();
          }
          if (!hasInitialValue) {
            initialValue = value;
            hasInitialValue = true;
          } else {
            initialValue = await reducer(initialValue, value, {
              signal
            });
          }
        }
        if (!gotAnyItemFromStream && !hasInitialValue) {
          throw new ReduceAwareErrMissingArgs();
        }
      } finally {
        ac.abort();
      }
      return initialValue;
    }
    async function toArray(options) {
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      const result = [];
      for await (const val of this) {
        var _options$signal7;
        if (options !== null && options !== void 0 && (_options$signal7 = options.signal) !== null && _options$signal7 !== void 0 && _options$signal7.aborted) {
          throw new AbortError(void 0, {
            cause: options.signal.reason
          });
        }
        ArrayPrototypePush(result, val);
      }
      return result;
    }
    function flatMap(fn, options) {
      const values = map.call(this, fn, options);
      return async function* flatMap2() {
        for await (const val of values) {
          yield* val;
        }
      }.call(this);
    }
    function toIntegerOrInfinity(number) {
      number = Number2(number);
      if (NumberIsNaN(number)) {
        return 0;
      }
      if (number < 0) {
        throw new ERR_OUT_OF_RANGE("number", ">= 0", number);
      }
      return number;
    }
    function drop(number, options = void 0) {
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      number = toIntegerOrInfinity(number);
      return async function* drop2() {
        var _options$signal8;
        if (options !== null && options !== void 0 && (_options$signal8 = options.signal) !== null && _options$signal8 !== void 0 && _options$signal8.aborted) {
          throw new AbortError();
        }
        for await (const val of this) {
          var _options$signal9;
          if (options !== null && options !== void 0 && (_options$signal9 = options.signal) !== null && _options$signal9 !== void 0 && _options$signal9.aborted) {
            throw new AbortError();
          }
          if (number-- <= 0) {
            yield val;
          }
        }
      }.call(this);
    }
    function take(number, options = void 0) {
      if (options != null) {
        validateObject(options, "options");
      }
      if ((options === null || options === void 0 ? void 0 : options.signal) != null) {
        validateAbortSignal(options.signal, "options.signal");
      }
      number = toIntegerOrInfinity(number);
      return async function* take2() {
        var _options$signal10;
        if (options !== null && options !== void 0 && (_options$signal10 = options.signal) !== null && _options$signal10 !== void 0 && _options$signal10.aborted) {
          throw new AbortError();
        }
        for await (const val of this) {
          var _options$signal11;
          if (options !== null && options !== void 0 && (_options$signal11 = options.signal) !== null && _options$signal11 !== void 0 && _options$signal11.aborted) {
            throw new AbortError();
          }
          if (number-- > 0) {
            yield val;
          } else {
            return;
          }
        }
      }.call(this);
    }
    module2.exports.streamReturningOperators = {
      asIndexedPairs,
      drop,
      filter,
      flatMap,
      map,
      take,
      compose
    };
    module2.exports.promiseReturningOperators = {
      every,
      forEach,
      reduce,
      toArray,
      some,
      find
    };
  }
});

// node_modules/readable-stream/lib/stream/promises.js
var require_promises = __commonJS({
  "node_modules/readable-stream/lib/stream/promises.js"(exports, module2) {
    "use strict";
    var { ArrayPrototypePop, Promise: Promise2 } = require_primordials();
    var { isIterable, isNodeStream, isWebStream } = require_utils();
    var { pipelineImpl: pl } = require_pipeline();
    var { finished } = require_end_of_stream();
    require_stream();
    function pipeline(...streams) {
      return new Promise2((resolve, reject) => {
        let signal;
        let end;
        const lastArg = streams[streams.length - 1];
        if (lastArg && typeof lastArg === "object" && !isNodeStream(lastArg) && !isIterable(lastArg) && !isWebStream(lastArg)) {
          const options = ArrayPrototypePop(streams);
          signal = options.signal;
          end = options.end;
        }
        pl(
          streams,
          (err, value) => {
            if (err) {
              reject(err);
            } else {
              resolve(value);
            }
          },
          {
            signal,
            end
          }
        );
      });
    }
    module2.exports = {
      finished,
      pipeline
    };
  }
});

// node_modules/readable-stream/lib/stream.js
var require_stream = __commonJS({
  "node_modules/readable-stream/lib/stream.js"(exports, module2) {
    var { Buffer: Buffer2 } = require("buffer");
    var { ObjectDefineProperty, ObjectKeys, ReflectApply } = require_primordials();
    var {
      promisify: { custom: customPromisify }
    } = require_util();
    var { streamReturningOperators, promiseReturningOperators } = require_operators();
    var {
      codes: { ERR_ILLEGAL_CONSTRUCTOR }
    } = require_errors();
    var compose = require_compose();
    var { pipeline } = require_pipeline();
    var { destroyer } = require_destroy();
    var eos = require_end_of_stream();
    var promises = require_promises();
    var utils = require_utils();
    var Stream = module2.exports = require_legacy().Stream;
    Stream.isDisturbed = utils.isDisturbed;
    Stream.isErrored = utils.isErrored;
    Stream.isReadable = utils.isReadable;
    Stream.Readable = require_readable();
    for (const key of ObjectKeys(streamReturningOperators)) {
      let fn2 = function(...args) {
        if (new.target) {
          throw ERR_ILLEGAL_CONSTRUCTOR();
        }
        return Stream.Readable.from(ReflectApply(op, this, args));
      };
      fn = fn2;
      const op = streamReturningOperators[key];
      ObjectDefineProperty(fn2, "name", {
        __proto__: null,
        value: op.name
      });
      ObjectDefineProperty(fn2, "length", {
        __proto__: null,
        value: op.length
      });
      ObjectDefineProperty(Stream.Readable.prototype, key, {
        __proto__: null,
        value: fn2,
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    var fn;
    for (const key of ObjectKeys(promiseReturningOperators)) {
      let fn2 = function(...args) {
        if (new.target) {
          throw ERR_ILLEGAL_CONSTRUCTOR();
        }
        return ReflectApply(op, this, args);
      };
      fn = fn2;
      const op = promiseReturningOperators[key];
      ObjectDefineProperty(fn2, "name", {
        __proto__: null,
        value: op.name
      });
      ObjectDefineProperty(fn2, "length", {
        __proto__: null,
        value: op.length
      });
      ObjectDefineProperty(Stream.Readable.prototype, key, {
        __proto__: null,
        value: fn2,
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    var fn;
    Stream.Writable = require_writable();
    Stream.Duplex = require_duplex();
    Stream.Transform = require_transform();
    Stream.PassThrough = require_passthrough();
    Stream.pipeline = pipeline;
    var { addAbortSignal } = require_add_abort_signal();
    Stream.addAbortSignal = addAbortSignal;
    Stream.finished = eos;
    Stream.destroy = destroyer;
    Stream.compose = compose;
    ObjectDefineProperty(Stream, "promises", {
      __proto__: null,
      configurable: true,
      enumerable: true,
      get() {
        return promises;
      }
    });
    ObjectDefineProperty(pipeline, customPromisify, {
      __proto__: null,
      enumerable: true,
      get() {
        return promises.pipeline;
      }
    });
    ObjectDefineProperty(eos, customPromisify, {
      __proto__: null,
      enumerable: true,
      get() {
        return promises.finished;
      }
    });
    Stream.Stream = Stream;
    Stream._isUint8Array = function isUint8Array(value) {
      return value instanceof Uint8Array;
    };
    Stream._uint8ArrayToBuffer = function _uint8ArrayToBuffer(chunk) {
      return Buffer2.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    };
  }
});

// node_modules/readable-stream/lib/ours/index.js
var require_ours = __commonJS({
  "node_modules/readable-stream/lib/ours/index.js"(exports, module2) {
    "use strict";
    var Stream = require("stream");
    if (Stream && process.env.READABLE_STREAM === "disable") {
      const promises = Stream.promises;
      module2.exports._uint8ArrayToBuffer = Stream._uint8ArrayToBuffer;
      module2.exports._isUint8Array = Stream._isUint8Array;
      module2.exports.isDisturbed = Stream.isDisturbed;
      module2.exports.isErrored = Stream.isErrored;
      module2.exports.isReadable = Stream.isReadable;
      module2.exports.Readable = Stream.Readable;
      module2.exports.Writable = Stream.Writable;
      module2.exports.Duplex = Stream.Duplex;
      module2.exports.Transform = Stream.Transform;
      module2.exports.PassThrough = Stream.PassThrough;
      module2.exports.addAbortSignal = Stream.addAbortSignal;
      module2.exports.finished = Stream.finished;
      module2.exports.destroy = Stream.destroy;
      module2.exports.pipeline = Stream.pipeline;
      module2.exports.compose = Stream.compose;
      Object.defineProperty(Stream, "promises", {
        configurable: true,
        enumerable: true,
        get() {
          return promises;
        }
      });
      module2.exports.Stream = Stream.Stream;
    } else {
      const CustomStream = require_stream();
      const promises = require_promises();
      const originalDestroy = CustomStream.Readable.destroy;
      module2.exports = CustomStream.Readable;
      module2.exports._uint8ArrayToBuffer = CustomStream._uint8ArrayToBuffer;
      module2.exports._isUint8Array = CustomStream._isUint8Array;
      module2.exports.isDisturbed = CustomStream.isDisturbed;
      module2.exports.isErrored = CustomStream.isErrored;
      module2.exports.isReadable = CustomStream.isReadable;
      module2.exports.Readable = CustomStream.Readable;
      module2.exports.Writable = CustomStream.Writable;
      module2.exports.Duplex = CustomStream.Duplex;
      module2.exports.Transform = CustomStream.Transform;
      module2.exports.PassThrough = CustomStream.PassThrough;
      module2.exports.addAbortSignal = CustomStream.addAbortSignal;
      module2.exports.finished = CustomStream.finished;
      module2.exports.destroy = CustomStream.destroy;
      module2.exports.destroy = originalDestroy;
      module2.exports.pipeline = CustomStream.pipeline;
      module2.exports.compose = CustomStream.compose;
      Object.defineProperty(CustomStream, "promises", {
        configurable: true,
        enumerable: true,
        get() {
          return promises;
        }
      });
      module2.exports.Stream = CustomStream.Stream;
    }
    module2.exports.default = module2.exports;
  }
});

// node_modules/n3/src/N3Store.js
function isString(s) {
  return typeof s === "string" || s instanceof String;
}
var import_readable_stream, N3Store, DatasetCoreAndReadableStream;
var init_N3Store = __esm({
  "node_modules/n3/src/N3Store.js"() {
    init_N3DataFactory();
    import_readable_stream = __toESM(require_ours());
    init_IRIs();
    init_N3Util();
    N3Store = class {
      constructor(quads, options) {
        this._size = 0;
        this._graphs = /* @__PURE__ */ Object.create(null);
        this._id = 0;
        this._ids = /* @__PURE__ */ Object.create(null);
        this._entities = /* @__PURE__ */ Object.create(null);
        this._blankNodeIndex = 0;
        if (!options && quads && !quads[0])
          options = quads, quads = null;
        options = options || {};
        this._factory = options.factory || N3DataFactory_default;
        if (quads)
          this.addQuads(quads);
      }
      _termFromId(id, factory) {
        if (id[0] === ".") {
          const entities = this._entities;
          const terms = id.split(".");
          const q = this._factory.quad(
            this._termFromId(entities[terms[1]]),
            this._termFromId(entities[terms[2]]),
            this._termFromId(entities[terms[3]]),
            terms[4] && this._termFromId(entities[terms[4]])
          );
          return q;
        }
        return termFromId(id, factory);
      }
      _termToNumericId(term) {
        if (term.termType === "Quad") {
          const s = this._termToNumericId(term.subject), p = this._termToNumericId(term.predicate), o = this._termToNumericId(term.object);
          let g;
          return s && p && o && (isDefaultGraph(term.graph) || (g = this._termToNumericId(term.graph))) && this._ids[g ? `.${s}.${p}.${o}.${g}` : `.${s}.${p}.${o}`];
        }
        return this._ids[termToId(term)];
      }
      _termToNewNumericId(term) {
        const str = term && term.termType === "Quad" ? `.${this._termToNewNumericId(term.subject)}.${this._termToNewNumericId(term.predicate)}.${this._termToNewNumericId(term.object)}${isDefaultGraph(term.graph) ? "" : `.${this._termToNewNumericId(term.graph)}`}` : termToId(term);
        return this._ids[str] || (this._ids[this._entities[++this._id] = str] = this._id);
      }
      // ## Public properties
      // ### `size` returns the number of quads in the store
      get size() {
        let size = this._size;
        if (size !== null)
          return size;
        size = 0;
        const graphs = this._graphs;
        let subjects, subject;
        for (const graphKey in graphs)
          for (const subjectKey in subjects = graphs[graphKey].subjects)
            for (const predicateKey in subject = subjects[subjectKey])
              size += Object.keys(subject[predicateKey]).length;
        return this._size = size;
      }
      // ## Private methods
      // ### `_addToIndex` adds a quad to a three-layered index.
      // Returns if the index has changed, if the entry did not already exist.
      _addToIndex(index0, key0, key1, key2) {
        const index1 = index0[key0] || (index0[key0] = {});
        const index2 = index1[key1] || (index1[key1] = {});
        const existed = key2 in index2;
        if (!existed)
          index2[key2] = null;
        return !existed;
      }
      // ### `_removeFromIndex` removes a quad from a three-layered index
      _removeFromIndex(index0, key0, key1, key2) {
        const index1 = index0[key0], index2 = index1[key1];
        delete index2[key2];
        for (const key in index2)
          return;
        delete index1[key1];
        for (const key in index1)
          return;
        delete index0[key0];
      }
      // ### `_findInIndex` finds a set of quads in a three-layered index.
      // The index base is `index0` and the keys at each level are `key0`, `key1`, and `key2`.
      // Any of these keys can be undefined, which is interpreted as a wildcard.
      // `name0`, `name1`, and `name2` are the names of the keys at each level,
      // used when reconstructing the resulting quad
      // (for instance: _subject_, _predicate_, and _object_).
      // Finally, `graphId` will be the graph of the created quads.
      *_findInIndex(index0, key0, key1, key2, name0, name1, name2, graphId) {
        let tmp, index1, index2;
        const entityKeys = this._entities;
        const graph = this._termFromId(graphId, this._factory);
        const parts = { subject: null, predicate: null, object: null };
        if (key0)
          (tmp = index0, index0 = {})[key0] = tmp[key0];
        for (const value0 in index0) {
          if (index1 = index0[value0]) {
            parts[name0] = this._termFromId(entityKeys[value0], this._factory);
            if (key1)
              (tmp = index1, index1 = {})[key1] = tmp[key1];
            for (const value1 in index1) {
              if (index2 = index1[value1]) {
                parts[name1] = this._termFromId(entityKeys[value1], this._factory);
                const values = key2 ? key2 in index2 ? [key2] : [] : Object.keys(index2);
                for (let l = 0; l < values.length; l++) {
                  parts[name2] = this._termFromId(entityKeys[values[l]], this._factory);
                  yield this._factory.quad(parts.subject, parts.predicate, parts.object, graph);
                }
              }
            }
          }
        }
      }
      // ### `_loop` executes the callback on all keys of index 0
      _loop(index0, callback) {
        for (const key0 in index0)
          callback(key0);
      }
      // ### `_loopByKey0` executes the callback on all keys of a certain entry in index 0
      _loopByKey0(index0, key0, callback) {
        let index1, key1;
        if (index1 = index0[key0]) {
          for (key1 in index1)
            callback(key1);
        }
      }
      // ### `_loopByKey1` executes the callback on given keys of all entries in index 0
      _loopByKey1(index0, key1, callback) {
        let key0, index1;
        for (key0 in index0) {
          index1 = index0[key0];
          if (index1[key1])
            callback(key0);
        }
      }
      // ### `_loopBy2Keys` executes the callback on given keys of certain entries in index 2
      _loopBy2Keys(index0, key0, key1, callback) {
        let index1, index2, key2;
        if ((index1 = index0[key0]) && (index2 = index1[key1])) {
          for (key2 in index2)
            callback(key2);
        }
      }
      // ### `_countInIndex` counts matching quads in a three-layered index.
      // The index base is `index0` and the keys at each level are `key0`, `key1`, and `key2`.
      // Any of these keys can be undefined, which is interpreted as a wildcard.
      _countInIndex(index0, key0, key1, key2) {
        let count = 0, tmp, index1, index2;
        if (key0)
          (tmp = index0, index0 = {})[key0] = tmp[key0];
        for (const value0 in index0) {
          if (index1 = index0[value0]) {
            if (key1)
              (tmp = index1, index1 = {})[key1] = tmp[key1];
            for (const value1 in index1) {
              if (index2 = index1[value1]) {
                if (key2)
                  key2 in index2 && count++;
                else
                  count += Object.keys(index2).length;
              }
            }
          }
        }
        return count;
      }
      // ### `_getGraphs` returns an array with the given graph,
      // or all graphs if the argument is null or undefined.
      _getGraphs(graph) {
        if (!isString(graph))
          return this._graphs;
        const graphs = {};
        graphs[graph] = this._graphs[graph];
        return graphs;
      }
      // ### `_uniqueEntities` returns a function that accepts an entity ID
      // and passes the corresponding entity to callback if it hasn't occurred before.
      _uniqueEntities(callback) {
        const uniqueIds = /* @__PURE__ */ Object.create(null);
        return (id) => {
          if (!(id in uniqueIds)) {
            uniqueIds[id] = true;
            callback(this._termFromId(this._entities[id], this._factory));
          }
        };
      }
      // ## Public methods
      // ### `add` adds the specified quad to the dataset.
      // Returns the dataset instance it was called on.
      // Existing quads, as defined in Quad.equals, will be ignored.
      add(quad2) {
        this.addQuad(quad2);
        return this;
      }
      // ### `addQuad` adds a new quad to the store.
      // Returns if the quad index has changed, if the quad did not already exist.
      addQuad(subject, predicate, object, graph) {
        if (!predicate)
          graph = subject.graph, object = subject.object, predicate = subject.predicate, subject = subject.subject;
        graph = termToId(graph);
        let graphItem = this._graphs[graph];
        if (!graphItem) {
          graphItem = this._graphs[graph] = { subjects: {}, predicates: {}, objects: {} };
          Object.freeze(graphItem);
        }
        subject = this._termToNewNumericId(subject);
        predicate = this._termToNewNumericId(predicate);
        object = this._termToNewNumericId(object);
        const changed = this._addToIndex(graphItem.subjects, subject, predicate, object);
        this._addToIndex(graphItem.predicates, predicate, object, subject);
        this._addToIndex(graphItem.objects, object, subject, predicate);
        this._size = null;
        return changed;
      }
      // ### `addQuads` adds multiple quads to the store
      addQuads(quads) {
        for (let i = 0; i < quads.length; i++)
          this.addQuad(quads[i]);
      }
      // ### `delete` removes the specified quad from the dataset.
      // Returns the dataset instance it was called on.
      delete(quad2) {
        this.removeQuad(quad2);
        return this;
      }
      // ### `has` determines whether a dataset includes a certain quad or quad pattern.
      has(subjectOrQuad, predicate, object, graph) {
        if (subjectOrQuad && subjectOrQuad.subject)
          ({ subject: subjectOrQuad, predicate, object, graph } = subjectOrQuad);
        return !this.readQuads(subjectOrQuad, predicate, object, graph).next().done;
      }
      // ### `import` adds a stream of quads to the store
      import(stream) {
        stream.on("data", (quad2) => {
          this.addQuad(quad2);
        });
        return stream;
      }
      // ### `removeQuad` removes a quad from the store if it exists
      removeQuad(subject, predicate, object, graph) {
        if (!predicate)
          graph = subject.graph, object = subject.object, predicate = subject.predicate, subject = subject.subject;
        graph = termToId(graph);
        const graphs = this._graphs;
        let graphItem, subjects, predicates;
        if (!(subject = subject && this._termToNumericId(subject)) || !(predicate = predicate && this._termToNumericId(predicate)) || !(object = object && this._termToNumericId(object)) || !(graphItem = graphs[graph]) || !(subjects = graphItem.subjects[subject]) || !(predicates = subjects[predicate]) || !(object in predicates))
          return false;
        this._removeFromIndex(graphItem.subjects, subject, predicate, object);
        this._removeFromIndex(graphItem.predicates, predicate, object, subject);
        this._removeFromIndex(graphItem.objects, object, subject, predicate);
        if (this._size !== null)
          this._size--;
        for (subject in graphItem.subjects)
          return true;
        delete graphs[graph];
        return true;
      }
      // ### `removeQuads` removes multiple quads from the store
      removeQuads(quads) {
        for (let i = 0; i < quads.length; i++)
          this.removeQuad(quads[i]);
      }
      // ### `remove` removes a stream of quads from the store
      remove(stream) {
        stream.on("data", (quad2) => {
          this.removeQuad(quad2);
        });
        return stream;
      }
      // ### `removeMatches` removes all matching quads from the store
      // Setting any field to `undefined` or `null` indicates a wildcard.
      removeMatches(subject, predicate, object, graph) {
        const stream = new import_readable_stream.Readable({ objectMode: true });
        stream._read = () => {
          for (const quad2 of this.readQuads(subject, predicate, object, graph))
            stream.push(quad2);
          stream.push(null);
        };
        return this.remove(stream);
      }
      // ### `deleteGraph` removes all triples with the given graph from the store
      deleteGraph(graph) {
        return this.removeMatches(null, null, null, graph);
      }
      // ### `getQuads` returns an array of quads matching a pattern.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      getQuads(subject, predicate, object, graph) {
        return [...this.readQuads(subject, predicate, object, graph)];
      }
      // ### `readQuads` returns an generator of quads matching a pattern.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      *readQuads(subject, predicate, object, graph) {
        graph = graph && termToId(graph);
        const graphs = this._getGraphs(graph);
        let content, subjectId, predicateId, objectId;
        if (subject && !(subjectId = this._termToNumericId(subject)) || predicate && !(predicateId = this._termToNumericId(predicate)) || object && !(objectId = this._termToNumericId(object)))
          return;
        for (const graphId in graphs) {
          if (content = graphs[graphId]) {
            if (subjectId) {
              if (objectId)
                yield* this._findInIndex(
                  content.objects,
                  objectId,
                  subjectId,
                  predicateId,
                  "object",
                  "subject",
                  "predicate",
                  graphId
                );
              else
                yield* this._findInIndex(
                  content.subjects,
                  subjectId,
                  predicateId,
                  null,
                  "subject",
                  "predicate",
                  "object",
                  graphId
                );
            } else if (predicateId)
              yield* this._findInIndex(
                content.predicates,
                predicateId,
                objectId,
                null,
                "predicate",
                "object",
                "subject",
                graphId
              );
            else if (objectId)
              yield* this._findInIndex(
                content.objects,
                objectId,
                null,
                null,
                "object",
                "subject",
                "predicate",
                graphId
              );
            else
              yield* this._findInIndex(
                content.subjects,
                null,
                null,
                null,
                "subject",
                "predicate",
                "object",
                graphId
              );
          }
        }
      }
      // ### `match` returns a new dataset that is comprised of all quads in the current instance matching the given arguments.
      // The logic described in Quad Matching is applied for each quad in this dataset to check if it should be included in the output dataset.
      // Note: This method always returns a new DatasetCore, even if that dataset contains no quads.
      // Note: Since a DatasetCore is an unordered set, the order of the quads within the returned sequence is arbitrary.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      // For backwards compatibility, the object return also implements the Readable stream interface.
      match(subject, predicate, object, graph) {
        return new DatasetCoreAndReadableStream(this, subject, predicate, object, graph);
      }
      // ### `countQuads` returns the number of quads matching a pattern.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      countQuads(subject, predicate, object, graph) {
        graph = graph && termToId(graph);
        const graphs = this._getGraphs(graph);
        let count = 0, content, subjectId, predicateId, objectId;
        if (subject && !(subjectId = this._termToNumericId(subject)) || predicate && !(predicateId = this._termToNumericId(predicate)) || object && !(objectId = this._termToNumericId(object)))
          return 0;
        for (const graphId in graphs) {
          if (content = graphs[graphId]) {
            if (subject) {
              if (object)
                count += this._countInIndex(content.objects, objectId, subjectId, predicateId);
              else
                count += this._countInIndex(content.subjects, subjectId, predicateId, objectId);
            } else if (predicate) {
              count += this._countInIndex(content.predicates, predicateId, objectId, subjectId);
            } else {
              count += this._countInIndex(content.objects, objectId, subjectId, predicateId);
            }
          }
        }
        return count;
      }
      // ### `forEach` executes the callback on all quads.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      forEach(callback, subject, predicate, object, graph) {
        this.some((quad2) => {
          callback(quad2);
          return false;
        }, subject, predicate, object, graph);
      }
      // ### `every` executes the callback on all quads,
      // and returns `true` if it returns truthy for all them.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      every(callback, subject, predicate, object, graph) {
        let some = false;
        const every = !this.some((quad2) => {
          some = true;
          return !callback(quad2);
        }, subject, predicate, object, graph);
        return some && every;
      }
      // ### `some` executes the callback on all quads,
      // and returns `true` if it returns truthy for any of them.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      some(callback, subject, predicate, object, graph) {
        for (const quad2 of this.readQuads(subject, predicate, object, graph))
          if (callback(quad2))
            return true;
        return false;
      }
      // ### `getSubjects` returns all subjects that match the pattern.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      getSubjects(predicate, object, graph) {
        const results = [];
        this.forSubjects((s) => {
          results.push(s);
        }, predicate, object, graph);
        return results;
      }
      // ### `forSubjects` executes the callback on all subjects that match the pattern.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      forSubjects(callback, predicate, object, graph) {
        graph = graph && termToId(graph);
        const graphs = this._getGraphs(graph);
        let content, predicateId, objectId;
        callback = this._uniqueEntities(callback);
        if (predicate && !(predicateId = this._termToNumericId(predicate)) || object && !(objectId = this._termToNumericId(object)))
          return;
        for (graph in graphs) {
          if (content = graphs[graph]) {
            if (predicateId) {
              if (objectId)
                this._loopBy2Keys(content.predicates, predicateId, objectId, callback);
              else
                this._loopByKey1(content.subjects, predicateId, callback);
            } else if (objectId)
              this._loopByKey0(content.objects, objectId, callback);
            else
              this._loop(content.subjects, callback);
          }
        }
      }
      // ### `getPredicates` returns all predicates that match the pattern.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      getPredicates(subject, object, graph) {
        const results = [];
        this.forPredicates((p) => {
          results.push(p);
        }, subject, object, graph);
        return results;
      }
      // ### `forPredicates` executes the callback on all predicates that match the pattern.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      forPredicates(callback, subject, object, graph) {
        graph = graph && termToId(graph);
        const graphs = this._getGraphs(graph);
        let content, subjectId, objectId;
        callback = this._uniqueEntities(callback);
        if (subject && !(subjectId = this._termToNumericId(subject)) || object && !(objectId = this._termToNumericId(object)))
          return;
        for (graph in graphs) {
          if (content = graphs[graph]) {
            if (subjectId) {
              if (objectId)
                this._loopBy2Keys(content.objects, objectId, subjectId, callback);
              else
                this._loopByKey0(content.subjects, subjectId, callback);
            } else if (objectId)
              this._loopByKey1(content.predicates, objectId, callback);
            else
              this._loop(content.predicates, callback);
          }
        }
      }
      // ### `getObjects` returns all objects that match the pattern.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      getObjects(subject, predicate, graph) {
        const results = [];
        this.forObjects((o) => {
          results.push(o);
        }, subject, predicate, graph);
        return results;
      }
      // ### `forObjects` executes the callback on all objects that match the pattern.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      forObjects(callback, subject, predicate, graph) {
        graph = graph && termToId(graph);
        const graphs = this._getGraphs(graph);
        let content, subjectId, predicateId;
        callback = this._uniqueEntities(callback);
        if (subject && !(subjectId = this._termToNumericId(subject)) || predicate && !(predicateId = this._termToNumericId(predicate)))
          return;
        for (graph in graphs) {
          if (content = graphs[graph]) {
            if (subjectId) {
              if (predicateId)
                this._loopBy2Keys(content.subjects, subjectId, predicateId, callback);
              else
                this._loopByKey1(content.objects, subjectId, callback);
            } else if (predicateId)
              this._loopByKey0(content.predicates, predicateId, callback);
            else
              this._loop(content.objects, callback);
          }
        }
      }
      // ### `getGraphs` returns all graphs that match the pattern.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      getGraphs(subject, predicate, object) {
        const results = [];
        this.forGraphs((g) => {
          results.push(g);
        }, subject, predicate, object);
        return results;
      }
      // ### `forGraphs` executes the callback on all graphs that match the pattern.
      // Setting any field to `undefined` or `null` indicates a wildcard.
      forGraphs(callback, subject, predicate, object) {
        for (const graph in this._graphs) {
          this.some((quad2) => {
            callback(quad2.graph);
            return true;
          }, subject, predicate, object, graph);
        }
      }
      // ### `createBlankNode` creates a new blank node, returning its name
      createBlankNode(suggestedName) {
        let name, index;
        if (suggestedName) {
          name = suggestedName = `_:${suggestedName}`, index = 1;
          while (this._ids[name])
            name = suggestedName + index++;
        } else {
          do {
            name = `_:b${this._blankNodeIndex++}`;
          } while (this._ids[name]);
        }
        this._ids[name] = ++this._id;
        this._entities[this._id] = name;
        return this._factory.blankNode(name.substr(2));
      }
      // ### `extractLists` finds and removes all list triples
      // and returns the items per list.
      extractLists({ remove = false, ignoreErrors = false } = {}) {
        const lists = {};
        const onError = ignoreErrors ? () => true : (node, message) => {
          throw new Error(`${node.value} ${message}`);
        };
        const tails = this.getQuads(null, IRIs_default.rdf.rest, IRIs_default.rdf.nil, null);
        const toRemove = remove ? [...tails] : [];
        tails.forEach((tailQuad) => {
          const items = [];
          let malformed = false;
          let head;
          let headPos;
          const graph = tailQuad.graph;
          let current = tailQuad.subject;
          while (current && !malformed) {
            const objectQuads = this.getQuads(null, null, current, null);
            const subjectQuads = this.getQuads(current, null, null, null);
            let quad2, first = null, rest = null, parent = null;
            for (let i = 0; i < subjectQuads.length && !malformed; i++) {
              quad2 = subjectQuads[i];
              if (!quad2.graph.equals(graph))
                malformed = onError(current, "not confined to single graph");
              else if (head)
                malformed = onError(current, "has non-list arcs out");
              else if (quad2.predicate.value === IRIs_default.rdf.first) {
                if (first)
                  malformed = onError(current, "has multiple rdf:first arcs");
                else
                  toRemove.push(first = quad2);
              } else if (quad2.predicate.value === IRIs_default.rdf.rest) {
                if (rest)
                  malformed = onError(current, "has multiple rdf:rest arcs");
                else
                  toRemove.push(rest = quad2);
              } else if (objectQuads.length)
                malformed = onError(current, "can't be subject and object");
              else {
                head = quad2;
                headPos = "subject";
              }
            }
            for (let i = 0; i < objectQuads.length && !malformed; ++i) {
              quad2 = objectQuads[i];
              if (head)
                malformed = onError(current, "can't have coreferences");
              else if (quad2.predicate.value === IRIs_default.rdf.rest) {
                if (parent)
                  malformed = onError(current, "has incoming rdf:rest arcs");
                else
                  parent = quad2;
              } else {
                head = quad2;
                headPos = "object";
              }
            }
            if (!first)
              malformed = onError(current, "has no list head");
            else
              items.unshift(first.object);
            current = parent && parent.subject;
          }
          if (malformed)
            remove = false;
          else if (head)
            lists[head[headPos].value] = items;
        });
        if (remove)
          this.removeQuads(toRemove);
        return lists;
      }
      // ### Store is an iterable.
      // Can be used where iterables are expected: for...of loops, array spread operator,
      // `yield*`, and destructuring assignment (order is not guaranteed).
      *[Symbol.iterator]() {
        yield* this.readQuads();
      }
    };
    DatasetCoreAndReadableStream = class extends import_readable_stream.Readable {
      constructor(n3Store, subject, predicate, object, graph) {
        super({ objectMode: true });
        Object.assign(this, { n3Store, subject, predicate, object, graph });
      }
      get filtered() {
        if (!this._filtered) {
          const { n3Store, graph, object, predicate, subject } = this;
          const newStore = this._filtered = new N3Store({ factory: n3Store._factory });
          for (const quad2 of n3Store.readQuads(subject, predicate, object, graph))
            newStore.addQuad(quad2);
        }
        return this._filtered;
      }
      get size() {
        return this.filtered.size;
      }
      _read() {
        for (const quad2 of this)
          this.push(quad2);
        this.push(null);
      }
      add(quad2) {
        return this.filtered.add(quad2);
      }
      delete(quad2) {
        return this.filtered.delete(quad2);
      }
      has(quad2) {
        return this.filtered.has(quad2);
      }
      match(subject, predicate, object, graph) {
        return new DatasetCoreAndReadableStream(this.filtered, subject, predicate, object, graph);
      }
      *[Symbol.iterator]() {
        yield* this._filtered || this.n3Store.readQuads(this.subject, this.predicate, this.object, this.graph);
      }
    };
  }
});

// node_modules/n3/src/N3StreamParser.js
var import_readable_stream2, N3StreamParser;
var init_N3StreamParser = __esm({
  "node_modules/n3/src/N3StreamParser.js"() {
    init_N3Parser();
    import_readable_stream2 = __toESM(require_ours());
    N3StreamParser = class extends import_readable_stream2.Transform {
      constructor(options) {
        super({ decodeStrings: true });
        this._readableState.objectMode = true;
        const parser = new N3Parser(options);
        let onData, onEnd;
        parser.parse(
          {
            on: (event, callback) => {
              switch (event) {
                case "data":
                  onData = callback;
                  break;
                case "end":
                  onEnd = callback;
                  break;
              }
            }
          },
          // Handle quads by pushing them down the pipeline
          (error, quad2) => {
            error && this.emit("error", error) || quad2 && this.push(quad2);
          },
          // Emit prefixes through the `prefix` event
          (prefix2, uri) => {
            this.emit("prefix", prefix2, uri);
          }
        );
        this._transform = (chunk, encoding, done) => {
          onData(chunk);
          done();
        };
        this._flush = (done) => {
          onEnd();
          done();
        };
      }
      // ### Parses a stream of strings
      import(stream) {
        stream.on("data", (chunk) => {
          this.write(chunk);
        });
        stream.on("end", () => {
          this.end();
        });
        stream.on("error", (error) => {
          this.emit("error", error);
        });
        return this;
      }
    };
  }
});

// node_modules/n3/src/N3StreamWriter.js
var import_readable_stream3, N3StreamWriter;
var init_N3StreamWriter = __esm({
  "node_modules/n3/src/N3StreamWriter.js"() {
    import_readable_stream3 = __toESM(require_ours());
    init_N3Writer();
    N3StreamWriter = class extends import_readable_stream3.Transform {
      constructor(options) {
        super({ encoding: "utf8", writableObjectMode: true });
        const writer = this._writer = new N3Writer({
          write: (quad2, encoding, callback) => {
            this.push(quad2);
            callback && callback();
          },
          end: (callback) => {
            this.push(null);
            callback && callback();
          }
        }, options);
        this._transform = (quad2, encoding, done) => {
          writer.addQuad(quad2, done);
        };
        this._flush = (done) => {
          writer.end(done);
        };
      }
      // ### Serializes a stream of quads
      import(stream) {
        stream.on("data", (quad2) => {
          this.write(quad2);
        });
        stream.on("end", () => {
          this.end();
        });
        stream.on("error", (error) => {
          this.emit("error", error);
        });
        stream.on("prefix", (prefix2, iri) => {
          this._writer.addPrefix(prefix2, iri);
        });
        return this;
      }
    };
  }
});

// node_modules/n3/src/index.js
var src_exports = {};
__export(src_exports, {
  BlankNode: () => BlankNode,
  DataFactory: () => N3DataFactory_default,
  DefaultGraph: () => DefaultGraph,
  Lexer: () => N3Lexer,
  Literal: () => Literal,
  NamedNode: () => NamedNode,
  Parser: () => N3Parser,
  Quad: () => Quad,
  Store: () => N3Store,
  StreamParser: () => N3StreamParser,
  StreamWriter: () => N3StreamWriter,
  Term: () => Term,
  Triple: () => Quad,
  Util: () => N3Util_exports,
  Variable: () => Variable,
  Writer: () => N3Writer,
  default: () => src_default,
  termFromId: () => termFromId,
  termToId: () => termToId
});
var src_default;
var init_src = __esm({
  "node_modules/n3/src/index.js"() {
    init_N3Lexer();
    init_N3Parser();
    init_N3Writer();
    init_N3Store();
    init_N3StreamParser();
    init_N3StreamWriter();
    init_N3Util();
    init_N3DataFactory();
    src_default = {
      Lexer: N3Lexer,
      Parser: N3Parser,
      Writer: N3Writer,
      Store: N3Store,
      StreamParser: N3StreamParser,
      StreamWriter: N3StreamWriter,
      Util: N3Util_exports,
      DataFactory: N3DataFactory_default,
      Term,
      NamedNode,
      Literal,
      BlankNode,
      Variable,
      DefaultGraph,
      Quad,
      Triple: Quad,
      termFromId,
      termToId
    };
  }
});

// node_modules/@faubulous/mentor-rdf/dist/ontologies/owl.js
var require_owl = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/ontologies/owl.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.owl = exports.OWL = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    exports.OWL = {
      /** The class of collections of pairwise different individuals. */
      "AllDifferent": "http://www.w3.org/2002/07/owl#AllDifferent",
      /** The class of collections of pairwise disjoint classes. */
      "AllDisjointClasses": "http://www.w3.org/2002/07/owl#AllDisjointClasses",
      /** The class of collections of pairwise disjoint properties. */
      "AllDisjointProperties": "http://www.w3.org/2002/07/owl#AllDisjointProperties",
      /** The class of annotated annotations for which the RDF serialization consists of an annotated subject, predicate and object. */
      "Annotation": "http://www.w3.org/2002/07/owl#Annotation",
      /** The class of annotation properties. */
      "AnnotationProperty": "http://www.w3.org/2002/07/owl#AnnotationProperty",
      /** The class of asymmetric properties. */
      "AsymmetricProperty": "http://www.w3.org/2002/07/owl#AsymmetricProperty",
      /** The class of annotated axioms for which the RDF serialization consists of an annotated subject, predicate and object. */
      "Axiom": "http://www.w3.org/2002/07/owl#Axiom",
      /** The class of OWL classes. */
      "Class": "http://www.w3.org/2002/07/owl#Class",
      /** The class of OWL data ranges, which are special kinds of datatypes. Note: The use of the IRI owl:DataRange has been deprecated as of OWL 2. The IRI rdfs:Datatype SHOULD be used instead. */
      "DataRange": "http://www.w3.org/2002/07/owl#DataRange",
      /** The class of data properties. */
      "DatatypeProperty": "http://www.w3.org/2002/07/owl#DatatypeProperty",
      /** The class of deprecated classes. */
      "DeprecatedClass": "http://www.w3.org/2002/07/owl#DeprecatedClass",
      /** The class of deprecated properties. */
      "DeprecatedProperty": "http://www.w3.org/2002/07/owl#DeprecatedProperty",
      /** The class of functional properties. */
      "FunctionalProperty": "http://www.w3.org/2002/07/owl#FunctionalProperty",
      /** The class of inverse-functional properties. */
      "InverseFunctionalProperty": "http://www.w3.org/2002/07/owl#InverseFunctionalProperty",
      /** The class of irreflexive properties. */
      "IrreflexiveProperty": "http://www.w3.org/2002/07/owl#IrreflexiveProperty",
      /** The class of named individuals. */
      "NamedIndividual": "http://www.w3.org/2002/07/owl#NamedIndividual",
      /** The class of negative property assertions. */
      "NegativePropertyAssertion": "http://www.w3.org/2002/07/owl#NegativePropertyAssertion",
      /** This is the empty class. */
      "Nothing": "http://www.w3.org/2002/07/owl#Nothing",
      /** The class of object properties. */
      "ObjectProperty": "http://www.w3.org/2002/07/owl#ObjectProperty",
      /** The class of ontologies. */
      "Ontology": "http://www.w3.org/2002/07/owl#Ontology",
      /** The class of ontology properties. */
      "OntologyProperty": "http://www.w3.org/2002/07/owl#OntologyProperty",
      /** The class of reflexive properties. */
      "ReflexiveProperty": "http://www.w3.org/2002/07/owl#ReflexiveProperty",
      /** The class of property restrictions. */
      "Restriction": "http://www.w3.org/2002/07/owl#Restriction",
      /** The class of symmetric properties. */
      "SymmetricProperty": "http://www.w3.org/2002/07/owl#SymmetricProperty",
      /** The class of OWL individuals. */
      "Thing": "http://www.w3.org/2002/07/owl#Thing",
      /** The class of transitive properties. */
      "TransitiveProperty": "http://www.w3.org/2002/07/owl#TransitiveProperty",
      /** The property that determines the class that a universal property restriction refers to. */
      "allValuesFrom": "http://www.w3.org/2002/07/owl#allValuesFrom",
      /** The property that determines the predicate of an annotated axiom or annotated annotation. */
      "annotatedProperty": "http://www.w3.org/2002/07/owl#annotatedProperty",
      /** The property that determines the subject of an annotated axiom or annotated annotation. */
      "annotatedSource": "http://www.w3.org/2002/07/owl#annotatedSource",
      /** The property that determines the object of an annotated axiom or annotated annotation. */
      "annotatedTarget": "http://www.w3.org/2002/07/owl#annotatedTarget",
      /** The property that determines the predicate of a negative property assertion. */
      "assertionProperty": "http://www.w3.org/2002/07/owl#assertionProperty",
      /** The annotation property that indicates that a given ontology is backward compatible with another ontology. */
      "backwardCompatibleWith": "http://www.w3.org/2002/07/owl#backwardCompatibleWith",
      /** The data property that does not relate any individual to any data value. */
      "bottomDataProperty": "http://www.w3.org/2002/07/owl#bottomDataProperty",
      /** The object property that does not relate any two individuals. */
      "bottomObjectProperty": "http://www.w3.org/2002/07/owl#bottomObjectProperty",
      /** The property that determines the cardinality of an exact cardinality restriction. */
      "cardinality": "http://www.w3.org/2002/07/owl#cardinality",
      /** The property that determines that a given class is the complement of another class. */
      "complementOf": "http://www.w3.org/2002/07/owl#complementOf",
      /** The property that determines that a given data range is the complement of another data range with respect to the data domain. */
      "datatypeComplementOf": "http://www.w3.org/2002/07/owl#datatypeComplementOf",
      /** The annotation property that indicates that a given entity has been deprecated. */
      "deprecated": "http://www.w3.org/2002/07/owl#deprecated",
      /** The property that determines that two given individuals are different. */
      "differentFrom": "http://www.w3.org/2002/07/owl#differentFrom",
      /** The property that determines that a given class is equivalent to the disjoint union of a collection of other classes. */
      "disjointUnionOf": "http://www.w3.org/2002/07/owl#disjointUnionOf",
      /** The property that determines that two given classes are disjoint. */
      "disjointWith": "http://www.w3.org/2002/07/owl#disjointWith",
      /** The property that determines the collection of pairwise different individuals in a owl:AllDifferent axiom. */
      "distinctMembers": "http://www.w3.org/2002/07/owl#distinctMembers",
      /** The property that determines that two given classes are equivalent, and that is used to specify datatype definitions. */
      "equivalentClass": "http://www.w3.org/2002/07/owl#equivalentClass",
      /** The property that determines that two given properties are equivalent. */
      "equivalentProperty": "http://www.w3.org/2002/07/owl#equivalentProperty",
      /** The property that determines the collection of properties that jointly build a key. */
      "hasKey": "http://www.w3.org/2002/07/owl#hasKey",
      /** The property that determines the property that a self restriction refers to. */
      "hasSelf": "http://www.w3.org/2002/07/owl#hasSelf",
      /** The property that determines the individual that a has-value restriction refers to. */
      "hasValue": "http://www.w3.org/2002/07/owl#hasValue",
      /** The property that is used for importing other ontologies into a given ontology. */
      "imports": "http://www.w3.org/2002/07/owl#imports",
      /** The annotation property that indicates that a given ontology is incompatible with another ontology. */
      "incompatibleWith": "http://www.w3.org/2002/07/owl#incompatibleWith",
      /** The property that determines the collection of classes or data ranges that build an intersection. */
      "intersectionOf": "http://www.w3.org/2002/07/owl#intersectionOf",
      /** The property that determines that two given properties are inverse. */
      "inverseOf": "http://www.w3.org/2002/07/owl#inverseOf",
      /** The property that determines the cardinality of a maximum cardinality restriction. */
      "maxCardinality": "http://www.w3.org/2002/07/owl#maxCardinality",
      /** The property that determines the cardinality of a maximum qualified cardinality restriction. */
      "maxQualifiedCardinality": "http://www.w3.org/2002/07/owl#maxQualifiedCardinality",
      /** The property that determines the collection of members in either a owl:AllDifferent, owl:AllDisjointClasses or owl:AllDisjointProperties axiom. */
      "members": "http://www.w3.org/2002/07/owl#members",
      /** The property that determines the cardinality of a minimum cardinality restriction. */
      "minCardinality": "http://www.w3.org/2002/07/owl#minCardinality",
      /** The property that determines the cardinality of a minimum qualified cardinality restriction. */
      "minQualifiedCardinality": "http://www.w3.org/2002/07/owl#minQualifiedCardinality",
      /** The property that determines the class that a qualified object cardinality restriction refers to. */
      "onClass": "http://www.w3.org/2002/07/owl#onClass",
      /** The property that determines the data range that a qualified data cardinality restriction refers to. */
      "onDataRange": "http://www.w3.org/2002/07/owl#onDataRange",
      /** The property that determines the datatype that a datatype restriction refers to. */
      "onDatatype": "http://www.w3.org/2002/07/owl#onDatatype",
      /** The property that determines the n-tuple of properties that a property restriction on an n-ary data range refers to. */
      "onProperties": "http://www.w3.org/2002/07/owl#onProperties",
      /** The property that determines the property that a property restriction refers to. */
      "onProperty": "http://www.w3.org/2002/07/owl#onProperty",
      /** The property that determines the collection of individuals or data values that build an enumeration. */
      "oneOf": "http://www.w3.org/2002/07/owl#oneOf",
      /** The annotation property that indicates the predecessor ontology of a given ontology. */
      "priorVersion": "http://www.w3.org/2002/07/owl#priorVersion",
      /** The property that determines the n-tuple of properties that build a sub property chain of a given property. */
      "propertyChainAxiom": "http://www.w3.org/2002/07/owl#propertyChainAxiom",
      /** The property that determines that two given properties are disjoint. */
      "propertyDisjointWith": "http://www.w3.org/2002/07/owl#propertyDisjointWith",
      /** The property that determines the cardinality of an exact qualified cardinality restriction. */
      "qualifiedCardinality": "http://www.w3.org/2002/07/owl#qualifiedCardinality",
      /** The property that determines that two given individuals are equal. */
      "sameAs": "http://www.w3.org/2002/07/owl#sameAs",
      /** The property that determines the class that an existential property restriction refers to. */
      "someValuesFrom": "http://www.w3.org/2002/07/owl#someValuesFrom",
      /** The property that determines the subject of a negative property assertion. */
      "sourceIndividual": "http://www.w3.org/2002/07/owl#sourceIndividual",
      /** The property that determines the object of a negative object property assertion. */
      "targetIndividual": "http://www.w3.org/2002/07/owl#targetIndividual",
      /** The property that determines the value of a negative data property assertion. */
      "targetValue": "http://www.w3.org/2002/07/owl#targetValue",
      /** The data property that relates every individual to every data value. */
      "topDataProperty": "http://www.w3.org/2002/07/owl#topDataProperty",
      /** The object property that relates every two individuals. */
      "topObjectProperty": "http://www.w3.org/2002/07/owl#topObjectProperty",
      /** The property that determines the collection of classes or data ranges that build a union. */
      "unionOf": "http://www.w3.org/2002/07/owl#unionOf",
      /** The property that identifies the version IRI of an ontology. */
      "versionIRI": "http://www.w3.org/2002/07/owl#versionIRI",
      /** The annotation property that provides version information for an ontology or another OWL construct. */
      "versionInfo": "http://www.w3.org/2002/07/owl#versionInfo",
      /** The property that determines the collection of facet-value pairs that define a datatype restriction. */
      "withRestrictions": "http://www.w3.org/2002/07/owl#withRestrictions"
    };
    exports.owl = {
      /** The class of collections of pairwise different individuals. */
      "AllDifferent": new n3.NamedNode("http://www.w3.org/2002/07/owl#AllDifferent"),
      /** The class of collections of pairwise disjoint classes. */
      "AllDisjointClasses": new n3.NamedNode("http://www.w3.org/2002/07/owl#AllDisjointClasses"),
      /** The class of collections of pairwise disjoint properties. */
      "AllDisjointProperties": new n3.NamedNode("http://www.w3.org/2002/07/owl#AllDisjointProperties"),
      /** The class of annotated annotations for which the RDF serialization consists of an annotated subject, predicate and object. */
      "Annotation": new n3.NamedNode("http://www.w3.org/2002/07/owl#Annotation"),
      /** The class of annotation properties. */
      "AnnotationProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#AnnotationProperty"),
      /** The class of asymmetric properties. */
      "AsymmetricProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#AsymmetricProperty"),
      /** The class of annotated axioms for which the RDF serialization consists of an annotated subject, predicate and object. */
      "Axiom": new n3.NamedNode("http://www.w3.org/2002/07/owl#Axiom"),
      /** The class of OWL classes. */
      "Class": new n3.NamedNode("http://www.w3.org/2002/07/owl#Class"),
      /** The class of OWL data ranges, which are special kinds of datatypes. Note: The use of the IRI owl:DataRange has been deprecated as of OWL 2. The IRI rdfs:Datatype SHOULD be used instead. */
      "DataRange": new n3.NamedNode("http://www.w3.org/2002/07/owl#DataRange"),
      /** The class of data properties. */
      "DatatypeProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#DatatypeProperty"),
      /** The class of deprecated classes. */
      "DeprecatedClass": new n3.NamedNode("http://www.w3.org/2002/07/owl#DeprecatedClass"),
      /** The class of deprecated properties. */
      "DeprecatedProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#DeprecatedProperty"),
      /** The class of functional properties. */
      "FunctionalProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#FunctionalProperty"),
      /** The class of inverse-functional properties. */
      "InverseFunctionalProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#InverseFunctionalProperty"),
      /** The class of irreflexive properties. */
      "IrreflexiveProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#IrreflexiveProperty"),
      /** The class of named individuals. */
      "NamedIndividual": new n3.NamedNode("http://www.w3.org/2002/07/owl#NamedIndividual"),
      /** The class of negative property assertions. */
      "NegativePropertyAssertion": new n3.NamedNode("http://www.w3.org/2002/07/owl#NegativePropertyAssertion"),
      /** This is the empty class. */
      "Nothing": new n3.NamedNode("http://www.w3.org/2002/07/owl#Nothing"),
      /** The class of object properties. */
      "ObjectProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#ObjectProperty"),
      /** The class of ontologies. */
      "Ontology": new n3.NamedNode("http://www.w3.org/2002/07/owl#Ontology"),
      /** The class of ontology properties. */
      "OntologyProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#OntologyProperty"),
      /** The class of reflexive properties. */
      "ReflexiveProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#ReflexiveProperty"),
      /** The class of property restrictions. */
      "Restriction": new n3.NamedNode("http://www.w3.org/2002/07/owl#Restriction"),
      /** The class of symmetric properties. */
      "SymmetricProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#SymmetricProperty"),
      /** The class of OWL individuals. */
      "Thing": new n3.NamedNode("http://www.w3.org/2002/07/owl#Thing"),
      /** The class of transitive properties. */
      "TransitiveProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#TransitiveProperty"),
      /** The property that determines the class that a universal property restriction refers to. */
      "allValuesFrom": new n3.NamedNode("http://www.w3.org/2002/07/owl#allValuesFrom"),
      /** The property that determines the predicate of an annotated axiom or annotated annotation. */
      "annotatedProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#annotatedProperty"),
      /** The property that determines the subject of an annotated axiom or annotated annotation. */
      "annotatedSource": new n3.NamedNode("http://www.w3.org/2002/07/owl#annotatedSource"),
      /** The property that determines the object of an annotated axiom or annotated annotation. */
      "annotatedTarget": new n3.NamedNode("http://www.w3.org/2002/07/owl#annotatedTarget"),
      /** The property that determines the predicate of a negative property assertion. */
      "assertionProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#assertionProperty"),
      /** The annotation property that indicates that a given ontology is backward compatible with another ontology. */
      "backwardCompatibleWith": new n3.NamedNode("http://www.w3.org/2002/07/owl#backwardCompatibleWith"),
      /** The data property that does not relate any individual to any data value. */
      "bottomDataProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#bottomDataProperty"),
      /** The object property that does not relate any two individuals. */
      "bottomObjectProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#bottomObjectProperty"),
      /** The property that determines the cardinality of an exact cardinality restriction. */
      "cardinality": new n3.NamedNode("http://www.w3.org/2002/07/owl#cardinality"),
      /** The property that determines that a given class is the complement of another class. */
      "complementOf": new n3.NamedNode("http://www.w3.org/2002/07/owl#complementOf"),
      /** The property that determines that a given data range is the complement of another data range with respect to the data domain. */
      "datatypeComplementOf": new n3.NamedNode("http://www.w3.org/2002/07/owl#datatypeComplementOf"),
      /** The annotation property that indicates that a given entity has been deprecated. */
      "deprecated": new n3.NamedNode("http://www.w3.org/2002/07/owl#deprecated"),
      /** The property that determines that two given individuals are different. */
      "differentFrom": new n3.NamedNode("http://www.w3.org/2002/07/owl#differentFrom"),
      /** The property that determines that a given class is equivalent to the disjoint union of a collection of other classes. */
      "disjointUnionOf": new n3.NamedNode("http://www.w3.org/2002/07/owl#disjointUnionOf"),
      /** The property that determines that two given classes are disjoint. */
      "disjointWith": new n3.NamedNode("http://www.w3.org/2002/07/owl#disjointWith"),
      /** The property that determines the collection of pairwise different individuals in a owl:AllDifferent axiom. */
      "distinctMembers": new n3.NamedNode("http://www.w3.org/2002/07/owl#distinctMembers"),
      /** The property that determines that two given classes are equivalent, and that is used to specify datatype definitions. */
      "equivalentClass": new n3.NamedNode("http://www.w3.org/2002/07/owl#equivalentClass"),
      /** The property that determines that two given properties are equivalent. */
      "equivalentProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#equivalentProperty"),
      /** The property that determines the collection of properties that jointly build a key. */
      "hasKey": new n3.NamedNode("http://www.w3.org/2002/07/owl#hasKey"),
      /** The property that determines the property that a self restriction refers to. */
      "hasSelf": new n3.NamedNode("http://www.w3.org/2002/07/owl#hasSelf"),
      /** The property that determines the individual that a has-value restriction refers to. */
      "hasValue": new n3.NamedNode("http://www.w3.org/2002/07/owl#hasValue"),
      /** The property that is used for importing other ontologies into a given ontology. */
      "imports": new n3.NamedNode("http://www.w3.org/2002/07/owl#imports"),
      /** The annotation property that indicates that a given ontology is incompatible with another ontology. */
      "incompatibleWith": new n3.NamedNode("http://www.w3.org/2002/07/owl#incompatibleWith"),
      /** The property that determines the collection of classes or data ranges that build an intersection. */
      "intersectionOf": new n3.NamedNode("http://www.w3.org/2002/07/owl#intersectionOf"),
      /** The property that determines that two given properties are inverse. */
      "inverseOf": new n3.NamedNode("http://www.w3.org/2002/07/owl#inverseOf"),
      /** The property that determines the cardinality of a maximum cardinality restriction. */
      "maxCardinality": new n3.NamedNode("http://www.w3.org/2002/07/owl#maxCardinality"),
      /** The property that determines the cardinality of a maximum qualified cardinality restriction. */
      "maxQualifiedCardinality": new n3.NamedNode("http://www.w3.org/2002/07/owl#maxQualifiedCardinality"),
      /** The property that determines the collection of members in either a owl:AllDifferent, owl:AllDisjointClasses or owl:AllDisjointProperties axiom. */
      "members": new n3.NamedNode("http://www.w3.org/2002/07/owl#members"),
      /** The property that determines the cardinality of a minimum cardinality restriction. */
      "minCardinality": new n3.NamedNode("http://www.w3.org/2002/07/owl#minCardinality"),
      /** The property that determines the cardinality of a minimum qualified cardinality restriction. */
      "minQualifiedCardinality": new n3.NamedNode("http://www.w3.org/2002/07/owl#minQualifiedCardinality"),
      /** The property that determines the class that a qualified object cardinality restriction refers to. */
      "onClass": new n3.NamedNode("http://www.w3.org/2002/07/owl#onClass"),
      /** The property that determines the data range that a qualified data cardinality restriction refers to. */
      "onDataRange": new n3.NamedNode("http://www.w3.org/2002/07/owl#onDataRange"),
      /** The property that determines the datatype that a datatype restriction refers to. */
      "onDatatype": new n3.NamedNode("http://www.w3.org/2002/07/owl#onDatatype"),
      /** The property that determines the n-tuple of properties that a property restriction on an n-ary data range refers to. */
      "onProperties": new n3.NamedNode("http://www.w3.org/2002/07/owl#onProperties"),
      /** The property that determines the property that a property restriction refers to. */
      "onProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#onProperty"),
      /** The property that determines the collection of individuals or data values that build an enumeration. */
      "oneOf": new n3.NamedNode("http://www.w3.org/2002/07/owl#oneOf"),
      /** The annotation property that indicates the predecessor ontology of a given ontology. */
      "priorVersion": new n3.NamedNode("http://www.w3.org/2002/07/owl#priorVersion"),
      /** The property that determines the n-tuple of properties that build a sub property chain of a given property. */
      "propertyChainAxiom": new n3.NamedNode("http://www.w3.org/2002/07/owl#propertyChainAxiom"),
      /** The property that determines that two given properties are disjoint. */
      "propertyDisjointWith": new n3.NamedNode("http://www.w3.org/2002/07/owl#propertyDisjointWith"),
      /** The property that determines the cardinality of an exact qualified cardinality restriction. */
      "qualifiedCardinality": new n3.NamedNode("http://www.w3.org/2002/07/owl#qualifiedCardinality"),
      /** The property that determines that two given individuals are equal. */
      "sameAs": new n3.NamedNode("http://www.w3.org/2002/07/owl#sameAs"),
      /** The property that determines the class that an existential property restriction refers to. */
      "someValuesFrom": new n3.NamedNode("http://www.w3.org/2002/07/owl#someValuesFrom"),
      /** The property that determines the subject of a negative property assertion. */
      "sourceIndividual": new n3.NamedNode("http://www.w3.org/2002/07/owl#sourceIndividual"),
      /** The property that determines the object of a negative object property assertion. */
      "targetIndividual": new n3.NamedNode("http://www.w3.org/2002/07/owl#targetIndividual"),
      /** The property that determines the value of a negative data property assertion. */
      "targetValue": new n3.NamedNode("http://www.w3.org/2002/07/owl#targetValue"),
      /** The data property that relates every individual to every data value. */
      "topDataProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#topDataProperty"),
      /** The object property that relates every two individuals. */
      "topObjectProperty": new n3.NamedNode("http://www.w3.org/2002/07/owl#topObjectProperty"),
      /** The property that determines the collection of classes or data ranges that build a union. */
      "unionOf": new n3.NamedNode("http://www.w3.org/2002/07/owl#unionOf"),
      /** The property that identifies the version IRI of an ontology. */
      "versionIRI": new n3.NamedNode("http://www.w3.org/2002/07/owl#versionIRI"),
      /** The annotation property that provides version information for an ontology or another OWL construct. */
      "versionInfo": new n3.NamedNode("http://www.w3.org/2002/07/owl#versionInfo"),
      /** The property that determines the collection of facet-value pairs that define a datatype restriction. */
      "withRestrictions": new n3.NamedNode("http://www.w3.org/2002/07/owl#withRestrictions")
    };
  }
});

// node_modules/@faubulous/mentor-rdf/dist/ontologies/rdf.js
var require_rdf = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/ontologies/rdf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.rdf = exports.RDF = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    exports.RDF = {
      /** The class of containers of alternatives. */
      "Alt": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Alt",
      /** The class of unordered containers. */
      "Bag": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag",
      /** A class representing a compound literal. */
      "CompoundLiteral": "http://www.w3.org/1999/02/22-rdf-syntax-ns#CompoundLiteral",
      /** The datatype of RDF literals storing fragments of HTML content */
      "HTML": "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML",
      /** The datatype of RDF literals storing JSON content. */
      "JSON": "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON",
      /** The class of RDF Lists. */
      "List": "http://www.w3.org/1999/02/22-rdf-syntax-ns#List",
      /** The class of plain (i.e. untyped) literal values, as used in RIF and OWL 2 */
      "PlainLiteral": "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral",
      /** The class of RDF properties. */
      "Property": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property",
      /** The class of ordered containers. */
      "Seq": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Seq",
      /** The class of RDF statements. */
      "Statement": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Statement",
      /** The datatype of XML literal values. */
      "XMLLiteral": "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral",
      /** The base direction component of a CompoundLiteral. */
      "direction": "http://www.w3.org/1999/02/22-rdf-syntax-ns#direction",
      /** The first item in the subject RDF list. */
      "first": "http://www.w3.org/1999/02/22-rdf-syntax-ns#first",
      /** The datatype of language-tagged string values */
      "langString": "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
      /** The language component of a CompoundLiteral. */
      "language": "http://www.w3.org/1999/02/22-rdf-syntax-ns#language",
      /** The empty list, with no items in it. If the rest of a list is nil then the list has no more items in it. */
      "nil": "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil",
      /** The object of the subject RDF statement. */
      "object": "http://www.w3.org/1999/02/22-rdf-syntax-ns#object",
      /** The predicate of the subject RDF statement. */
      "predicate": "http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate",
      /** The rest of the subject RDF list after the first item. */
      "rest": "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest",
      /** The subject of the subject RDF statement. */
      "subject": "http://www.w3.org/1999/02/22-rdf-syntax-ns#subject",
      /** The subject is an instance of a class. */
      "type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      /** Idiomatic property used for structured values. */
      "value": "http://www.w3.org/1999/02/22-rdf-syntax-ns#value"
    };
    exports.rdf = {
      /** The class of containers of alternatives. */
      "Alt": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#Alt"),
      /** The class of unordered containers. */
      "Bag": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#Bag"),
      /** A class representing a compound literal. */
      "CompoundLiteral": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#CompoundLiteral"),
      /** The datatype of RDF literals storing fragments of HTML content */
      "HTML": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML"),
      /** The datatype of RDF literals storing JSON content. */
      "JSON": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON"),
      /** The class of RDF Lists. */
      "List": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#List"),
      /** The class of plain (i.e. untyped) literal values, as used in RIF and OWL 2 */
      "PlainLiteral": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"),
      /** The class of RDF properties. */
      "Property": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"),
      /** The class of ordered containers. */
      "Seq": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#Seq"),
      /** The class of RDF statements. */
      "Statement": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#Statement"),
      /** The datatype of XML literal values. */
      "XMLLiteral": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral"),
      /** The base direction component of a CompoundLiteral. */
      "direction": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#direction"),
      /** The first item in the subject RDF list. */
      "first": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#first"),
      /** The datatype of language-tagged string values */
      "langString": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"),
      /** The language component of a CompoundLiteral. */
      "language": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#language"),
      /** The empty list, with no items in it. If the rest of a list is nil then the list has no more items in it. */
      "nil": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"),
      /** The object of the subject RDF statement. */
      "object": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#object"),
      /** The predicate of the subject RDF statement. */
      "predicate": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate"),
      /** The rest of the subject RDF list after the first item. */
      "rest": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"),
      /** The subject of the subject RDF statement. */
      "subject": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#subject"),
      /** The subject is an instance of a class. */
      "type": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      /** Idiomatic property used for structured values. */
      "value": new n3.NamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#value")
    };
  }
});

// node_modules/@faubulous/mentor-rdf/dist/ontologies/rdfa.js
var require_rdfa = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/ontologies/rdfa.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.rdfa = exports.RDFA = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    exports.RDFA = {
      "me": "http://www.ivan-herman.net/foaf#me",
      "DocumentError": "http://www.w3.org/ns/rdfa#DocumentError",
      "Error": "http://www.w3.org/ns/rdfa#Error",
      "Info": "http://www.w3.org/ns/rdfa#Info",
      "PGClass": "http://www.w3.org/ns/rdfa#PGClass",
      "Pattern": "http://www.w3.org/ns/rdfa#Pattern",
      "PrefixMapping": "http://www.w3.org/ns/rdfa#PrefixMapping",
      "PrefixOrTermMapping": "http://www.w3.org/ns/rdfa#PrefixOrTermMapping",
      "PrefixRedefinition": "http://www.w3.org/ns/rdfa#PrefixRedefinition",
      "TermMapping": "http://www.w3.org/ns/rdfa#TermMapping",
      "UnresolvedCURIE": "http://www.w3.org/ns/rdfa#UnresolvedCURIE",
      "UnresolvedTerm": "http://www.w3.org/ns/rdfa#UnresolvedTerm",
      "VocabReferenceError": "http://www.w3.org/ns/rdfa#VocabReferenceError",
      "Warning": "http://www.w3.org/ns/rdfa#Warning",
      "context": "http://www.w3.org/ns/rdfa#context",
      "copy": "http://www.w3.org/ns/rdfa#copy",
      "prefix": "http://www.w3.org/ns/rdfa#prefix",
      "term": "http://www.w3.org/ns/rdfa#term",
      "uri": "http://www.w3.org/ns/rdfa#uri",
      "usesVocabulary": "http://www.w3.org/ns/rdfa#usesVocabulary",
      "vocabulary": "http://www.w3.org/ns/rdfa#vocabulary"
    };
    exports.rdfa = {
      "me": new n3.NamedNode("http://www.ivan-herman.net/foaf#me"),
      "DocumentError": new n3.NamedNode("http://www.w3.org/ns/rdfa#DocumentError"),
      "Error": new n3.NamedNode("http://www.w3.org/ns/rdfa#Error"),
      "Info": new n3.NamedNode("http://www.w3.org/ns/rdfa#Info"),
      "PGClass": new n3.NamedNode("http://www.w3.org/ns/rdfa#PGClass"),
      "Pattern": new n3.NamedNode("http://www.w3.org/ns/rdfa#Pattern"),
      "PrefixMapping": new n3.NamedNode("http://www.w3.org/ns/rdfa#PrefixMapping"),
      "PrefixOrTermMapping": new n3.NamedNode("http://www.w3.org/ns/rdfa#PrefixOrTermMapping"),
      "PrefixRedefinition": new n3.NamedNode("http://www.w3.org/ns/rdfa#PrefixRedefinition"),
      "TermMapping": new n3.NamedNode("http://www.w3.org/ns/rdfa#TermMapping"),
      "UnresolvedCURIE": new n3.NamedNode("http://www.w3.org/ns/rdfa#UnresolvedCURIE"),
      "UnresolvedTerm": new n3.NamedNode("http://www.w3.org/ns/rdfa#UnresolvedTerm"),
      "VocabReferenceError": new n3.NamedNode("http://www.w3.org/ns/rdfa#VocabReferenceError"),
      "Warning": new n3.NamedNode("http://www.w3.org/ns/rdfa#Warning"),
      "context": new n3.NamedNode("http://www.w3.org/ns/rdfa#context"),
      "copy": new n3.NamedNode("http://www.w3.org/ns/rdfa#copy"),
      "prefix": new n3.NamedNode("http://www.w3.org/ns/rdfa#prefix"),
      "term": new n3.NamedNode("http://www.w3.org/ns/rdfa#term"),
      "uri": new n3.NamedNode("http://www.w3.org/ns/rdfa#uri"),
      "usesVocabulary": new n3.NamedNode("http://www.w3.org/ns/rdfa#usesVocabulary"),
      "vocabulary": new n3.NamedNode("http://www.w3.org/ns/rdfa#vocabulary")
    };
  }
});

// node_modules/@faubulous/mentor-rdf/dist/ontologies/rdfs.js
var require_rdfs = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/ontologies/rdfs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.rdfs = exports.RDFS = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    exports.RDFS = {
      /** The class of classes. */
      "Class": "http://www.w3.org/2000/01/rdf-schema#Class",
      /** The class of RDF containers. */
      "Container": "http://www.w3.org/2000/01/rdf-schema#Container",
      /** The class of container membership properties, rdf:_1, rdf:_2, ...,
                      all of which are sub-properties of 'member'. */
      "ContainerMembershipProperty": "http://www.w3.org/2000/01/rdf-schema#ContainerMembershipProperty",
      /** The class of RDF datatypes. */
      "Datatype": "http://www.w3.org/2000/01/rdf-schema#Datatype",
      /** The class of literal values, eg. textual strings and integers. */
      "Literal": "http://www.w3.org/2000/01/rdf-schema#Literal",
      /** The class resource, everything. */
      "Resource": "http://www.w3.org/2000/01/rdf-schema#Resource",
      /** A description of the subject resource. */
      "comment": "http://www.w3.org/2000/01/rdf-schema#comment",
      /** A domain of the subject property. */
      "domain": "http://www.w3.org/2000/01/rdf-schema#domain",
      /** The defininition of the subject resource. */
      "isDefinedBy": "http://www.w3.org/2000/01/rdf-schema#isDefinedBy",
      /** A human-readable name for the subject. */
      "label": "http://www.w3.org/2000/01/rdf-schema#label",
      /** A member of the subject resource. */
      "member": "http://www.w3.org/2000/01/rdf-schema#member",
      /** A range of the subject property. */
      "range": "http://www.w3.org/2000/01/rdf-schema#range",
      /** Further information about the subject resource. */
      "seeAlso": "http://www.w3.org/2000/01/rdf-schema#seeAlso",
      /** The subject is a subclass of a class. */
      "subClassOf": "http://www.w3.org/2000/01/rdf-schema#subClassOf",
      /** The subject is a subproperty of a property. */
      "subPropertyOf": "http://www.w3.org/2000/01/rdf-schema#subPropertyOf"
    };
    exports.rdfs = {
      /** The class of classes. */
      "Class": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#Class"),
      /** The class of RDF containers. */
      "Container": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#Container"),
      /** The class of container membership properties, rdf:_1, rdf:_2, ...,
                      all of which are sub-properties of 'member'. */
      "ContainerMembershipProperty": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#ContainerMembershipProperty"),
      /** The class of RDF datatypes. */
      "Datatype": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#Datatype"),
      /** The class of literal values, eg. textual strings and integers. */
      "Literal": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#Literal"),
      /** The class resource, everything. */
      "Resource": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#Resource"),
      /** A description of the subject resource. */
      "comment": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#comment"),
      /** A domain of the subject property. */
      "domain": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#domain"),
      /** The defininition of the subject resource. */
      "isDefinedBy": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#isDefinedBy"),
      /** A human-readable name for the subject. */
      "label": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#label"),
      /** A member of the subject resource. */
      "member": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#member"),
      /** A range of the subject property. */
      "range": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#range"),
      /** Further information about the subject resource. */
      "seeAlso": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#seeAlso"),
      /** The subject is a subclass of a class. */
      "subClassOf": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf"),
      /** The subject is a subproperty of a property. */
      "subPropertyOf": new n3.NamedNode("http://www.w3.org/2000/01/rdf-schema#subPropertyOf")
    };
  }
});

// node_modules/@faubulous/mentor-rdf/dist/ontologies/shacl.js
var require_shacl = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/ontologies/shacl.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.shacl = exports.SHACL = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    exports.SHACL = {
      /** The base class of validation results, typically not instantiated directly. */
      "AbstractResult": "http://www.w3.org/ns/shacl#AbstractResult",
      /** A constraint component that can be used to test whether a value node conforms to all members of a provided list of shapes. */
      "AndConstraintComponent": "http://www.w3.org/ns/shacl#AndConstraintComponent",
      "AndConstraintComponent-and": "http://www.w3.org/ns/shacl#AndConstraintComponent-and",
      /** The node kind of all blank nodes. */
      "BlankNode": "http://www.w3.org/ns/shacl#BlankNode",
      /** The node kind of all blank nodes or IRIs. */
      "BlankNodeOrIRI": "http://www.w3.org/ns/shacl#BlankNodeOrIRI",
      /** The node kind of all blank nodes or literals. */
      "BlankNodeOrLiteral": "http://www.w3.org/ns/shacl#BlankNodeOrLiteral",
      /** A constraint component that can be used to verify that each value node is an instance of a given type. */
      "ClassConstraintComponent": "http://www.w3.org/ns/shacl#ClassConstraintComponent",
      "ClassConstraintComponent-class": "http://www.w3.org/ns/shacl#ClassConstraintComponent-class",
      /** A constraint component that can be used to indicate that focus nodes must only have values for those properties that have been explicitly enumerated via sh:property/sh:path. */
      "ClosedConstraintComponent": "http://www.w3.org/ns/shacl#ClosedConstraintComponent",
      "ClosedConstraintComponent-closed": "http://www.w3.org/ns/shacl#ClosedConstraintComponent-closed",
      "ClosedConstraintComponent-ignoredProperties": "http://www.w3.org/ns/shacl#ClosedConstraintComponent-ignoredProperties",
      /** The class of constraint components. */
      "ConstraintComponent": "http://www.w3.org/ns/shacl#ConstraintComponent",
      /** A constraint component that can be used to restrict the datatype of all value nodes. */
      "DatatypeConstraintComponent": "http://www.w3.org/ns/shacl#DatatypeConstraintComponent",
      "DatatypeConstraintComponent-datatype": "http://www.w3.org/ns/shacl#DatatypeConstraintComponent-datatype",
      /** A constraint component that can be used to verify that the set of value nodes is disjoint with the the set of nodes that have the focus node as subject and the value of a given property as predicate. */
      "DisjointConstraintComponent": "http://www.w3.org/ns/shacl#DisjointConstraintComponent",
      "DisjointConstraintComponent-disjoint": "http://www.w3.org/ns/shacl#DisjointConstraintComponent-disjoint",
      /** A constraint component that can be used to verify that the set of value nodes is equal to the set of nodes that have the focus node as subject and the value of a given property as predicate. */
      "EqualsConstraintComponent": "http://www.w3.org/ns/shacl#EqualsConstraintComponent",
      "EqualsConstraintComponent-equals": "http://www.w3.org/ns/shacl#EqualsConstraintComponent-equals",
      /** A constraint component that can be used to verify that a given node expression produces true for all value nodes. */
      "ExpressionConstraintComponent": "http://www.w3.org/ns/shacl#ExpressionConstraintComponent",
      "ExpressionConstraintComponent-expression": "http://www.w3.org/ns/shacl#ExpressionConstraintComponent-expression",
      /** The class of SHACL functions. */
      "Function": "http://www.w3.org/ns/shacl#Function",
      /** A constraint component that can be used to verify that one of the value nodes is a given RDF node. */
      "HasValueConstraintComponent": "http://www.w3.org/ns/shacl#HasValueConstraintComponent",
      "HasValueConstraintComponent-hasValue": "http://www.w3.org/ns/shacl#HasValueConstraintComponent-hasValue",
      /** The node kind of all IRIs. */
      "IRI": "http://www.w3.org/ns/shacl#IRI",
      /** The node kind of all IRIs or literals. */
      "IRIOrLiteral": "http://www.w3.org/ns/shacl#IRIOrLiteral",
      /** A constraint component that can be used to exclusively enumerate the permitted value nodes. */
      "InConstraintComponent": "http://www.w3.org/ns/shacl#InConstraintComponent",
      "InConstraintComponent-in": "http://www.w3.org/ns/shacl#InConstraintComponent-in",
      /** The severity for an informational validation result. */
      "Info": "http://www.w3.org/ns/shacl#Info",
      /** The class of constraints backed by a JavaScript function. */
      "JSConstraint": "http://www.w3.org/ns/shacl#JSConstraint",
      "JSConstraint-js": "http://www.w3.org/ns/shacl#JSConstraint-js",
      /** A constraint component with the parameter sh:js linking to a sh:JSConstraint containing a sh:script. */
      "JSConstraintComponent": "http://www.w3.org/ns/shacl#JSConstraintComponent",
      /** Abstract base class of resources that declare an executable JavaScript. */
      "JSExecutable": "http://www.w3.org/ns/shacl#JSExecutable",
      /** The class of SHACL functions that execute a JavaScript function when called. */
      "JSFunction": "http://www.w3.org/ns/shacl#JSFunction",
      /** Represents a JavaScript library, typically identified by one or more URLs of files to include. */
      "JSLibrary": "http://www.w3.org/ns/shacl#JSLibrary",
      /** The class of SHACL rules expressed using JavaScript. */
      "JSRule": "http://www.w3.org/ns/shacl#JSRule",
      /** The class of targets that are based on JavaScript functions. */
      "JSTarget": "http://www.w3.org/ns/shacl#JSTarget",
      /** The (meta) class for parameterizable targets that are based on JavaScript functions. */
      "JSTargetType": "http://www.w3.org/ns/shacl#JSTargetType",
      /** A SHACL validator based on JavaScript. This can be used to declare SHACL constraint components that perform JavaScript-based validation when used. */
      "JSValidator": "http://www.w3.org/ns/shacl#JSValidator",
      /** A constraint component that can be used to enumerate language tags that all value nodes must have. */
      "LanguageInConstraintComponent": "http://www.w3.org/ns/shacl#LanguageInConstraintComponent",
      "LanguageInConstraintComponent-languageIn": "http://www.w3.org/ns/shacl#LanguageInConstraintComponent-languageIn",
      /** A constraint component that can be used to verify that each value node is smaller than all the nodes that have the focus node as subject and the value of a given property as predicate. */
      "LessThanConstraintComponent": "http://www.w3.org/ns/shacl#LessThanConstraintComponent",
      "LessThanConstraintComponent-lessThan": "http://www.w3.org/ns/shacl#LessThanConstraintComponent-lessThan",
      /** A constraint component that can be used to verify that every value node is smaller than all the nodes that have the focus node as subject and the value of a given property as predicate. */
      "LessThanOrEqualsConstraintComponent": "http://www.w3.org/ns/shacl#LessThanOrEqualsConstraintComponent",
      "LessThanOrEqualsConstraintComponent-lessThanOrEquals": "http://www.w3.org/ns/shacl#LessThanOrEqualsConstraintComponent-lessThanOrEquals",
      /** The node kind of all literals. */
      "Literal": "http://www.w3.org/ns/shacl#Literal",
      /** A constraint component that can be used to restrict the maximum number of value nodes. */
      "MaxCountConstraintComponent": "http://www.w3.org/ns/shacl#MaxCountConstraintComponent",
      "MaxCountConstraintComponent-maxCount": "http://www.w3.org/ns/shacl#MaxCountConstraintComponent-maxCount",
      /** A constraint component that can be used to restrict the range of value nodes with a maximum exclusive value. */
      "MaxExclusiveConstraintComponent": "http://www.w3.org/ns/shacl#MaxExclusiveConstraintComponent",
      "MaxExclusiveConstraintComponent-maxExclusive": "http://www.w3.org/ns/shacl#MaxExclusiveConstraintComponent-maxExclusive",
      /** A constraint component that can be used to restrict the range of value nodes with a maximum inclusive value. */
      "MaxInclusiveConstraintComponent": "http://www.w3.org/ns/shacl#MaxInclusiveConstraintComponent",
      "MaxInclusiveConstraintComponent-maxInclusive": "http://www.w3.org/ns/shacl#MaxInclusiveConstraintComponent-maxInclusive",
      /** A constraint component that can be used to restrict the maximum string length of value nodes. */
      "MaxLengthConstraintComponent": "http://www.w3.org/ns/shacl#MaxLengthConstraintComponent",
      "MaxLengthConstraintComponent-maxLength": "http://www.w3.org/ns/shacl#MaxLengthConstraintComponent-maxLength",
      /** A constraint component that can be used to restrict the minimum number of value nodes. */
      "MinCountConstraintComponent": "http://www.w3.org/ns/shacl#MinCountConstraintComponent",
      "MinCountConstraintComponent-minCount": "http://www.w3.org/ns/shacl#MinCountConstraintComponent-minCount",
      /** A constraint component that can be used to restrict the range of value nodes with a minimum exclusive value. */
      "MinExclusiveConstraintComponent": "http://www.w3.org/ns/shacl#MinExclusiveConstraintComponent",
      "MinExclusiveConstraintComponent-minExclusive": "http://www.w3.org/ns/shacl#MinExclusiveConstraintComponent-minExclusive",
      /** A constraint component that can be used to restrict the range of value nodes with a minimum inclusive value. */
      "MinInclusiveConstraintComponent": "http://www.w3.org/ns/shacl#MinInclusiveConstraintComponent",
      "MinInclusiveConstraintComponent-minInclusive": "http://www.w3.org/ns/shacl#MinInclusiveConstraintComponent-minInclusive",
      /** A constraint component that can be used to restrict the minimum string length of value nodes. */
      "MinLengthConstraintComponent": "http://www.w3.org/ns/shacl#MinLengthConstraintComponent",
      "MinLengthConstraintComponent-minLength": "http://www.w3.org/ns/shacl#MinLengthConstraintComponent-minLength",
      /** A constraint component that can be used to verify that all value nodes conform to the given node shape. */
      "NodeConstraintComponent": "http://www.w3.org/ns/shacl#NodeConstraintComponent",
      "NodeConstraintComponent-node": "http://www.w3.org/ns/shacl#NodeConstraintComponent-node",
      /** The class of all node kinds, including sh:BlankNode, sh:IRI, sh:Literal or the combinations of these: sh:BlankNodeOrIRI, sh:BlankNodeOrLiteral, sh:IRIOrLiteral. */
      "NodeKind": "http://www.w3.org/ns/shacl#NodeKind",
      /** A constraint component that can be used to restrict the RDF node kind of each value node. */
      "NodeKindConstraintComponent": "http://www.w3.org/ns/shacl#NodeKindConstraintComponent",
      "NodeKindConstraintComponent-nodeKind": "http://www.w3.org/ns/shacl#NodeKindConstraintComponent-nodeKind",
      /** A node shape is a shape that specifies constraint that need to be met with respect to focus nodes. */
      "NodeShape": "http://www.w3.org/ns/shacl#NodeShape",
      /** A constraint component that can be used to verify that value nodes do not conform to a given shape. */
      "NotConstraintComponent": "http://www.w3.org/ns/shacl#NotConstraintComponent",
      "NotConstraintComponent-not": "http://www.w3.org/ns/shacl#NotConstraintComponent-not",
      /** A constraint component that can be used to restrict the value nodes so that they conform to at least one out of several provided shapes. */
      "OrConstraintComponent": "http://www.w3.org/ns/shacl#OrConstraintComponent",
      "OrConstraintComponent-or": "http://www.w3.org/ns/shacl#OrConstraintComponent-or",
      /** The class of parameter declarations, consisting of a path predicate and (possibly) information about allowed value type, cardinality and other characteristics. */
      "Parameter": "http://www.w3.org/ns/shacl#Parameter",
      /** Superclass of components that can take parameters, especially functions and constraint components. */
      "Parameterizable": "http://www.w3.org/ns/shacl#Parameterizable",
      /** A constraint component that can be used to verify that every value node matches a given regular expression. */
      "PatternConstraintComponent": "http://www.w3.org/ns/shacl#PatternConstraintComponent",
      "PatternConstraintComponent-flags": "http://www.w3.org/ns/shacl#PatternConstraintComponent-flags",
      "PatternConstraintComponent-pattern": "http://www.w3.org/ns/shacl#PatternConstraintComponent-pattern",
      /** The class of prefix declarations, consisting of pairs of a prefix with a namespace. */
      "PrefixDeclaration": "http://www.w3.org/ns/shacl#PrefixDeclaration",
      /** A constraint component that can be used to verify that all value nodes conform to the given property shape. */
      "PropertyConstraintComponent": "http://www.w3.org/ns/shacl#PropertyConstraintComponent",
      "PropertyConstraintComponent-property": "http://www.w3.org/ns/shacl#PropertyConstraintComponent-property",
      /** Instances of this class represent groups of property shapes that belong together. */
      "PropertyGroup": "http://www.w3.org/ns/shacl#PropertyGroup",
      /** A property shape is a shape that specifies constraints on the values of a focus node for a given property or path. */
      "PropertyShape": "http://www.w3.org/ns/shacl#PropertyShape",
      /** A constraint component that can be used to verify that a specified maximum number of value nodes conforms to a given shape. */
      "QualifiedMaxCountConstraintComponent": "http://www.w3.org/ns/shacl#QualifiedMaxCountConstraintComponent",
      "QualifiedMaxCountConstraintComponent-qualifiedMaxCount": "http://www.w3.org/ns/shacl#QualifiedMaxCountConstraintComponent-qualifiedMaxCount",
      "QualifiedMaxCountConstraintComponent-qualifiedValueShape": "http://www.w3.org/ns/shacl#QualifiedMaxCountConstraintComponent-qualifiedValueShape",
      "QualifiedMaxCountConstraintComponent-qualifiedValueShapesDisjoint": "http://www.w3.org/ns/shacl#QualifiedMaxCountConstraintComponent-qualifiedValueShapesDisjoint",
      /** A constraint component that can be used to verify that a specified minimum number of value nodes conforms to a given shape. */
      "QualifiedMinCountConstraintComponent": "http://www.w3.org/ns/shacl#QualifiedMinCountConstraintComponent",
      "QualifiedMinCountConstraintComponent-qualifiedMinCount": "http://www.w3.org/ns/shacl#QualifiedMinCountConstraintComponent-qualifiedMinCount",
      "QualifiedMinCountConstraintComponent-qualifiedValueShape": "http://www.w3.org/ns/shacl#QualifiedMinCountConstraintComponent-qualifiedValueShape",
      "QualifiedMinCountConstraintComponent-qualifiedValueShapesDisjoint": "http://www.w3.org/ns/shacl#QualifiedMinCountConstraintComponent-qualifiedValueShapesDisjoint",
      /** A class of result annotations, which define the rules to derive the values of a given annotation property as extra values for a validation result. */
      "ResultAnnotation": "http://www.w3.org/ns/shacl#ResultAnnotation",
      /** The class of SHACL rules. Never instantiated directly. */
      "Rule": "http://www.w3.org/ns/shacl#Rule",
      /** The class of SPARQL executables that are based on an ASK query. */
      "SPARQLAskExecutable": "http://www.w3.org/ns/shacl#SPARQLAskExecutable",
      /** The class of validators based on SPARQL ASK queries. The queries are evaluated for each value node and are supposed to return true if the given node conforms. */
      "SPARQLAskValidator": "http://www.w3.org/ns/shacl#SPARQLAskValidator",
      /** The class of constraints based on SPARQL SELECT queries. */
      "SPARQLConstraint": "http://www.w3.org/ns/shacl#SPARQLConstraint",
      /** A constraint component that can be used to define constraints based on SPARQL queries. */
      "SPARQLConstraintComponent": "http://www.w3.org/ns/shacl#SPARQLConstraintComponent",
      "SPARQLConstraintComponent-sparql": "http://www.w3.org/ns/shacl#SPARQLConstraintComponent-sparql",
      /** The class of SPARQL executables that are based on a CONSTRUCT query. */
      "SPARQLConstructExecutable": "http://www.w3.org/ns/shacl#SPARQLConstructExecutable",
      /** The class of resources that encapsulate a SPARQL query. */
      "SPARQLExecutable": "http://www.w3.org/ns/shacl#SPARQLExecutable",
      /** A function backed by a SPARQL query - either ASK or SELECT. */
      "SPARQLFunction": "http://www.w3.org/ns/shacl#SPARQLFunction",
      /** The class of SHACL rules based on SPARQL CONSTRUCT queries. */
      "SPARQLRule": "http://www.w3.org/ns/shacl#SPARQLRule",
      /** The class of SPARQL executables based on a SELECT query. */
      "SPARQLSelectExecutable": "http://www.w3.org/ns/shacl#SPARQLSelectExecutable",
      /** The class of validators based on SPARQL SELECT queries. The queries are evaluated for each focus node and are supposed to produce bindings for all focus nodes that do not conform. */
      "SPARQLSelectValidator": "http://www.w3.org/ns/shacl#SPARQLSelectValidator",
      /** The class of targets that are based on SPARQL queries. */
      "SPARQLTarget": "http://www.w3.org/ns/shacl#SPARQLTarget",
      /** The (meta) class for parameterizable targets that are based on SPARQL queries. */
      "SPARQLTargetType": "http://www.w3.org/ns/shacl#SPARQLTargetType",
      /** The class of SPARQL executables based on a SPARQL UPDATE. */
      "SPARQLUpdateExecutable": "http://www.w3.org/ns/shacl#SPARQLUpdateExecutable",
      /** The class of validation result severity levels, including violation and warning levels. */
      "Severity": "http://www.w3.org/ns/shacl#Severity",
      /** A shape is a collection of constraints that may be targeted for certain nodes. */
      "Shape": "http://www.w3.org/ns/shacl#Shape",
      /** The base class of targets such as those based on SPARQL queries. */
      "Target": "http://www.w3.org/ns/shacl#Target",
      /** The (meta) class for parameterizable targets.	Instances of this are instantiated as values of the sh:target property. */
      "TargetType": "http://www.w3.org/ns/shacl#TargetType",
      "TripleRule": "http://www.w3.org/ns/shacl#TripleRule",
      /** A constraint component that can be used to specify that no pair of value nodes may use the same language tag. */
      "UniqueLangConstraintComponent": "http://www.w3.org/ns/shacl#UniqueLangConstraintComponent",
      "UniqueLangConstraintComponent-uniqueLang": "http://www.w3.org/ns/shacl#UniqueLangConstraintComponent-uniqueLang",
      /** The class of SHACL validation reports. */
      "ValidationReport": "http://www.w3.org/ns/shacl#ValidationReport",
      /** The class of validation results. */
      "ValidationResult": "http://www.w3.org/ns/shacl#ValidationResult",
      /** The class of validators, which provide instructions on how to process a constraint definition. This class serves as base class for the SPARQL-based validators and other possible implementations. */
      "Validator": "http://www.w3.org/ns/shacl#Validator",
      /** The severity for a violation validation result. */
      "Violation": "http://www.w3.org/ns/shacl#Violation",
      /** The severity for a warning validation result. */
      "Warning": "http://www.w3.org/ns/shacl#Warning",
      /** A constraint component that can be used to restrict the value nodes so that they conform to exactly one out of several provided shapes. */
      "XoneConstraintComponent": "http://www.w3.org/ns/shacl#XoneConstraintComponent",
      "XoneConstraintComponent-xone": "http://www.w3.org/ns/shacl#XoneConstraintComponent-xone",
      /** The (single) value of this property must be a list of path elements, representing the elements of alternative paths. */
      "alternativePath": "http://www.w3.org/ns/shacl#alternativePath",
      /** RDF list of shapes to validate the value nodes against. */
      "and": "http://www.w3.org/ns/shacl#and",
      /** The annotation property that shall be set. */
      "annotationProperty": "http://www.w3.org/ns/shacl#annotationProperty",
      /** The (default) values of the annotation property. */
      "annotationValue": "http://www.w3.org/ns/shacl#annotationValue",
      /** The name of the SPARQL variable from the SELECT clause that shall be used for the values. */
      "annotationVarName": "http://www.w3.org/ns/shacl#annotationVarName",
      /** The SPARQL ASK query to execute. */
      "ask": "http://www.w3.org/ns/shacl#ask",
      /** The type that all value nodes must have. */
      "class": "http://www.w3.org/ns/shacl#class",
      /** If set to true then the shape is closed. */
      "closed": "http://www.w3.org/ns/shacl#closed",
      /** The shapes that the focus nodes need to conform to before a rule is executed on them. */
      "condition": "http://www.w3.org/ns/shacl#condition",
      /** True if the validation did not produce any validation results, and false otherwise. */
      "conforms": "http://www.w3.org/ns/shacl#conforms",
      /** The SPARQL CONSTRUCT query to execute. */
      "construct": "http://www.w3.org/ns/shacl#construct",
      /** Specifies an RDF datatype that all value nodes must have. */
      "datatype": "http://www.w3.org/ns/shacl#datatype",
      /** If set to true then all nodes conform to this. */
      "deactivated": "http://www.w3.org/ns/shacl#deactivated",
      /** Links a resource with its namespace prefix declarations. */
      "declare": "http://www.w3.org/ns/shacl#declare",
      /** A default value for a property, for example for user interface tools to pre-populate input fields. */
      "defaultValue": "http://www.w3.org/ns/shacl#defaultValue",
      /** Human-readable descriptions for the property in the context of the surrounding shape. */
      "description": "http://www.w3.org/ns/shacl#description",
      /** Links a result with other results that provide more details, for example to describe violations against nested shapes. */
      "detail": "http://www.w3.org/ns/shacl#detail",
      /** Specifies a property where the set of values must be disjoint with the value nodes. */
      "disjoint": "http://www.w3.org/ns/shacl#disjoint",
      /** An entailment regime that indicates what kind of inferencing is required by a shapes graph. */
      "entailment": "http://www.w3.org/ns/shacl#entailment",
      /** Specifies a property that must have the same values as the value nodes. */
      "equals": "http://www.w3.org/ns/shacl#equals",
      /** The node expression that must return true for the value nodes. */
      "expression": "http://www.w3.org/ns/shacl#expression",
      /** The shape that all input nodes of the expression need to conform to. */
      "filterShape": "http://www.w3.org/ns/shacl#filterShape",
      /** An optional flag to be used with regular expression pattern matching. */
      "flags": "http://www.w3.org/ns/shacl#flags",
      /** The focus node that was validated when the result was produced. */
      "focusNode": "http://www.w3.org/ns/shacl#focusNode",
      /** Can be used to link to a property group to indicate that a property shape belongs to a group of related property shapes. */
      "group": "http://www.w3.org/ns/shacl#group",
      /** Specifies a value that must be among the value nodes. */
      "hasValue": "http://www.w3.org/ns/shacl#hasValue",
      /** An optional RDF list of properties that are also permitted in addition to those explicitly enumerated via sh:property/sh:path. */
      "ignoredProperties": "http://www.w3.org/ns/shacl#ignoredProperties",
      /** Specifies a list of allowed values so that each value node must be among the members of the given list. */
      "in": "http://www.w3.org/ns/shacl#in",
      /** A list of node expressions that shall be intersected. */
      "intersection": "http://www.w3.org/ns/shacl#intersection",
      /** The (single) value of this property represents an inverse path (object to subject). */
      "inversePath": "http://www.w3.org/ns/shacl#inversePath",
      /** Constraints expressed in JavaScript. */
      "js": "http://www.w3.org/ns/shacl#js",
      /** The name of the JavaScript function to execute. */
      "jsFunctionName": "http://www.w3.org/ns/shacl#jsFunctionName",
      /** Declares which JavaScript libraries are needed to execute this. */
      "jsLibrary": "http://www.w3.org/ns/shacl#jsLibrary",
      /** Declares the URLs of a JavaScript library. This should be the absolute URL of a JavaScript file. Implementations may redirect those to local files. */
      "jsLibraryURL": "http://www.w3.org/ns/shacl#jsLibraryURL",
      /** Outlines how human-readable labels of instances of the associated Parameterizable shall be produced. The values can contain {?paramName} as placeholders for the actual values of the given parameter. */
      "labelTemplate": "http://www.w3.org/ns/shacl#labelTemplate",
      /** Specifies a list of language tags that all value nodes must have. */
      "languageIn": "http://www.w3.org/ns/shacl#languageIn",
      /** Specifies a property that must have smaller values than the value nodes. */
      "lessThan": "http://www.w3.org/ns/shacl#lessThan",
      /** Specifies a property that must have smaller or equal values than the value nodes. */
      "lessThanOrEquals": "http://www.w3.org/ns/shacl#lessThanOrEquals",
      /** Specifies the maximum number of values in the set of value nodes. */
      "maxCount": "http://www.w3.org/ns/shacl#maxCount",
      /** Specifies the maximum exclusive value of each value node. */
      "maxExclusive": "http://www.w3.org/ns/shacl#maxExclusive",
      /** Specifies the maximum inclusive value of each value node. */
      "maxInclusive": "http://www.w3.org/ns/shacl#maxInclusive",
      /** Specifies the maximum string length of each value node. */
      "maxLength": "http://www.w3.org/ns/shacl#maxLength",
      /** A human-readable message (possibly with placeholders for variables) explaining the cause of the result. */
      "message": "http://www.w3.org/ns/shacl#message",
      /** Specifies the minimum number of values in the set of value nodes. */
      "minCount": "http://www.w3.org/ns/shacl#minCount",
      /** Specifies the minimum exclusive value of each value node. */
      "minExclusive": "http://www.w3.org/ns/shacl#minExclusive",
      /** Specifies the minimum inclusive value of each value node. */
      "minInclusive": "http://www.w3.org/ns/shacl#minInclusive",
      /** Specifies the minimum string length of each value node. */
      "minLength": "http://www.w3.org/ns/shacl#minLength",
      /** Human-readable labels for the property in the context of the surrounding shape. */
      "name": "http://www.w3.org/ns/shacl#name",
      /** The namespace associated with a prefix in a prefix declaration. */
      "namespace": "http://www.w3.org/ns/shacl#namespace",
      /** Specifies the node shape that all value nodes must conform to. */
      "node": "http://www.w3.org/ns/shacl#node",
      /** Specifies the node kind (e.g. IRI or literal) each value node. */
      "nodeKind": "http://www.w3.org/ns/shacl#nodeKind",
      /** The validator(s) used to evaluate a constraint in the context of a node shape. */
      "nodeValidator": "http://www.w3.org/ns/shacl#nodeValidator",
      /** The node expression producing the input nodes of a filter shape expression. */
      "nodes": "http://www.w3.org/ns/shacl#nodes",
      /** Specifies a shape that the value nodes must not conform to. */
      "not": "http://www.w3.org/ns/shacl#not",
      /** An expression producing the nodes that shall be inferred as objects. */
      "object": "http://www.w3.org/ns/shacl#object",
      /** The (single) value of this property represents a path that is matched one or more times. */
      "oneOrMorePath": "http://www.w3.org/ns/shacl#oneOrMorePath",
      /** Indicates whether a parameter is optional. */
      "optional": "http://www.w3.org/ns/shacl#optional",
      /** Specifies a list of shapes so that the value nodes must conform to at least one of the shapes. */
      "or": "http://www.w3.org/ns/shacl#or",
      /** Specifies the relative order of this compared to its siblings. For example use 0 for the first, 1 for the second. */
      "order": "http://www.w3.org/ns/shacl#order",
      /** The parameters of a function or constraint component. */
      "parameter": "http://www.w3.org/ns/shacl#parameter",
      /** Specifies the property path of a property shape. */
      "path": "http://www.w3.org/ns/shacl#path",
      /** Specifies a regular expression pattern that the string representations of the value nodes must match. */
      "pattern": "http://www.w3.org/ns/shacl#pattern",
      /** An expression producing the properties that shall be inferred as predicates. */
      "predicate": "http://www.w3.org/ns/shacl#predicate",
      /** The prefix of a prefix declaration. */
      "prefix": "http://www.w3.org/ns/shacl#prefix",
      /** The prefixes that shall be applied before parsing the associated SPARQL query. */
      "prefixes": "http://www.w3.org/ns/shacl#prefixes",
      /** Links a shape to its property shapes. */
      "property": "http://www.w3.org/ns/shacl#property",
      /** The validator(s) used to evaluate a constraint in the context of a property shape. */
      "propertyValidator": "http://www.w3.org/ns/shacl#propertyValidator",
      /** The maximum number of value nodes that can conform to the shape. */
      "qualifiedMaxCount": "http://www.w3.org/ns/shacl#qualifiedMaxCount",
      /** The minimum number of value nodes that must conform to the shape. */
      "qualifiedMinCount": "http://www.w3.org/ns/shacl#qualifiedMinCount",
      /** The shape that a specified number of values must conform to. */
      "qualifiedValueShape": "http://www.w3.org/ns/shacl#qualifiedValueShape",
      /** Can be used to mark the qualified value shape to be disjoint with its sibling shapes. */
      "qualifiedValueShapesDisjoint": "http://www.w3.org/ns/shacl#qualifiedValueShapesDisjoint",
      /** The validation results contained in a validation report. */
      "result": "http://www.w3.org/ns/shacl#result",
      /** Links a SPARQL validator with zero or more sh:ResultAnnotation instances, defining how to derive additional result properties based on the variables of the SELECT query. */
      "resultAnnotation": "http://www.w3.org/ns/shacl#resultAnnotation",
      /** Human-readable messages explaining the cause of the result. */
      "resultMessage": "http://www.w3.org/ns/shacl#resultMessage",
      /** The path of a validation result, based on the path of the validated property shape. */
      "resultPath": "http://www.w3.org/ns/shacl#resultPath",
      /** The severity of the result, e.g. warning. */
      "resultSeverity": "http://www.w3.org/ns/shacl#resultSeverity",
      /** The expected type of values returned by the associated function. */
      "returnType": "http://www.w3.org/ns/shacl#returnType",
      /** The rules linked to a shape. */
      "rule": "http://www.w3.org/ns/shacl#rule",
      /** The SPARQL SELECT query to execute. */
      "select": "http://www.w3.org/ns/shacl#select",
      /** Defines the severity that validation results produced by a shape must have. Defaults to sh:Violation. */
      "severity": "http://www.w3.org/ns/shacl#severity",
      /** Shapes graphs that should be used when validating this data graph. */
      "shapesGraph": "http://www.w3.org/ns/shacl#shapesGraph",
      /** If true then the validation engine was certain that the shapes graph has passed all SHACL syntax requirements during the validation process. */
      "shapesGraphWellFormed": "http://www.w3.org/ns/shacl#shapesGraphWellFormed",
      /** The constraint that was validated when the result was produced. */
      "sourceConstraint": "http://www.w3.org/ns/shacl#sourceConstraint",
      /** The constraint component that is the source of the result. */
      "sourceConstraintComponent": "http://www.w3.org/ns/shacl#sourceConstraintComponent",
      /** The shape that is was validated when the result was produced. */
      "sourceShape": "http://www.w3.org/ns/shacl#sourceShape",
      /** Links a shape with SPARQL constraints. */
      "sparql": "http://www.w3.org/ns/shacl#sparql",
      /** An expression producing the resources that shall be inferred as subjects. */
      "subject": "http://www.w3.org/ns/shacl#subject",
      /** Suggested shapes graphs for this ontology. The values of this property may be used in the absence of specific sh:shapesGraph statements. */
      "suggestedShapesGraph": "http://www.w3.org/ns/shacl#suggestedShapesGraph",
      /** Links a shape to a target specified by an extension language, for example instances of sh:SPARQLTarget. */
      "target": "http://www.w3.org/ns/shacl#target",
      /** Links a shape to a class, indicating that all instances of the class must conform to the shape. */
      "targetClass": "http://www.w3.org/ns/shacl#targetClass",
      /** Links a shape to individual nodes, indicating that these nodes must conform to the shape. */
      "targetNode": "http://www.w3.org/ns/shacl#targetNode",
      /** Links a shape to a property, indicating that all all objects of triples that have the given property as their predicate must conform to the shape. */
      "targetObjectsOf": "http://www.w3.org/ns/shacl#targetObjectsOf",
      /** Links a shape to a property, indicating that all subjects of triples that have the given property as their predicate must conform to the shape. */
      "targetSubjectsOf": "http://www.w3.org/ns/shacl#targetSubjectsOf",
      /** A node expression that represents the current focus node. */
      "this": "http://www.w3.org/ns/shacl#this",
      /** A list of node expressions that shall be used together. */
      "union": "http://www.w3.org/ns/shacl#union",
      /** Specifies whether all node values must have a unique (or no) language tag. */
      "uniqueLang": "http://www.w3.org/ns/shacl#uniqueLang",
      /** The SPARQL UPDATE to execute. */
      "update": "http://www.w3.org/ns/shacl#update",
      /** The validator(s) used to evaluate constraints of either node or property shapes. */
      "validator": "http://www.w3.org/ns/shacl#validator",
      /** An RDF node that has caused the result. */
      "value": "http://www.w3.org/ns/shacl#value",
      /** Specifies a list of shapes so that the value nodes must conform to exactly one of the shapes. */
      "xone": "http://www.w3.org/ns/shacl#xone",
      /** The (single) value of this property represents a path that is matched zero or more times. */
      "zeroOrMorePath": "http://www.w3.org/ns/shacl#zeroOrMorePath",
      /** The (single) value of this property represents a path that is matched zero or one times. */
      "zeroOrOnePath": "http://www.w3.org/ns/shacl#zeroOrOnePath"
    };
    exports.shacl = {
      /** The base class of validation results, typically not instantiated directly. */
      "AbstractResult": new n3.NamedNode("http://www.w3.org/ns/shacl#AbstractResult"),
      /** A constraint component that can be used to test whether a value node conforms to all members of a provided list of shapes. */
      "AndConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#AndConstraintComponent"),
      "AndConstraintComponent-and": new n3.NamedNode("http://www.w3.org/ns/shacl#AndConstraintComponent-and"),
      /** The node kind of all blank nodes. */
      "BlankNode": new n3.NamedNode("http://www.w3.org/ns/shacl#BlankNode"),
      /** The node kind of all blank nodes or IRIs. */
      "BlankNodeOrIRI": new n3.NamedNode("http://www.w3.org/ns/shacl#BlankNodeOrIRI"),
      /** The node kind of all blank nodes or literals. */
      "BlankNodeOrLiteral": new n3.NamedNode("http://www.w3.org/ns/shacl#BlankNodeOrLiteral"),
      /** A constraint component that can be used to verify that each value node is an instance of a given type. */
      "ClassConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#ClassConstraintComponent"),
      "ClassConstraintComponent-class": new n3.NamedNode("http://www.w3.org/ns/shacl#ClassConstraintComponent-class"),
      /** A constraint component that can be used to indicate that focus nodes must only have values for those properties that have been explicitly enumerated via sh:property/sh:path. */
      "ClosedConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#ClosedConstraintComponent"),
      "ClosedConstraintComponent-closed": new n3.NamedNode("http://www.w3.org/ns/shacl#ClosedConstraintComponent-closed"),
      "ClosedConstraintComponent-ignoredProperties": new n3.NamedNode("http://www.w3.org/ns/shacl#ClosedConstraintComponent-ignoredProperties"),
      /** The class of constraint components. */
      "ConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#ConstraintComponent"),
      /** A constraint component that can be used to restrict the datatype of all value nodes. */
      "DatatypeConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#DatatypeConstraintComponent"),
      "DatatypeConstraintComponent-datatype": new n3.NamedNode("http://www.w3.org/ns/shacl#DatatypeConstraintComponent-datatype"),
      /** A constraint component that can be used to verify that the set of value nodes is disjoint with the the set of nodes that have the focus node as subject and the value of a given property as predicate. */
      "DisjointConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#DisjointConstraintComponent"),
      "DisjointConstraintComponent-disjoint": new n3.NamedNode("http://www.w3.org/ns/shacl#DisjointConstraintComponent-disjoint"),
      /** A constraint component that can be used to verify that the set of value nodes is equal to the set of nodes that have the focus node as subject and the value of a given property as predicate. */
      "EqualsConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#EqualsConstraintComponent"),
      "EqualsConstraintComponent-equals": new n3.NamedNode("http://www.w3.org/ns/shacl#EqualsConstraintComponent-equals"),
      /** A constraint component that can be used to verify that a given node expression produces true for all value nodes. */
      "ExpressionConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#ExpressionConstraintComponent"),
      "ExpressionConstraintComponent-expression": new n3.NamedNode("http://www.w3.org/ns/shacl#ExpressionConstraintComponent-expression"),
      /** The class of SHACL functions. */
      "Function": new n3.NamedNode("http://www.w3.org/ns/shacl#Function"),
      /** A constraint component that can be used to verify that one of the value nodes is a given RDF node. */
      "HasValueConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#HasValueConstraintComponent"),
      "HasValueConstraintComponent-hasValue": new n3.NamedNode("http://www.w3.org/ns/shacl#HasValueConstraintComponent-hasValue"),
      /** The node kind of all IRIs. */
      "IRI": new n3.NamedNode("http://www.w3.org/ns/shacl#IRI"),
      /** The node kind of all IRIs or literals. */
      "IRIOrLiteral": new n3.NamedNode("http://www.w3.org/ns/shacl#IRIOrLiteral"),
      /** A constraint component that can be used to exclusively enumerate the permitted value nodes. */
      "InConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#InConstraintComponent"),
      "InConstraintComponent-in": new n3.NamedNode("http://www.w3.org/ns/shacl#InConstraintComponent-in"),
      /** The severity for an informational validation result. */
      "Info": new n3.NamedNode("http://www.w3.org/ns/shacl#Info"),
      /** The class of constraints backed by a JavaScript function. */
      "JSConstraint": new n3.NamedNode("http://www.w3.org/ns/shacl#JSConstraint"),
      "JSConstraint-js": new n3.NamedNode("http://www.w3.org/ns/shacl#JSConstraint-js"),
      /** A constraint component with the parameter sh:js linking to a sh:JSConstraint containing a sh:script. */
      "JSConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#JSConstraintComponent"),
      /** Abstract base class of resources that declare an executable JavaScript. */
      "JSExecutable": new n3.NamedNode("http://www.w3.org/ns/shacl#JSExecutable"),
      /** The class of SHACL functions that execute a JavaScript function when called. */
      "JSFunction": new n3.NamedNode("http://www.w3.org/ns/shacl#JSFunction"),
      /** Represents a JavaScript library, typically identified by one or more URLs of files to include. */
      "JSLibrary": new n3.NamedNode("http://www.w3.org/ns/shacl#JSLibrary"),
      /** The class of SHACL rules expressed using JavaScript. */
      "JSRule": new n3.NamedNode("http://www.w3.org/ns/shacl#JSRule"),
      /** The class of targets that are based on JavaScript functions. */
      "JSTarget": new n3.NamedNode("http://www.w3.org/ns/shacl#JSTarget"),
      /** The (meta) class for parameterizable targets that are based on JavaScript functions. */
      "JSTargetType": new n3.NamedNode("http://www.w3.org/ns/shacl#JSTargetType"),
      /** A SHACL validator based on JavaScript. This can be used to declare SHACL constraint components that perform JavaScript-based validation when used. */
      "JSValidator": new n3.NamedNode("http://www.w3.org/ns/shacl#JSValidator"),
      /** A constraint component that can be used to enumerate language tags that all value nodes must have. */
      "LanguageInConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#LanguageInConstraintComponent"),
      "LanguageInConstraintComponent-languageIn": new n3.NamedNode("http://www.w3.org/ns/shacl#LanguageInConstraintComponent-languageIn"),
      /** A constraint component that can be used to verify that each value node is smaller than all the nodes that have the focus node as subject and the value of a given property as predicate. */
      "LessThanConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#LessThanConstraintComponent"),
      "LessThanConstraintComponent-lessThan": new n3.NamedNode("http://www.w3.org/ns/shacl#LessThanConstraintComponent-lessThan"),
      /** A constraint component that can be used to verify that every value node is smaller than all the nodes that have the focus node as subject and the value of a given property as predicate. */
      "LessThanOrEqualsConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#LessThanOrEqualsConstraintComponent"),
      "LessThanOrEqualsConstraintComponent-lessThanOrEquals": new n3.NamedNode("http://www.w3.org/ns/shacl#LessThanOrEqualsConstraintComponent-lessThanOrEquals"),
      /** The node kind of all literals. */
      "Literal": new n3.NamedNode("http://www.w3.org/ns/shacl#Literal"),
      /** A constraint component that can be used to restrict the maximum number of value nodes. */
      "MaxCountConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#MaxCountConstraintComponent"),
      "MaxCountConstraintComponent-maxCount": new n3.NamedNode("http://www.w3.org/ns/shacl#MaxCountConstraintComponent-maxCount"),
      /** A constraint component that can be used to restrict the range of value nodes with a maximum exclusive value. */
      "MaxExclusiveConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#MaxExclusiveConstraintComponent"),
      "MaxExclusiveConstraintComponent-maxExclusive": new n3.NamedNode("http://www.w3.org/ns/shacl#MaxExclusiveConstraintComponent-maxExclusive"),
      /** A constraint component that can be used to restrict the range of value nodes with a maximum inclusive value. */
      "MaxInclusiveConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#MaxInclusiveConstraintComponent"),
      "MaxInclusiveConstraintComponent-maxInclusive": new n3.NamedNode("http://www.w3.org/ns/shacl#MaxInclusiveConstraintComponent-maxInclusive"),
      /** A constraint component that can be used to restrict the maximum string length of value nodes. */
      "MaxLengthConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#MaxLengthConstraintComponent"),
      "MaxLengthConstraintComponent-maxLength": new n3.NamedNode("http://www.w3.org/ns/shacl#MaxLengthConstraintComponent-maxLength"),
      /** A constraint component that can be used to restrict the minimum number of value nodes. */
      "MinCountConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#MinCountConstraintComponent"),
      "MinCountConstraintComponent-minCount": new n3.NamedNode("http://www.w3.org/ns/shacl#MinCountConstraintComponent-minCount"),
      /** A constraint component that can be used to restrict the range of value nodes with a minimum exclusive value. */
      "MinExclusiveConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#MinExclusiveConstraintComponent"),
      "MinExclusiveConstraintComponent-minExclusive": new n3.NamedNode("http://www.w3.org/ns/shacl#MinExclusiveConstraintComponent-minExclusive"),
      /** A constraint component that can be used to restrict the range of value nodes with a minimum inclusive value. */
      "MinInclusiveConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#MinInclusiveConstraintComponent"),
      "MinInclusiveConstraintComponent-minInclusive": new n3.NamedNode("http://www.w3.org/ns/shacl#MinInclusiveConstraintComponent-minInclusive"),
      /** A constraint component that can be used to restrict the minimum string length of value nodes. */
      "MinLengthConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#MinLengthConstraintComponent"),
      "MinLengthConstraintComponent-minLength": new n3.NamedNode("http://www.w3.org/ns/shacl#MinLengthConstraintComponent-minLength"),
      /** A constraint component that can be used to verify that all value nodes conform to the given node shape. */
      "NodeConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#NodeConstraintComponent"),
      "NodeConstraintComponent-node": new n3.NamedNode("http://www.w3.org/ns/shacl#NodeConstraintComponent-node"),
      /** The class of all node kinds, including sh:BlankNode, sh:IRI, sh:Literal or the combinations of these: sh:BlankNodeOrIRI, sh:BlankNodeOrLiteral, sh:IRIOrLiteral. */
      "NodeKind": new n3.NamedNode("http://www.w3.org/ns/shacl#NodeKind"),
      /** A constraint component that can be used to restrict the RDF node kind of each value node. */
      "NodeKindConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#NodeKindConstraintComponent"),
      "NodeKindConstraintComponent-nodeKind": new n3.NamedNode("http://www.w3.org/ns/shacl#NodeKindConstraintComponent-nodeKind"),
      /** A node shape is a shape that specifies constraint that need to be met with respect to focus nodes. */
      "NodeShape": new n3.NamedNode("http://www.w3.org/ns/shacl#NodeShape"),
      /** A constraint component that can be used to verify that value nodes do not conform to a given shape. */
      "NotConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#NotConstraintComponent"),
      "NotConstraintComponent-not": new n3.NamedNode("http://www.w3.org/ns/shacl#NotConstraintComponent-not"),
      /** A constraint component that can be used to restrict the value nodes so that they conform to at least one out of several provided shapes. */
      "OrConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#OrConstraintComponent"),
      "OrConstraintComponent-or": new n3.NamedNode("http://www.w3.org/ns/shacl#OrConstraintComponent-or"),
      /** The class of parameter declarations, consisting of a path predicate and (possibly) information about allowed value type, cardinality and other characteristics. */
      "Parameter": new n3.NamedNode("http://www.w3.org/ns/shacl#Parameter"),
      /** Superclass of components that can take parameters, especially functions and constraint components. */
      "Parameterizable": new n3.NamedNode("http://www.w3.org/ns/shacl#Parameterizable"),
      /** A constraint component that can be used to verify that every value node matches a given regular expression. */
      "PatternConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#PatternConstraintComponent"),
      "PatternConstraintComponent-flags": new n3.NamedNode("http://www.w3.org/ns/shacl#PatternConstraintComponent-flags"),
      "PatternConstraintComponent-pattern": new n3.NamedNode("http://www.w3.org/ns/shacl#PatternConstraintComponent-pattern"),
      /** The class of prefix declarations, consisting of pairs of a prefix with a namespace. */
      "PrefixDeclaration": new n3.NamedNode("http://www.w3.org/ns/shacl#PrefixDeclaration"),
      /** A constraint component that can be used to verify that all value nodes conform to the given property shape. */
      "PropertyConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#PropertyConstraintComponent"),
      "PropertyConstraintComponent-property": new n3.NamedNode("http://www.w3.org/ns/shacl#PropertyConstraintComponent-property"),
      /** Instances of this class represent groups of property shapes that belong together. */
      "PropertyGroup": new n3.NamedNode("http://www.w3.org/ns/shacl#PropertyGroup"),
      /** A property shape is a shape that specifies constraints on the values of a focus node for a given property or path. */
      "PropertyShape": new n3.NamedNode("http://www.w3.org/ns/shacl#PropertyShape"),
      /** A constraint component that can be used to verify that a specified maximum number of value nodes conforms to a given shape. */
      "QualifiedMaxCountConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#QualifiedMaxCountConstraintComponent"),
      "QualifiedMaxCountConstraintComponent-qualifiedMaxCount": new n3.NamedNode("http://www.w3.org/ns/shacl#QualifiedMaxCountConstraintComponent-qualifiedMaxCount"),
      "QualifiedMaxCountConstraintComponent-qualifiedValueShape": new n3.NamedNode("http://www.w3.org/ns/shacl#QualifiedMaxCountConstraintComponent-qualifiedValueShape"),
      "QualifiedMaxCountConstraintComponent-qualifiedValueShapesDisjoint": new n3.NamedNode("http://www.w3.org/ns/shacl#QualifiedMaxCountConstraintComponent-qualifiedValueShapesDisjoint"),
      /** A constraint component that can be used to verify that a specified minimum number of value nodes conforms to a given shape. */
      "QualifiedMinCountConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#QualifiedMinCountConstraintComponent"),
      "QualifiedMinCountConstraintComponent-qualifiedMinCount": new n3.NamedNode("http://www.w3.org/ns/shacl#QualifiedMinCountConstraintComponent-qualifiedMinCount"),
      "QualifiedMinCountConstraintComponent-qualifiedValueShape": new n3.NamedNode("http://www.w3.org/ns/shacl#QualifiedMinCountConstraintComponent-qualifiedValueShape"),
      "QualifiedMinCountConstraintComponent-qualifiedValueShapesDisjoint": new n3.NamedNode("http://www.w3.org/ns/shacl#QualifiedMinCountConstraintComponent-qualifiedValueShapesDisjoint"),
      /** A class of result annotations, which define the rules to derive the values of a given annotation property as extra values for a validation result. */
      "ResultAnnotation": new n3.NamedNode("http://www.w3.org/ns/shacl#ResultAnnotation"),
      /** The class of SHACL rules. Never instantiated directly. */
      "Rule": new n3.NamedNode("http://www.w3.org/ns/shacl#Rule"),
      /** The class of SPARQL executables that are based on an ASK query. */
      "SPARQLAskExecutable": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLAskExecutable"),
      /** The class of validators based on SPARQL ASK queries. The queries are evaluated for each value node and are supposed to return true if the given node conforms. */
      "SPARQLAskValidator": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLAskValidator"),
      /** The class of constraints based on SPARQL SELECT queries. */
      "SPARQLConstraint": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLConstraint"),
      /** A constraint component that can be used to define constraints based on SPARQL queries. */
      "SPARQLConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLConstraintComponent"),
      "SPARQLConstraintComponent-sparql": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLConstraintComponent-sparql"),
      /** The class of SPARQL executables that are based on a CONSTRUCT query. */
      "SPARQLConstructExecutable": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLConstructExecutable"),
      /** The class of resources that encapsulate a SPARQL query. */
      "SPARQLExecutable": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLExecutable"),
      /** A function backed by a SPARQL query - either ASK or SELECT. */
      "SPARQLFunction": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLFunction"),
      /** The class of SHACL rules based on SPARQL CONSTRUCT queries. */
      "SPARQLRule": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLRule"),
      /** The class of SPARQL executables based on a SELECT query. */
      "SPARQLSelectExecutable": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLSelectExecutable"),
      /** The class of validators based on SPARQL SELECT queries. The queries are evaluated for each focus node and are supposed to produce bindings for all focus nodes that do not conform. */
      "SPARQLSelectValidator": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLSelectValidator"),
      /** The class of targets that are based on SPARQL queries. */
      "SPARQLTarget": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLTarget"),
      /** The (meta) class for parameterizable targets that are based on SPARQL queries. */
      "SPARQLTargetType": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLTargetType"),
      /** The class of SPARQL executables based on a SPARQL UPDATE. */
      "SPARQLUpdateExecutable": new n3.NamedNode("http://www.w3.org/ns/shacl#SPARQLUpdateExecutable"),
      /** The class of validation result severity levels, including violation and warning levels. */
      "Severity": new n3.NamedNode("http://www.w3.org/ns/shacl#Severity"),
      /** A shape is a collection of constraints that may be targeted for certain nodes. */
      "Shape": new n3.NamedNode("http://www.w3.org/ns/shacl#Shape"),
      /** The base class of targets such as those based on SPARQL queries. */
      "Target": new n3.NamedNode("http://www.w3.org/ns/shacl#Target"),
      /** The (meta) class for parameterizable targets.	Instances of this are instantiated as values of the sh:target property. */
      "TargetType": new n3.NamedNode("http://www.w3.org/ns/shacl#TargetType"),
      "TripleRule": new n3.NamedNode("http://www.w3.org/ns/shacl#TripleRule"),
      /** A constraint component that can be used to specify that no pair of value nodes may use the same language tag. */
      "UniqueLangConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#UniqueLangConstraintComponent"),
      "UniqueLangConstraintComponent-uniqueLang": new n3.NamedNode("http://www.w3.org/ns/shacl#UniqueLangConstraintComponent-uniqueLang"),
      /** The class of SHACL validation reports. */
      "ValidationReport": new n3.NamedNode("http://www.w3.org/ns/shacl#ValidationReport"),
      /** The class of validation results. */
      "ValidationResult": new n3.NamedNode("http://www.w3.org/ns/shacl#ValidationResult"),
      /** The class of validators, which provide instructions on how to process a constraint definition. This class serves as base class for the SPARQL-based validators and other possible implementations. */
      "Validator": new n3.NamedNode("http://www.w3.org/ns/shacl#Validator"),
      /** The severity for a violation validation result. */
      "Violation": new n3.NamedNode("http://www.w3.org/ns/shacl#Violation"),
      /** The severity for a warning validation result. */
      "Warning": new n3.NamedNode("http://www.w3.org/ns/shacl#Warning"),
      /** A constraint component that can be used to restrict the value nodes so that they conform to exactly one out of several provided shapes. */
      "XoneConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#XoneConstraintComponent"),
      "XoneConstraintComponent-xone": new n3.NamedNode("http://www.w3.org/ns/shacl#XoneConstraintComponent-xone"),
      /** The (single) value of this property must be a list of path elements, representing the elements of alternative paths. */
      "alternativePath": new n3.NamedNode("http://www.w3.org/ns/shacl#alternativePath"),
      /** RDF list of shapes to validate the value nodes against. */
      "and": new n3.NamedNode("http://www.w3.org/ns/shacl#and"),
      /** The annotation property that shall be set. */
      "annotationProperty": new n3.NamedNode("http://www.w3.org/ns/shacl#annotationProperty"),
      /** The (default) values of the annotation property. */
      "annotationValue": new n3.NamedNode("http://www.w3.org/ns/shacl#annotationValue"),
      /** The name of the SPARQL variable from the SELECT clause that shall be used for the values. */
      "annotationVarName": new n3.NamedNode("http://www.w3.org/ns/shacl#annotationVarName"),
      /** The SPARQL ASK query to execute. */
      "ask": new n3.NamedNode("http://www.w3.org/ns/shacl#ask"),
      /** The type that all value nodes must have. */
      "class": new n3.NamedNode("http://www.w3.org/ns/shacl#class"),
      /** If set to true then the shape is closed. */
      "closed": new n3.NamedNode("http://www.w3.org/ns/shacl#closed"),
      /** The shapes that the focus nodes need to conform to before a rule is executed on them. */
      "condition": new n3.NamedNode("http://www.w3.org/ns/shacl#condition"),
      /** True if the validation did not produce any validation results, and false otherwise. */
      "conforms": new n3.NamedNode("http://www.w3.org/ns/shacl#conforms"),
      /** The SPARQL CONSTRUCT query to execute. */
      "construct": new n3.NamedNode("http://www.w3.org/ns/shacl#construct"),
      /** Specifies an RDF datatype that all value nodes must have. */
      "datatype": new n3.NamedNode("http://www.w3.org/ns/shacl#datatype"),
      /** If set to true then all nodes conform to this. */
      "deactivated": new n3.NamedNode("http://www.w3.org/ns/shacl#deactivated"),
      /** Links a resource with its namespace prefix declarations. */
      "declare": new n3.NamedNode("http://www.w3.org/ns/shacl#declare"),
      /** A default value for a property, for example for user interface tools to pre-populate input fields. */
      "defaultValue": new n3.NamedNode("http://www.w3.org/ns/shacl#defaultValue"),
      /** Human-readable descriptions for the property in the context of the surrounding shape. */
      "description": new n3.NamedNode("http://www.w3.org/ns/shacl#description"),
      /** Links a result with other results that provide more details, for example to describe violations against nested shapes. */
      "detail": new n3.NamedNode("http://www.w3.org/ns/shacl#detail"),
      /** Specifies a property where the set of values must be disjoint with the value nodes. */
      "disjoint": new n3.NamedNode("http://www.w3.org/ns/shacl#disjoint"),
      /** An entailment regime that indicates what kind of inferencing is required by a shapes graph. */
      "entailment": new n3.NamedNode("http://www.w3.org/ns/shacl#entailment"),
      /** Specifies a property that must have the same values as the value nodes. */
      "equals": new n3.NamedNode("http://www.w3.org/ns/shacl#equals"),
      /** The node expression that must return true for the value nodes. */
      "expression": new n3.NamedNode("http://www.w3.org/ns/shacl#expression"),
      /** The shape that all input nodes of the expression need to conform to. */
      "filterShape": new n3.NamedNode("http://www.w3.org/ns/shacl#filterShape"),
      /** An optional flag to be used with regular expression pattern matching. */
      "flags": new n3.NamedNode("http://www.w3.org/ns/shacl#flags"),
      /** The focus node that was validated when the result was produced. */
      "focusNode": new n3.NamedNode("http://www.w3.org/ns/shacl#focusNode"),
      /** Can be used to link to a property group to indicate that a property shape belongs to a group of related property shapes. */
      "group": new n3.NamedNode("http://www.w3.org/ns/shacl#group"),
      /** Specifies a value that must be among the value nodes. */
      "hasValue": new n3.NamedNode("http://www.w3.org/ns/shacl#hasValue"),
      /** An optional RDF list of properties that are also permitted in addition to those explicitly enumerated via sh:property/sh:path. */
      "ignoredProperties": new n3.NamedNode("http://www.w3.org/ns/shacl#ignoredProperties"),
      /** Specifies a list of allowed values so that each value node must be among the members of the given list. */
      "in": new n3.NamedNode("http://www.w3.org/ns/shacl#in"),
      /** A list of node expressions that shall be intersected. */
      "intersection": new n3.NamedNode("http://www.w3.org/ns/shacl#intersection"),
      /** The (single) value of this property represents an inverse path (object to subject). */
      "inversePath": new n3.NamedNode("http://www.w3.org/ns/shacl#inversePath"),
      /** Constraints expressed in JavaScript. */
      "js": new n3.NamedNode("http://www.w3.org/ns/shacl#js"),
      /** The name of the JavaScript function to execute. */
      "jsFunctionName": new n3.NamedNode("http://www.w3.org/ns/shacl#jsFunctionName"),
      /** Declares which JavaScript libraries are needed to execute this. */
      "jsLibrary": new n3.NamedNode("http://www.w3.org/ns/shacl#jsLibrary"),
      /** Declares the URLs of a JavaScript library. This should be the absolute URL of a JavaScript file. Implementations may redirect those to local files. */
      "jsLibraryURL": new n3.NamedNode("http://www.w3.org/ns/shacl#jsLibraryURL"),
      /** Outlines how human-readable labels of instances of the associated Parameterizable shall be produced. The values can contain {?paramName} as placeholders for the actual values of the given parameter. */
      "labelTemplate": new n3.NamedNode("http://www.w3.org/ns/shacl#labelTemplate"),
      /** Specifies a list of language tags that all value nodes must have. */
      "languageIn": new n3.NamedNode("http://www.w3.org/ns/shacl#languageIn"),
      /** Specifies a property that must have smaller values than the value nodes. */
      "lessThan": new n3.NamedNode("http://www.w3.org/ns/shacl#lessThan"),
      /** Specifies a property that must have smaller or equal values than the value nodes. */
      "lessThanOrEquals": new n3.NamedNode("http://www.w3.org/ns/shacl#lessThanOrEquals"),
      /** Specifies the maximum number of values in the set of value nodes. */
      "maxCount": new n3.NamedNode("http://www.w3.org/ns/shacl#maxCount"),
      /** Specifies the maximum exclusive value of each value node. */
      "maxExclusive": new n3.NamedNode("http://www.w3.org/ns/shacl#maxExclusive"),
      /** Specifies the maximum inclusive value of each value node. */
      "maxInclusive": new n3.NamedNode("http://www.w3.org/ns/shacl#maxInclusive"),
      /** Specifies the maximum string length of each value node. */
      "maxLength": new n3.NamedNode("http://www.w3.org/ns/shacl#maxLength"),
      /** A human-readable message (possibly with placeholders for variables) explaining the cause of the result. */
      "message": new n3.NamedNode("http://www.w3.org/ns/shacl#message"),
      /** Specifies the minimum number of values in the set of value nodes. */
      "minCount": new n3.NamedNode("http://www.w3.org/ns/shacl#minCount"),
      /** Specifies the minimum exclusive value of each value node. */
      "minExclusive": new n3.NamedNode("http://www.w3.org/ns/shacl#minExclusive"),
      /** Specifies the minimum inclusive value of each value node. */
      "minInclusive": new n3.NamedNode("http://www.w3.org/ns/shacl#minInclusive"),
      /** Specifies the minimum string length of each value node. */
      "minLength": new n3.NamedNode("http://www.w3.org/ns/shacl#minLength"),
      /** Human-readable labels for the property in the context of the surrounding shape. */
      "name": new n3.NamedNode("http://www.w3.org/ns/shacl#name"),
      /** The namespace associated with a prefix in a prefix declaration. */
      "namespace": new n3.NamedNode("http://www.w3.org/ns/shacl#namespace"),
      /** Specifies the node shape that all value nodes must conform to. */
      "node": new n3.NamedNode("http://www.w3.org/ns/shacl#node"),
      /** Specifies the node kind (e.g. IRI or literal) each value node. */
      "nodeKind": new n3.NamedNode("http://www.w3.org/ns/shacl#nodeKind"),
      /** The validator(s) used to evaluate a constraint in the context of a node shape. */
      "nodeValidator": new n3.NamedNode("http://www.w3.org/ns/shacl#nodeValidator"),
      /** The node expression producing the input nodes of a filter shape expression. */
      "nodes": new n3.NamedNode("http://www.w3.org/ns/shacl#nodes"),
      /** Specifies a shape that the value nodes must not conform to. */
      "not": new n3.NamedNode("http://www.w3.org/ns/shacl#not"),
      /** An expression producing the nodes that shall be inferred as objects. */
      "object": new n3.NamedNode("http://www.w3.org/ns/shacl#object"),
      /** The (single) value of this property represents a path that is matched one or more times. */
      "oneOrMorePath": new n3.NamedNode("http://www.w3.org/ns/shacl#oneOrMorePath"),
      /** Indicates whether a parameter is optional. */
      "optional": new n3.NamedNode("http://www.w3.org/ns/shacl#optional"),
      /** Specifies a list of shapes so that the value nodes must conform to at least one of the shapes. */
      "or": new n3.NamedNode("http://www.w3.org/ns/shacl#or"),
      /** Specifies the relative order of this compared to its siblings. For example use 0 for the first, 1 for the second. */
      "order": new n3.NamedNode("http://www.w3.org/ns/shacl#order"),
      /** The parameters of a function or constraint component. */
      "parameter": new n3.NamedNode("http://www.w3.org/ns/shacl#parameter"),
      /** Specifies the property path of a property shape. */
      "path": new n3.NamedNode("http://www.w3.org/ns/shacl#path"),
      /** Specifies a regular expression pattern that the string representations of the value nodes must match. */
      "pattern": new n3.NamedNode("http://www.w3.org/ns/shacl#pattern"),
      /** An expression producing the properties that shall be inferred as predicates. */
      "predicate": new n3.NamedNode("http://www.w3.org/ns/shacl#predicate"),
      /** The prefix of a prefix declaration. */
      "prefix": new n3.NamedNode("http://www.w3.org/ns/shacl#prefix"),
      /** The prefixes that shall be applied before parsing the associated SPARQL query. */
      "prefixes": new n3.NamedNode("http://www.w3.org/ns/shacl#prefixes"),
      /** Links a shape to its property shapes. */
      "property": new n3.NamedNode("http://www.w3.org/ns/shacl#property"),
      /** The validator(s) used to evaluate a constraint in the context of a property shape. */
      "propertyValidator": new n3.NamedNode("http://www.w3.org/ns/shacl#propertyValidator"),
      /** The maximum number of value nodes that can conform to the shape. */
      "qualifiedMaxCount": new n3.NamedNode("http://www.w3.org/ns/shacl#qualifiedMaxCount"),
      /** The minimum number of value nodes that must conform to the shape. */
      "qualifiedMinCount": new n3.NamedNode("http://www.w3.org/ns/shacl#qualifiedMinCount"),
      /** The shape that a specified number of values must conform to. */
      "qualifiedValueShape": new n3.NamedNode("http://www.w3.org/ns/shacl#qualifiedValueShape"),
      /** Can be used to mark the qualified value shape to be disjoint with its sibling shapes. */
      "qualifiedValueShapesDisjoint": new n3.NamedNode("http://www.w3.org/ns/shacl#qualifiedValueShapesDisjoint"),
      /** The validation results contained in a validation report. */
      "result": new n3.NamedNode("http://www.w3.org/ns/shacl#result"),
      /** Links a SPARQL validator with zero or more sh:ResultAnnotation instances, defining how to derive additional result properties based on the variables of the SELECT query. */
      "resultAnnotation": new n3.NamedNode("http://www.w3.org/ns/shacl#resultAnnotation"),
      /** Human-readable messages explaining the cause of the result. */
      "resultMessage": new n3.NamedNode("http://www.w3.org/ns/shacl#resultMessage"),
      /** The path of a validation result, based on the path of the validated property shape. */
      "resultPath": new n3.NamedNode("http://www.w3.org/ns/shacl#resultPath"),
      /** The severity of the result, e.g. warning. */
      "resultSeverity": new n3.NamedNode("http://www.w3.org/ns/shacl#resultSeverity"),
      /** The expected type of values returned by the associated function. */
      "returnType": new n3.NamedNode("http://www.w3.org/ns/shacl#returnType"),
      /** The rules linked to a shape. */
      "rule": new n3.NamedNode("http://www.w3.org/ns/shacl#rule"),
      /** The SPARQL SELECT query to execute. */
      "select": new n3.NamedNode("http://www.w3.org/ns/shacl#select"),
      /** Defines the severity that validation results produced by a shape must have. Defaults to sh:Violation. */
      "severity": new n3.NamedNode("http://www.w3.org/ns/shacl#severity"),
      /** Shapes graphs that should be used when validating this data graph. */
      "shapesGraph": new n3.NamedNode("http://www.w3.org/ns/shacl#shapesGraph"),
      /** If true then the validation engine was certain that the shapes graph has passed all SHACL syntax requirements during the validation process. */
      "shapesGraphWellFormed": new n3.NamedNode("http://www.w3.org/ns/shacl#shapesGraphWellFormed"),
      /** The constraint that was validated when the result was produced. */
      "sourceConstraint": new n3.NamedNode("http://www.w3.org/ns/shacl#sourceConstraint"),
      /** The constraint component that is the source of the result. */
      "sourceConstraintComponent": new n3.NamedNode("http://www.w3.org/ns/shacl#sourceConstraintComponent"),
      /** The shape that is was validated when the result was produced. */
      "sourceShape": new n3.NamedNode("http://www.w3.org/ns/shacl#sourceShape"),
      /** Links a shape with SPARQL constraints. */
      "sparql": new n3.NamedNode("http://www.w3.org/ns/shacl#sparql"),
      /** An expression producing the resources that shall be inferred as subjects. */
      "subject": new n3.NamedNode("http://www.w3.org/ns/shacl#subject"),
      /** Suggested shapes graphs for this ontology. The values of this property may be used in the absence of specific sh:shapesGraph statements. */
      "suggestedShapesGraph": new n3.NamedNode("http://www.w3.org/ns/shacl#suggestedShapesGraph"),
      /** Links a shape to a target specified by an extension language, for example instances of sh:SPARQLTarget. */
      "target": new n3.NamedNode("http://www.w3.org/ns/shacl#target"),
      /** Links a shape to a class, indicating that all instances of the class must conform to the shape. */
      "targetClass": new n3.NamedNode("http://www.w3.org/ns/shacl#targetClass"),
      /** Links a shape to individual nodes, indicating that these nodes must conform to the shape. */
      "targetNode": new n3.NamedNode("http://www.w3.org/ns/shacl#targetNode"),
      /** Links a shape to a property, indicating that all all objects of triples that have the given property as their predicate must conform to the shape. */
      "targetObjectsOf": new n3.NamedNode("http://www.w3.org/ns/shacl#targetObjectsOf"),
      /** Links a shape to a property, indicating that all subjects of triples that have the given property as their predicate must conform to the shape. */
      "targetSubjectsOf": new n3.NamedNode("http://www.w3.org/ns/shacl#targetSubjectsOf"),
      /** A node expression that represents the current focus node. */
      "this": new n3.NamedNode("http://www.w3.org/ns/shacl#this"),
      /** A list of node expressions that shall be used together. */
      "union": new n3.NamedNode("http://www.w3.org/ns/shacl#union"),
      /** Specifies whether all node values must have a unique (or no) language tag. */
      "uniqueLang": new n3.NamedNode("http://www.w3.org/ns/shacl#uniqueLang"),
      /** The SPARQL UPDATE to execute. */
      "update": new n3.NamedNode("http://www.w3.org/ns/shacl#update"),
      /** The validator(s) used to evaluate constraints of either node or property shapes. */
      "validator": new n3.NamedNode("http://www.w3.org/ns/shacl#validator"),
      /** An RDF node that has caused the result. */
      "value": new n3.NamedNode("http://www.w3.org/ns/shacl#value"),
      /** Specifies a list of shapes so that the value nodes must conform to exactly one of the shapes. */
      "xone": new n3.NamedNode("http://www.w3.org/ns/shacl#xone"),
      /** The (single) value of this property represents a path that is matched zero or more times. */
      "zeroOrMorePath": new n3.NamedNode("http://www.w3.org/ns/shacl#zeroOrMorePath"),
      /** The (single) value of this property represents a path that is matched zero or one times. */
      "zeroOrOnePath": new n3.NamedNode("http://www.w3.org/ns/shacl#zeroOrOnePath")
    };
  }
});

// node_modules/@faubulous/mentor-rdf/dist/ontologies/skos.js
var require_skos = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/ontologies/skos.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.skos = exports.SKOS = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    exports.SKOS = {
      "core": "http://www.w3.org/2004/02/skos/core",
      /** A meaningful collection of concepts. */
      "Collection": "http://www.w3.org/2004/02/skos/core#Collection",
      /** An idea or notion; a unit of thought. */
      "Concept": "http://www.w3.org/2004/02/skos/core#Concept",
      /** A set of concepts, optionally including statements about semantic relationships between those concepts. */
      "ConceptScheme": "http://www.w3.org/2004/02/skos/core#ConceptScheme",
      /** An ordered collection of concepts, where both the grouping and the ordering are meaningful. */
      "OrderedCollection": "http://www.w3.org/2004/02/skos/core#OrderedCollection",
      /** An alternative lexical label for a resource. */
      "altLabel": "http://www.w3.org/2004/02/skos/core#altLabel",
      /** skos:broadMatch is used to state a hierarchical mapping link between two conceptual resources in different concept schemes. */
      "broadMatch": "http://www.w3.org/2004/02/skos/core#broadMatch",
      /** Relates a concept to a concept that is more general in meaning. */
      "broader": "http://www.w3.org/2004/02/skos/core#broader",
      /** skos:broaderTransitive is a transitive superproperty of skos:broader. */
      "broaderTransitive": "http://www.w3.org/2004/02/skos/core#broaderTransitive",
      /** A note about a modification to a concept. */
      "changeNote": "http://www.w3.org/2004/02/skos/core#changeNote",
      /** skos:closeMatch is used to link two concepts that are sufficiently similar that they can be used interchangeably in some information retrieval applications. In order to avoid the possibility of "compound errors" when combining mappings across more than two concept schemes, skos:closeMatch is not declared to be a transitive property. */
      "closeMatch": "http://www.w3.org/2004/02/skos/core#closeMatch",
      /** A statement or formal explanation of the meaning of a concept. */
      "definition": "http://www.w3.org/2004/02/skos/core#definition",
      /** A note for an editor, translator or maintainer of the vocabulary. */
      "editorialNote": "http://www.w3.org/2004/02/skos/core#editorialNote",
      /** skos:exactMatch is used to link two concepts, indicating a high degree of confidence that the concepts can be used interchangeably across a wide range of information retrieval applications. skos:exactMatch is a transitive property, and is a sub-property of skos:closeMatch. */
      "exactMatch": "http://www.w3.org/2004/02/skos/core#exactMatch",
      /** An example of the use of a concept. */
      "example": "http://www.w3.org/2004/02/skos/core#example",
      /** Relates, by convention, a concept scheme to a concept which is topmost in the broader/narrower concept hierarchies for that scheme, providing an entry point to these hierarchies. */
      "hasTopConcept": "http://www.w3.org/2004/02/skos/core#hasTopConcept",
      /** A lexical label for a resource that should be hidden when generating visual displays of the resource, but should still be accessible to free text search operations. */
      "hiddenLabel": "http://www.w3.org/2004/02/skos/core#hiddenLabel",
      /** A note about the past state/use/meaning of a concept. */
      "historyNote": "http://www.w3.org/2004/02/skos/core#historyNote",
      /** Relates a resource (for example a concept) to a concept scheme in which it is included. */
      "inScheme": "http://www.w3.org/2004/02/skos/core#inScheme",
      /** Relates two concepts coming, by convention, from different schemes, and that have comparable meanings */
      "mappingRelation": "http://www.w3.org/2004/02/skos/core#mappingRelation",
      /** Relates a collection to one of its members. */
      "member": "http://www.w3.org/2004/02/skos/core#member",
      /** Relates an ordered collection to the RDF list containing its members. */
      "memberList": "http://www.w3.org/2004/02/skos/core#memberList",
      /** skos:narrowMatch is used to state a hierarchical mapping link between two conceptual resources in different concept schemes. */
      "narrowMatch": "http://www.w3.org/2004/02/skos/core#narrowMatch",
      /** Relates a concept to a concept that is more specific in meaning. */
      "narrower": "http://www.w3.org/2004/02/skos/core#narrower",
      /** skos:narrowerTransitive is a transitive superproperty of skos:narrower. */
      "narrowerTransitive": "http://www.w3.org/2004/02/skos/core#narrowerTransitive",
      /** A notation, also known as classification code, is a string of characters such as "T58.5" or "303.4833" used to uniquely identify a concept within the scope of a given concept scheme. */
      "notation": "http://www.w3.org/2004/02/skos/core#notation",
      /** A general note, for any purpose. */
      "note": "http://www.w3.org/2004/02/skos/core#note",
      /** The preferred lexical label for a resource, in a given language. */
      "prefLabel": "http://www.w3.org/2004/02/skos/core#prefLabel",
      /** Relates a concept to a concept with which there is an associative semantic relationship. */
      "related": "http://www.w3.org/2004/02/skos/core#related",
      /** skos:relatedMatch is used to state an associative mapping link between two conceptual resources in different concept schemes. */
      "relatedMatch": "http://www.w3.org/2004/02/skos/core#relatedMatch",
      /** A note that helps to clarify the meaning and/or the use of a concept. */
      "scopeNote": "http://www.w3.org/2004/02/skos/core#scopeNote",
      /** Links a concept to a concept related by meaning. */
      "semanticRelation": "http://www.w3.org/2004/02/skos/core#semanticRelation",
      /** Relates a concept to the concept scheme that it is a top level concept of. */
      "topConceptOf": "http://www.w3.org/2004/02/skos/core#topConceptOf"
    };
    exports.skos = {
      "core": new n3.NamedNode("http://www.w3.org/2004/02/skos/core"),
      /** A meaningful collection of concepts. */
      "Collection": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#Collection"),
      /** An idea or notion; a unit of thought. */
      "Concept": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#Concept"),
      /** A set of concepts, optionally including statements about semantic relationships between those concepts. */
      "ConceptScheme": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#ConceptScheme"),
      /** An ordered collection of concepts, where both the grouping and the ordering are meaningful. */
      "OrderedCollection": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#OrderedCollection"),
      /** An alternative lexical label for a resource. */
      "altLabel": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#altLabel"),
      /** skos:broadMatch is used to state a hierarchical mapping link between two conceptual resources in different concept schemes. */
      "broadMatch": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#broadMatch"),
      /** Relates a concept to a concept that is more general in meaning. */
      "broader": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#broader"),
      /** skos:broaderTransitive is a transitive superproperty of skos:broader. */
      "broaderTransitive": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#broaderTransitive"),
      /** A note about a modification to a concept. */
      "changeNote": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#changeNote"),
      /** skos:closeMatch is used to link two concepts that are sufficiently similar that they can be used interchangeably in some information retrieval applications. In order to avoid the possibility of "compound errors" when combining mappings across more than two concept schemes, skos:closeMatch is not declared to be a transitive property. */
      "closeMatch": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#closeMatch"),
      /** A statement or formal explanation of the meaning of a concept. */
      "definition": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#definition"),
      /** A note for an editor, translator or maintainer of the vocabulary. */
      "editorialNote": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#editorialNote"),
      /** skos:exactMatch is used to link two concepts, indicating a high degree of confidence that the concepts can be used interchangeably across a wide range of information retrieval applications. skos:exactMatch is a transitive property, and is a sub-property of skos:closeMatch. */
      "exactMatch": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#exactMatch"),
      /** An example of the use of a concept. */
      "example": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#example"),
      /** Relates, by convention, a concept scheme to a concept which is topmost in the broader/narrower concept hierarchies for that scheme, providing an entry point to these hierarchies. */
      "hasTopConcept": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#hasTopConcept"),
      /** A lexical label for a resource that should be hidden when generating visual displays of the resource, but should still be accessible to free text search operations. */
      "hiddenLabel": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#hiddenLabel"),
      /** A note about the past state/use/meaning of a concept. */
      "historyNote": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#historyNote"),
      /** Relates a resource (for example a concept) to a concept scheme in which it is included. */
      "inScheme": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#inScheme"),
      /** Relates two concepts coming, by convention, from different schemes, and that have comparable meanings */
      "mappingRelation": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#mappingRelation"),
      /** Relates a collection to one of its members. */
      "member": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#member"),
      /** Relates an ordered collection to the RDF list containing its members. */
      "memberList": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#memberList"),
      /** skos:narrowMatch is used to state a hierarchical mapping link between two conceptual resources in different concept schemes. */
      "narrowMatch": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#narrowMatch"),
      /** Relates a concept to a concept that is more specific in meaning. */
      "narrower": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#narrower"),
      /** skos:narrowerTransitive is a transitive superproperty of skos:narrower. */
      "narrowerTransitive": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#narrowerTransitive"),
      /** A notation, also known as classification code, is a string of characters such as "T58.5" or "303.4833" used to uniquely identify a concept within the scope of a given concept scheme. */
      "notation": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#notation"),
      /** A general note, for any purpose. */
      "note": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#note"),
      /** The preferred lexical label for a resource, in a given language. */
      "prefLabel": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#prefLabel"),
      /** Relates a concept to a concept with which there is an associative semantic relationship. */
      "related": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#related"),
      /** skos:relatedMatch is used to state an associative mapping link between two conceptual resources in different concept schemes. */
      "relatedMatch": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#relatedMatch"),
      /** A note that helps to clarify the meaning and/or the use of a concept. */
      "scopeNote": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#scopeNote"),
      /** Links a concept to a concept related by meaning. */
      "semanticRelation": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#semanticRelation"),
      /** Relates a concept to the concept scheme that it is a top level concept of. */
      "topConceptOf": new n3.NamedNode("http://www.w3.org/2004/02/skos/core#topConceptOf")
    };
  }
});

// node_modules/@faubulous/mentor-rdf/dist/ontologies/xsd.js
var require_xsd = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/ontologies/xsd.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.xsd = exports.XSD = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    exports.XSD = {
      /** anyURI represents an Internationalized Resource Identifier Reference (IRI).  An anyURI value can be absolute or relative, and may have an optional fragment identifier (i.e., it may be an IRI Reference).  This type should be used when the value fulfills the role of an IRI, as defined in [RFC 3987] or its successor(s) in the IETF Standards Track. */
      "anyURI": "http://www.w3.org/2001/XMLSchema#anyURI",
      /** base64Binary represents arbitrary Base64-encoded binary data.  For base64Binary data the entire binary stream is encoded using the Base64 Encoding defined in [RFC 3548], which is derived from the encoding described in [RFC 2045]. */
      "base64Binary": "http://www.w3.org/2001/XMLSchema#base64Binary",
      /** boolean represents the values of two-valued logic. */
      "boolean": "http://www.w3.org/2001/XMLSchema#boolean",
      /** byte is ·derived· from short by setting the value of ·maxInclusive· to be 127 and ·minInclusive· to be -128. The ·base type· of byte is short. */
      "byte": "http://www.w3.org/2001/XMLSchema#byte",
      /** date represents top-open intervals of exactly one day in length on the timelines of dateTime, beginning on the beginning moment of each day, up to but not including the beginning moment of the next day).  For non-timezoned values, the top-open intervals disjointly cover the non-timezoned timeline, one per day.  For timezoned values, the intervals begin at every minute and therefore overlap. */
      "date": "http://www.w3.org/2001/XMLSchema#date",
      /** dateTime represents instants of time, optionally marked with a particular time zone offset.  Values representing the same instant but having different time zone offsets are equal but not identical. */
      "dateTime": "http://www.w3.org/2001/XMLSchema#dateTime",
      /** decimal represents a subset of the real numbers, which can be represented by decimal numerals. The ·value space· of decimal is the set of numbers that can be obtained by dividing an integer by a non-negative power of ten, i.e., expressible as i / 10n where i and n are integers and n ≥ 0. Precision is not reflected in this value space; the number 2.0 is not distinct from the number 2.00. The order relation on decimal is the order relation on real numbers, restricted to this subset. */
      "decimal": "http://www.w3.org/2001/XMLSchema#decimal",
      /** The double datatype is patterned after the IEEE double-precision 64-bit floating point datatype [IEEE 754-2008].  Each floating point datatype has a value space that is a subset of the rational numbers.  Floating point numbers are often used to approximate arbitrary real numbers. */
      "double": "http://www.w3.org/2001/XMLSchema#double",
      /** duration is a datatype that represents durations of time.  The concept of duration being captured is drawn from those of [ISO 8601], specifically durations without fixed endpoints. */
      "duration": "http://www.w3.org/2001/XMLSchema#duration",
      /** The float datatype is patterned after the IEEE single-precision 32-bit floating point datatype [IEEE 754-2008].  Its value space is a subset of the rational numbers.  Floating point numbers are often used to approximate arbitrary real numbers. */
      "float": "http://www.w3.org/2001/XMLSchema#float",
      /** int is ·derived· from long by setting the value of ·maxInclusive· to be 2147483647 and ·minInclusive· to be -2147483648.  The ·base type· of int is long. */
      "int": "http://www.w3.org/2001/XMLSchema#int",
      /** integer is ·derived· from decimal by fixing the value of ·fractionDigits· to be 0 and disallowing the trailing decimal point.  This results in the standard mathematical concept of the integer numbers.  The ·value space· of integer is the infinite set {...,-2,-1,0,1,2,...}.  The ·base type· of integer is decimal. */
      "integer": "http://www.w3.org/2001/XMLSchema#integer",
      /** long is ·derived· from integer by setting the value of ·maxInclusive· to be 9223372036854775807 and ·minInclusive· to be -9223372036854775808. The ·base type· of long is integer. */
      "long": "http://www.w3.org/2001/XMLSchema#long",
      /** negativeInteger is ·derived· from nonPositiveInteger by setting the value of ·maxInclusive· to be -1.  This results in the standard mathematical concept of the negative integers.  The ·value space· of negativeInteger is the infinite set {...,-2,-1}.  The ·base type· of negativeInteger is nonPositiveInteger. */
      "negativeInteger": "http://www.w3.org/2001/XMLSchema#negativeInteger",
      "nonNegativeInteger": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
      /** nonPositiveInteger is ·derived· from integer by setting the value of ·maxInclusive· to be 0.  This results in the standard mathematical concept of the non-positive integers. The ·value space· of nonPositiveInteger is the infinite set {...,-2,-1,0}.  The ·base type· of nonPositiveInteger is integer. */
      "nonPositiveInteger": "http://www.w3.org/2001/XMLSchema#nonPositiveInteger",
      /** nonNegativeInteger is ·derived· from integer by setting the value of ·minInclusive· to be 0.  This results in the standard mathematical concept of the non-negative integers. The ·value space· of nonNegativeInteger is the infinite set {0,1,2,...}.  The ·base type· of nonNegativeInteger is integer. */
      "positiveInteger": "http://www.w3.org/2001/XMLSchema#positiveInteger",
      /** short is ·derived· from int by setting the value of ·maxInclusive· to be 32767 and ·minInclusive· to be -32768.  The ·base type· of short is int. */
      "short": "http://www.w3.org/2001/XMLSchema#short",
      /** The string datatype represents character strings in XML. */
      "string": "http://www.w3.org/2001/XMLSchema#string",
      /** time represents instants of time that recur at the same point in each calendar day, or that occur in some arbitrary calendar day. */
      "time": "http://www.w3.org/2001/XMLSchema#time",
      /** unsignedInt is ·derived· from unsignedLong by setting the value of ·maxInclusive· to be 4294967295.  The ·base type· of unsignedInt is unsignedLong. */
      "unsignedInt": "http://www.w3.org/2001/XMLSchema#unsignedInt",
      /** unsignedShort is ·derived· from unsignedInt by setting the value of ·maxInclusive· to be 65535.  The ·base type· of unsignedShort is unsignedInt. */
      "unsignedShort": "http://www.w3.org/2001/XMLSchema#unsignedShort",
      /** unsignedLong is ·derived· from nonNegativeInteger by setting the value of ·maxInclusive· to be 18446744073709551615.  The ·base type· of unsignedLong is nonNegativeInteger. */
      "unsingedLong": "http://www.w3.org/2001/XMLSchema#unsingedLong",
      /** unsignedByte is ·derived· from unsignedShort by setting the value of ·maxInclusive· to be 255.  The ·base type· of unsignedByte is unsignedShort. */
      "usignedByte": "http://www.w3.org/2001/XMLSchema#usignedByte"
    };
    exports.xsd = {
      /** anyURI represents an Internationalized Resource Identifier Reference (IRI).  An anyURI value can be absolute or relative, and may have an optional fragment identifier (i.e., it may be an IRI Reference).  This type should be used when the value fulfills the role of an IRI, as defined in [RFC 3987] or its successor(s) in the IETF Standards Track. */
      "anyURI": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#anyURI"),
      /** base64Binary represents arbitrary Base64-encoded binary data.  For base64Binary data the entire binary stream is encoded using the Base64 Encoding defined in [RFC 3548], which is derived from the encoding described in [RFC 2045]. */
      "base64Binary": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#base64Binary"),
      /** boolean represents the values of two-valued logic. */
      "boolean": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#boolean"),
      /** byte is ·derived· from short by setting the value of ·maxInclusive· to be 127 and ·minInclusive· to be -128. The ·base type· of byte is short. */
      "byte": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#byte"),
      /** date represents top-open intervals of exactly one day in length on the timelines of dateTime, beginning on the beginning moment of each day, up to but not including the beginning moment of the next day).  For non-timezoned values, the top-open intervals disjointly cover the non-timezoned timeline, one per day.  For timezoned values, the intervals begin at every minute and therefore overlap. */
      "date": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#date"),
      /** dateTime represents instants of time, optionally marked with a particular time zone offset.  Values representing the same instant but having different time zone offsets are equal but not identical. */
      "dateTime": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#dateTime"),
      /** decimal represents a subset of the real numbers, which can be represented by decimal numerals. The ·value space· of decimal is the set of numbers that can be obtained by dividing an integer by a non-negative power of ten, i.e., expressible as i / 10n where i and n are integers and n ≥ 0. Precision is not reflected in this value space; the number 2.0 is not distinct from the number 2.00. The order relation on decimal is the order relation on real numbers, restricted to this subset. */
      "decimal": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#decimal"),
      /** The double datatype is patterned after the IEEE double-precision 64-bit floating point datatype [IEEE 754-2008].  Each floating point datatype has a value space that is a subset of the rational numbers.  Floating point numbers are often used to approximate arbitrary real numbers. */
      "double": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#double"),
      /** duration is a datatype that represents durations of time.  The concept of duration being captured is drawn from those of [ISO 8601], specifically durations without fixed endpoints. */
      "duration": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#duration"),
      /** The float datatype is patterned after the IEEE single-precision 32-bit floating point datatype [IEEE 754-2008].  Its value space is a subset of the rational numbers.  Floating point numbers are often used to approximate arbitrary real numbers. */
      "float": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#float"),
      /** int is ·derived· from long by setting the value of ·maxInclusive· to be 2147483647 and ·minInclusive· to be -2147483648.  The ·base type· of int is long. */
      "int": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#int"),
      /** integer is ·derived· from decimal by fixing the value of ·fractionDigits· to be 0 and disallowing the trailing decimal point.  This results in the standard mathematical concept of the integer numbers.  The ·value space· of integer is the infinite set {...,-2,-1,0,1,2,...}.  The ·base type· of integer is decimal. */
      "integer": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#integer"),
      /** long is ·derived· from integer by setting the value of ·maxInclusive· to be 9223372036854775807 and ·minInclusive· to be -9223372036854775808. The ·base type· of long is integer. */
      "long": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#long"),
      /** negativeInteger is ·derived· from nonPositiveInteger by setting the value of ·maxInclusive· to be -1.  This results in the standard mathematical concept of the negative integers.  The ·value space· of negativeInteger is the infinite set {...,-2,-1}.  The ·base type· of negativeInteger is nonPositiveInteger. */
      "negativeInteger": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#negativeInteger"),
      "nonNegativeInteger": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#nonNegativeInteger"),
      /** nonPositiveInteger is ·derived· from integer by setting the value of ·maxInclusive· to be 0.  This results in the standard mathematical concept of the non-positive integers. The ·value space· of nonPositiveInteger is the infinite set {...,-2,-1,0}.  The ·base type· of nonPositiveInteger is integer. */
      "nonPositiveInteger": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#nonPositiveInteger"),
      /** nonNegativeInteger is ·derived· from integer by setting the value of ·minInclusive· to be 0.  This results in the standard mathematical concept of the non-negative integers. The ·value space· of nonNegativeInteger is the infinite set {0,1,2,...}.  The ·base type· of nonNegativeInteger is integer. */
      "positiveInteger": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#positiveInteger"),
      /** short is ·derived· from int by setting the value of ·maxInclusive· to be 32767 and ·minInclusive· to be -32768.  The ·base type· of short is int. */
      "short": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#short"),
      /** The string datatype represents character strings in XML. */
      "string": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#string"),
      /** time represents instants of time that recur at the same point in each calendar day, or that occur in some arbitrary calendar day. */
      "time": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#time"),
      /** unsignedInt is ·derived· from unsignedLong by setting the value of ·maxInclusive· to be 4294967295.  The ·base type· of unsignedInt is unsignedLong. */
      "unsignedInt": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#unsignedInt"),
      /** unsignedShort is ·derived· from unsignedInt by setting the value of ·maxInclusive· to be 65535.  The ·base type· of unsignedShort is unsignedInt. */
      "unsignedShort": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#unsignedShort"),
      /** unsignedLong is ·derived· from nonNegativeInteger by setting the value of ·maxInclusive· to be 18446744073709551615.  The ·base type· of unsignedLong is nonNegativeInteger. */
      "unsingedLong": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#unsingedLong"),
      /** unsignedByte is ·derived· from unsignedShort by setting the value of ·maxInclusive· to be 255.  The ·base type· of unsignedByte is unsignedShort. */
      "usignedByte": new n3.NamedNode("http://www.w3.org/2001/XMLSchema#usignedByte")
    };
  }
});

// node_modules/@faubulous/mentor-rdf/dist/ontologies/index.js
var require_ontologies = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/ontologies/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_owl(), exports);
    tslib_1.__exportStar(require_rdf(), exports);
    tslib_1.__exportStar(require_rdfa(), exports);
    tslib_1.__exportStar(require_rdfs(), exports);
    tslib_1.__exportStar(require_shacl(), exports);
    tslib_1.__exportStar(require_skos(), exports);
    tslib_1.__exportStar(require_xsd(), exports);
  }
});

// node_modules/@faubulous/mentor-rdf/dist/rdf/resource-repository.js
var require_resource_repository = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/rdf/resource-repository.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ResourceRepository = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    var ResourceRepository2 = class {
      constructor(store) {
        this.store = store;
      }
      /**
       * Indicate if a given URI exists as the subject of a triple in the graph.
       * @returns true if the URI is a subject, false otherwise.
       */
      hasSubject(uri) {
        const s = n3.DataFactory.namedNode(uri);
        for (let q of this.store.match(s)) {
          if (!q.graph.value.endsWith("inference")) {
            return true;
          }
        }
        return false;
      }
    };
    exports.ResourceRepository = ResourceRepository2;
  }
});

// node_modules/@faubulous/mentor-rdf/dist/rdf/class-repository.js
var require_class_repository = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/rdf/class-repository.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ClassRepository = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    var ontologies_1 = require_ontologies();
    var resource_repository_1 = require_resource_repository();
    var ClassRepository2 = class extends resource_repository_1.ResourceRepository {
      constructor(store) {
        super(store);
      }
      /**
       * Get all classes in the repository.
       * @returns A list of all classes in the repository.
       */
      getClasses() {
        const result = /* @__PURE__ */ new Set();
        for (let q of this.store.match(null, ontologies_1.rdf.type, ontologies_1.rdfs.Class)) {
          const s = q.subject;
          if (s.termType != "NamedNode") {
            continue;
          }
          result.add(s.value);
        }
        return Array.from(result);
      }
      /**
       * Get the super classes of a given class.
       * @param subject URI of a class.
       * @returns An array of super classes of the given class, an empty array if the class has no super classes.
       */
      getSuperClasses(subject) {
        const result = [];
        const s = n3.DataFactory.namedNode(subject);
        for (let q of this.store.match(s, ontologies_1.rdfs.subClassOf, null)) {
          const o = q.object;
          if (o.termType != "NamedNode") {
            continue;
          }
          result.push(o.value);
        }
        return result;
      }
      /**
       * Recursively find the first path from a given class to a root class.
       * @param subject URI of a class.
       * @param path The current class path.
       * @param backtrack Set of URIs that have already been visited.
       * @returns The first path that is found from the given class to a root class.
       */
      _getRootClassPath(subject, path2, backtrack) {
        const superClasses = this.getSuperClasses(subject);
        for (let o of superClasses.filter((o2) => !backtrack.has(o2))) {
          return this._getRootClassPath(o, [...path2, o], backtrack);
        }
        return path2;
      }
      /**
       * Get the first discovered path from a given class to a root class.
       * @param subject URI of a class.
       * @returns A string array containing the first path that is found from the given class to a root class.
       */
      getRootClassPath(subject) {
        return this._getRootClassPath(subject, [], /* @__PURE__ */ new Set());
      }
      /**
       * Indicate if there are sub classes of a given class.
       * @param subject URI of a class.
       * @returns true if the class has sub classes, false otherwise.
       */
      hasSubClasses(subject) {
        const o = n3.DataFactory.namedNode(subject);
        for (let _q of this.store.match(null, ontologies_1.rdfs.subClassOf, o)) {
          return true;
        }
        return false;
      }
      /**
       * Get the sub classes of a given class or all root classes.
       * @param subject URI of a class or undefined to get all root classes.
       * @returns An array of sub classes of the given class, an empty array if the class has no sub classes.
       */
      getSubClasses(subject) {
        if (subject) {
          const result = /* @__PURE__ */ new Set();
          const o = n3.DataFactory.namedNode(subject);
          for (let q of this.store.match(null, ontologies_1.rdfs.subClassOf, o)) {
            const s = q.subject;
            if (s.termType != "NamedNode") {
              continue;
            }
            result.add(s.value);
          }
          return Array.from(result);
        } else {
          return this.getRootClasses();
        }
      }
      /**
       * Get all classes from the repository that have no super classes.
       * @returns An array of root classes in the repository.
       */
      getRootClasses() {
        const classes = /* @__PURE__ */ new Set();
        const subclasses = /* @__PURE__ */ new Set();
        for (let q of this.store.match(null, ontologies_1.rdf.type, ontologies_1.rdfs.Class)) {
          const s = q.subject;
          if (s.termType != "NamedNode") {
            continue;
          }
          classes.add(s.value);
        }
        for (let q of this.store.match(null, ontologies_1.rdfs.subClassOf, null)) {
          const s = q.subject;
          const o = q.object;
          if (s.termType != "NamedNode" || o.termType != "NamedNode") {
            continue;
          }
          classes.add(s.value);
          classes.add(o.value);
          subclasses.add(s.value);
        }
        return Array.from(classes).filter((c) => !subclasses.has(c));
      }
      /**
       * Indicate if there is an equivalent class of a given class.
       * @param subject URI of a class.
       * @returns true if the class has an equivalent class, false otherwise.
       */
      hasEquivalentClass(uri) {
        const s = n3.DataFactory.namedNode(uri);
        for (let _ of this.store.match(s, ontologies_1.owl.equivalentClass, null)) {
          return true;
        }
        return false;
      }
    };
    exports.ClassRepository = ClassRepository2;
  }
});

// node_modules/@faubulous/mentor-rdf/dist/rdf/property-repository.js
var require_property_repository = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/rdf/property-repository.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PropertyRepository = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    var ontologies_1 = require_ontologies();
    var resource_repository_1 = require_resource_repository();
    var PropertyRepository3 = class extends resource_repository_1.ResourceRepository {
      constructor(store) {
        super(store);
        this.domainPredicate = ontologies_1.rdfs.domain;
        this.rangePredicate = ontologies_1.rdfs.range;
      }
      /**
       * Get all properties in the repository.
       * @returns A list of all properties in the repository.
       */
      getProperties() {
        const result = /* @__PURE__ */ new Set();
        for (let q of this.store.match(null, ontologies_1.rdf.type, ontologies_1.rdf.Property)) {
          const s = q.subject;
          if (s.termType != "NamedNode") {
            continue;
          }
          result.add(s.value);
        }
        return Array.from(result);
      }
      /**
       * Get the super properties of a given property.
       * @param subject URI of a property.
       * @returns An array of super properties of the given property, an empty array if the property has no super properties.
       */
      getSuperProperties(subject) {
        const result = [];
        const s = n3.DataFactory.namedNode(subject);
        for (let q of this.store.match(s, ontologies_1.rdfs.subPropertyOf, null)) {
          const o = q.object;
          if (o.termType != "NamedNode") {
            continue;
          }
          result.push(o.value);
        }
        return result;
      }
      /**
       * Recursively find the first path from a given property to a root property.
       * @param subject URI of a property.
       * @param path The current property path.
       * @param backtrack Set of URIs that have already been visited.
       * @returns The first path that is found from the given property to a root class.
       */
      _getRootPropertyPath(subject, path2, backtrack) {
        const superClasses = this.getSuperProperties(subject);
        for (let o of superClasses.filter((o2) => !backtrack.has(o2))) {
          return this._getRootPropertyPath(o, [...path2, o], backtrack);
        }
        return path2;
      }
      /**
       * Get the first discovered path from a given property to a root property.
       * @param subject URI of a property.
       * @returns A string array containing the first path that is found from the given property to a root property.
       */
      getRootPropertiesPath(subject) {
        return this._getRootPropertyPath(subject, [], /* @__PURE__ */ new Set());
      }
      /**
       * Indicate if there are sub properties of a given property.
       * @param subject URI of a property.
       * @returns true if the property has sub properties, false otherwise.
       */
      hasSubProperties(subject) {
        const o = n3.DataFactory.namedNode(subject);
        for (let _q of this.store.match(null, ontologies_1.rdfs.subPropertyOf, o)) {
          return true;
        }
        return false;
      }
      /**
       * Get the sub properties of a given property or all root properties.
       * @param subject URI of a property or undefined to get all root properties.
       * @returns An array of sub properties of the given property, an empty array if the property has no sub properties.
       */
      getSubProperties(subject) {
        if (subject) {
          const result = /* @__PURE__ */ new Set();
          const o = n3.DataFactory.namedNode(subject);
          for (let q of this.store.match(null, ontologies_1.rdfs.subPropertyOf, o)) {
            const s = q.subject;
            if (s.termType != "NamedNode") {
              continue;
            }
            result.add(s.value);
          }
          return Array.from(result);
        } else {
          return this.getRootProperties();
        }
      }
      /**
       * Get all properties from the repository that have no super properties.
       * @returns An array of root properties in the repository.
       */
      getRootProperties() {
        const properties = /* @__PURE__ */ new Set();
        const subproperties = /* @__PURE__ */ new Set();
        for (let q of this.store.match(null, ontologies_1.rdf.type, ontologies_1.rdf.Property)) {
          const s = q.subject;
          if (s.termType != "NamedNode") {
            continue;
          }
          properties.add(s.value);
        }
        for (let q of this.store.match(null, ontologies_1.rdfs.subPropertyOf, null)) {
          const s = q.subject;
          const o = q.object;
          if (s.termType != "NamedNode" || o.termType != "NamedNode") {
            continue;
          }
          properties.add(s.value);
          properties.add(o.value);
          subproperties.add(s.value);
        }
        return Array.from(properties).filter((c) => !subproperties.has(c));
      }
      /**
       * Indicate if there is an equivalent property of a given property.
       * @param subject URI of a property.
       * @returns true if the property has an equivalent property, false otherwise.
       */
      hasEquivalentProperty(uri) {
        const s = n3.DataFactory.namedNode(uri);
        for (let _ of this.store.match(s, ontologies_1.owl.equivalentProperty, null)) {
          return true;
        }
        return false;
      }
      /**
       * Get the domain of a given property.
       * @param uri URI of a property.
       * @returns The URI of the domain of the given property. If no domain is specified, rdfs:Resource is returned.
       */
      getDomain(uri) {
        const s = n3.DataFactory.namedNode(uri);
        for (let q of this.store.match(s, this.domainPredicate, null)) {
          return q.object.value;
        }
        return ontologies_1.rdfs.Resource.value;
      }
      /**
       * Get the range of a given property.
       * @param uri URI of a property.
       * @returns The URI of the range of the given property. If no range is specified, rdfs:Resource is returned.
       */
      getRange(uri) {
        const s = n3.DataFactory.namedNode(uri);
        for (let q of this.store.match(s, this.rangePredicate, null)) {
          return q.object.value;
        }
        return ontologies_1.rdfs.Resource.value;
      }
    };
    exports.PropertyRepository = PropertyRepository3;
  }
});

// node_modules/@faubulous/mentor-rdf/dist/rdf/individual-repository.js
var require_individual_repository = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/rdf/individual-repository.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IndividualRepository = void 0;
    var ontologies_1 = require_ontologies();
    var resource_repository_1 = require_resource_repository();
    var IndividualRepository2 = class extends resource_repository_1.ResourceRepository {
      constructor(store) {
        super(store);
      }
      /**
       * Get all individuals in the repository.
       * @returns A list of all individuals in the repository.
       */
      getIndividuals() {
        const result = /* @__PURE__ */ new Set();
        for (let q of this.store.match(null, ontologies_1.rdf.type, ontologies_1.owl.NamedIndividual)) {
          const s = q.subject;
          if (s.termType != "NamedNode") {
            continue;
          }
          result.add(s.value);
        }
        return Array.from(result);
      }
    };
    exports.IndividualRepository = IndividualRepository2;
  }
});

// node_modules/@faubulous/mentor-rdf/dist/rdf/rdfs-reasoner.js
var require_rdfs_reasoner = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/rdf/rdfs-reasoner.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RdfsReasoner = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    var ontologies_1 = require_ontologies();
    var RdfsReasoner = class {
      expand(store, sourceGraph, targetGraph) {
        let s = this.getGraphNode(sourceGraph);
        let t = this.getGraphNode(targetGraph);
        const lists = store.extractLists();
        for (let q of store.match(null, null, null, s)) {
          this.inferClassAxioms(store, t, lists, q);
          this.inferPropertyAxioms(store, t, lists, q);
          this.inferNamedIndividualAxioms(store, t, lists, q);
        }
        return store;
      }
      getGraphNode(graph) {
        if (typeof graph == "string") {
          return new n3.NamedNode(graph);
        } else {
          return graph;
        }
      }
      inferClassAxioms(store, graph, lists, quad2) {
        let s = quad2.subject;
        let p = quad2.predicate;
        let o = quad2.object.termType != "Literal" ? quad2.object : void 0;
        if (!o) {
          return;
        }
        switch (p.id) {
          case ontologies_1.rdf.type.id: {
            if (o.equals(ontologies_1.owl.Class)) {
              store.addQuad(s, ontologies_1.rdf.type, ontologies_1.rdfs.Class, graph);
            } else if (!o.value.startsWith("http://www.w3.org")) {
              store.addQuad(o, ontologies_1.rdf.type, ontologies_1.rdfs.Class, graph);
            }
            break;
          }
          case ontologies_1.rdfs.subClassOf.id: {
            store.addQuad(s, ontologies_1.rdf.type, ontologies_1.rdfs.Class, graph);
            if (!o.value.startsWith("http://www.w3.org")) {
              store.addQuad(o, ontologies_1.rdf.type, ontologies_1.rdfs.Class, graph);
            } else if (o.equals(ontologies_1.rdfs.Resource)) {
              store.addQuad(ontologies_1.rdfs.Resource, ontologies_1.rdf.type, ontologies_1.rdfs.Class, graph);
            } else if (o.equals(ontologies_1.rdfs.Class)) {
              store.addQuad(ontologies_1.rdfs.Class, ontologies_1.rdf.type, ontologies_1.rdfs.Class, graph);
              store.addQuad(ontologies_1.rdfs.Class, ontologies_1.rdfs.subClassOf, ontologies_1.rdfs.Resource, graph);
            } else if (o.equals(ontologies_1.rdfs.Datatype)) {
              store.addQuad(ontologies_1.rdfs.Datatype, ontologies_1.rdf.type, ontologies_1.rdfs.Class, graph);
              store.addQuad(ontologies_1.rdfs.Datatype, ontologies_1.rdfs.subClassOf, ontologies_1.rdfs.Class, graph);
            } else if (o.equals(ontologies_1.owl.Class)) {
              store.addQuad(ontologies_1.owl.Class, ontologies_1.rdf.type, ontologies_1.rdfs.Class, graph);
              store.addQuad(ontologies_1.owl.Class, ontologies_1.rdfs.subClassOf, ontologies_1.rdfs.Class, graph);
            }
            break;
          }
          case ontologies_1.rdfs.range.id:
          case ontologies_1.rdfs.domain.id: {
            if (!o.value.startsWith("http://www.w3.org")) {
              store.addQuad(o, ontologies_1.rdf.type, ontologies_1.rdfs.Class, graph);
            }
            break;
          }
        }
      }
      inferPropertyAxioms(store, targetGraph, lists, quad2) {
        let s = quad2.subject;
        let p = quad2.predicate;
        let o = quad2.object.termType != "Literal" ? quad2.object : void 0;
        if (!o) {
          return;
        }
        switch (p.id) {
          case ontologies_1.rdfs.range.id:
          case ontologies_1.rdfs.domain.id: {
            store.addQuad(s, ontologies_1.rdf.type, ontologies_1.rdf.Property, targetGraph);
            break;
          }
        }
      }
      inferNamedIndividualAxioms(store, targetGraph, lists, quad2) {
        let s = quad2.subject;
        let p = quad2.predicate;
        let o = quad2.object.termType != "Literal" ? quad2.object : void 0;
        if (!o || o.equals(ontologies_1.rdfs.Class) || o.equals(ontologies_1.owl.Class)) {
          return;
        }
        switch (p.id) {
          case ontologies_1.rdf.type.id: {
            for (let q of store.match(o, ontologies_1.rdf.type, ontologies_1.rdfs.Class)) {
              store.addQuad(s, ontologies_1.rdf.type, ontologies_1.owl.NamedIndividual, targetGraph);
              break;
            }
          }
        }
      }
    };
    exports.RdfsReasoner = RdfsReasoner;
  }
});

// node_modules/@faubulous/mentor-rdf/dist/rdf/owl-reasoner.js
var require_owl_reasoner = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/rdf/owl-reasoner.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OwlReasoner = void 0;
    var ontologies_1 = require_ontologies();
    var rdfs_reasoner_1 = require_rdfs_reasoner();
    var OwlReasoner2 = class extends rdfs_reasoner_1.RdfsReasoner {
      inferClassAxioms(store, targetGraph, lists, quad2) {
        super.inferClassAxioms(store, targetGraph, lists, quad2);
        let s = quad2.subject;
        let p = quad2.predicate;
        let o = quad2.object.termType != "Literal" ? quad2.object : void 0;
        if (!o) {
          return;
        }
        switch (p.id) {
          case ontologies_1.owl.equivalentClass.id:
          case ontologies_1.owl.complementOf.id:
          case ontologies_1.owl.disjointWith.id: {
            store.addQuad(s, ontologies_1.rdf.type, ontologies_1.rdfs.Class, targetGraph);
            if (o && !o.value.startsWith("http://www.w3.org")) {
              store.addQuad(o, ontologies_1.rdf.type, ontologies_1.rdfs.Class, targetGraph);
            }
            if (o.termType == "NamedNode") {
              store.addQuad(o, ontologies_1.owl.equivalentClass, s, targetGraph);
            }
            break;
          }
          case ontologies_1.owl.intersectionOf.id: {
            let equivalentSubjects = [...store.match(null, ontologies_1.owl.equivalentClass, s)].map((q) => q.subject).filter((q) => q.termType == "NamedNode");
            for (let c of lists[o.value]) {
              if (c.termType != "NamedNode") {
                continue;
              }
              store.addQuad(s, ontologies_1.rdfs.subClassOf, c, targetGraph);
              for (let es of equivalentSubjects) {
                store.addQuad(es, ontologies_1.rdfs.subClassOf, c, targetGraph);
              }
            }
            break;
          }
          case ontologies_1.owl.unionOf.id: {
            let equivalentSubjects = [...store.match(null, ontologies_1.owl.equivalentClass, s)].map((q) => q.subject).filter((q) => q.termType == "NamedNode");
            for (let c of lists[o.value]) {
              if (c.termType != "NamedNode") {
                continue;
              }
              store.addQuad(c, ontologies_1.rdfs.subClassOf, s, targetGraph);
              for (let es of equivalentSubjects) {
                store.addQuad(c, ontologies_1.rdfs.subClassOf, es, targetGraph);
              }
            }
            break;
          }
        }
      }
      inferPropertyAxioms(store, targetGraph, lists, quad2) {
        super.inferPropertyAxioms(store, targetGraph, lists, quad2);
        let s = quad2.subject;
        let p = quad2.predicate;
        let o = quad2.object.termType != "Literal" ? quad2.object : void 0;
        if (!o) {
          return;
        }
        switch (p.id) {
          case ontologies_1.owl.equivalentProperty.id: {
            store.addQuad(s, ontologies_1.rdf.type, ontologies_1.rdf.Property, targetGraph);
            store.addQuad(o, ontologies_1.rdf.type, ontologies_1.rdf.Property, targetGraph);
            if (o.termType == "NamedNode") {
              store.addQuad(o, ontologies_1.owl.equivalentProperty, s, targetGraph);
            }
            break;
          }
          case ontologies_1.rdf.type.id: {
            switch (o.id) {
              case ontologies_1.owl.AnnotationProperty.id:
              case ontologies_1.owl.AsymmetricProperty.id:
              case ontologies_1.owl.DatatypeProperty.id:
              case ontologies_1.owl.DeprecatedProperty.id:
              case ontologies_1.owl.FunctionalProperty.id:
              case ontologies_1.owl.InverseFunctionalProperty.id:
              case ontologies_1.owl.IrreflexiveProperty.id:
              case ontologies_1.owl.ObjectProperty.id:
              case ontologies_1.owl.OntologyProperty.id:
              case ontologies_1.owl.ReflexiveProperty.id:
              case ontologies_1.owl.SymmetricProperty.id:
              case ontologies_1.owl.TransitiveProperty.id: {
                store.addQuad(s, ontologies_1.rdf.type, ontologies_1.rdf.Property, targetGraph);
                break;
              }
            }
            break;
          }
        }
      }
    };
    exports.OwlReasoner = OwlReasoner2;
  }
});

// node_modules/@faubulous/mentor-rdf/dist/rdf/store-factory.js
var require_store_factory = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/rdf/store-factory.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StoreFactory = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var fs = tslib_1.__importStar(require("fs"));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    var StoreFactory2 = class {
      /**
       * Create an RDF store from a file.
       * @param path Path to a file containing RDF triples in Turtle or N3 format.
       * @param inference Indicates if OWL inference should be performed on the store.
       * @returns A promise that resolves to an RDF store.
       */
      static createFromFile(path2, parseOptions) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
          const graphUri = "file://" + process.cwd() + "/src/rdf/test/gist.ttl";
          const stream = fs.createReadStream(path2);
          return this.createFromStream(stream, graphUri, parseOptions);
        });
      }
      /**
       * Create an RDF store from a file.
       * @param input Input data or stream in Turtle format to be parsed.
       * @param graphUri URI of the graph to in which the triples will be created.
       * @param parseCallback Callback function that will be called for each parsed triple.
       * @returns A promise that resolves to an RDF store.
       */
      static createFromStream(input, graphUri, parseOptions) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
          return new Promise((resolve, reject) => {
            const graph = new n3.NamedNode(graphUri);
            const store = new n3.Store();
            new n3.Parser({}).parse(input, (error, quad2, done) => {
              if (quad2) {
                store.add(new n3.Quad(quad2.subject, quad2.predicate, quad2.object, graph));
                if (parseOptions === null || parseOptions === void 0 ? void 0 : parseOptions.onQuad) {
                  parseOptions.onQuad(quad2);
                }
              } else if (error) {
                reject(error);
              } else if (done) {
                if (parseOptions === null || parseOptions === void 0 ? void 0 : parseOptions.reasoner) {
                  const g = graphUri + "#inference";
                  parseOptions.reasoner.expand(store, graphUri, g);
                }
                resolve(store);
              }
            });
          });
        });
      }
    };
    exports.StoreFactory = StoreFactory2;
  }
});

// node_modules/@faubulous/mentor-rdf/dist/rdf/vocabulary-generator.js
var require_vocabulary_generator = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/rdf/vocabulary-generator.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.VocabularyGenerator = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var fs = tslib_1.__importStar(require("fs"));
    var n3 = tslib_1.__importStar((init_src(), __toCommonJS(src_exports)));
    var path_1 = require("path");
    var ontologies_1 = require_ontologies();
    var VocabularyGenerator = class {
      constructor() {
        this._supportedExtensions = /* @__PURE__ */ new Set([
          ".ttl",
          ".trig",
          ".n3",
          ".nt",
          ".nq"
        ]);
        this._descriptionPredicates = /* @__PURE__ */ new Set([
          ontologies_1.RDFS.comment,
          ontologies_1.SKOS.definition
        ]);
      }
      /**
       * Get the subject of a quad as a named node.
       * @param quad A quad.
       * @returns A named node if the given quad describes a subject, otherwise undefined.
       */
      _getNamedSubject(quad2) {
        if (quad2.subject.termType == "NamedNode") {
          return quad2.subject.value;
        } else {
          return void 0;
        }
      }
      /**
       * Get the description of a subject from a quad, if any.
       * @param quad A quad.
       * @returns A literal if the given quad describes a subject, otherwise undefined.
       */
      _getDescription(quad2) {
        if (this._descriptionPredicates.has(quad2.predicate.value)) {
          return quad2.object;
        }
      }
      /**
       * Parse the label of a URI.
       * @param subject A URI.
       * @returns The label of the URI.
       */
      _getLabel(subject) {
        let n = subject.lastIndexOf("#");
        if (n > 0) {
          return subject.slice(n + 1);
        }
        n = subject.lastIndexOf("/");
        if (n > 0) {
          return subject.slice(n + 1);
        } else {
          return void 0;
        }
      }
      /**
       * Write a vocabulary to a TypeScript file given a function for serializing the URI of a subject.
       * @param stream A writable stream to the target file.
       * @param prefix Namespace prefix of the vocabulary.
       * @param subjects URIs of the subjects to serialize.
       * @param value A function that serializes a URI.
       */
      _writeVocabulary(stream, prefix2, subjects, value) {
        stream.write(`export const ${prefix2} = {`);
        for (var s of Object.keys(subjects).filter((s2) => s2).sort()) {
          var definitions = subjects[s];
          var comment = definitions.find((l) => l.language == "en");
          if (!comment) {
            comment = definitions.find((l) => !l.language);
          }
          var label = this._getLabel(s);
          if (!label) {
            continue;
          }
          if (comment) {
            stream.write(`
	/** ${comment.value} */`);
          }
          stream.write(`
	'${label}': ${value(s)},`);
        }
        stream.write(`
}`);
      }
      /**
       * Serialize a vocabulary to a TypeScript file.
       * @param stream A writable stream to the target file.
       * @param prefix Namespace prefix of the vocabulary.
       * @param subjects URIs of the subjects to serialize.
       */
      _serialize(stream, prefix2, subjects) {
        stream.write(`import * as n3 from "n3";

`);
        this._writeVocabulary(stream, prefix2.toUpperCase(), subjects, (s) => `'${s}'`);
        stream.write(`

`);
        this._writeVocabulary(stream, prefix2.toLowerCase(), subjects, (s) => `new n3.NamedNode('${s}')`);
        stream.on("end", () => {
          stream.end();
        });
      }
      /**
       * Create an index.ts file for the given modules.
       * @param path Directory of the index.ts file.
       * @param modules Array of modules to export.
       */
      _serializeIndex(path2, modules) {
        const stream = fs.createWriteStream((0, path_1.join)(path2, "index.ts"));
        for (let m of modules.map((x) => (0, path_1.basename)(x))) {
          stream.write(`export * from './${(0, path_1.parse)(m).name}';
`);
        }
        stream.on("end", () => {
          stream.end();
        });
      }
      /**
       * Parse a single RDF file and generate a TypeScript vocabulary file.
       * @param path Path of the RDF file to parse.
       * @returns Path of the generated TypeScript file.
       */
      parseFile(path2) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
          return new Promise((resolve, reject) => {
            const directory = (0, path_1.dirname)(path2);
            const prefix2 = (0, path_1.parse)(path2).name;
            const result = (0, path_1.join)(directory, prefix2 + ".ts");
            const inputStream = fs.createReadStream(path2);
            const outputStream = fs.createWriteStream(result);
            const subjects = {};
            new n3.Parser().parse(inputStream, (error, quad2, done) => {
              if (quad2) {
                const s = this._getNamedSubject(quad2);
                if (s) {
                  if (!subjects[s]) {
                    subjects[s] = [];
                  }
                  const o = this._getDescription(quad2);
                  if (o) {
                    subjects[s].push(o);
                  }
                }
              } else if (error) {
                reject(error);
              } else if (done) {
                this._serialize(outputStream, prefix2, subjects);
                resolve(result);
              }
            });
          });
        });
      }
      /**
       * Generate TypeScript vocabulary files for all RDF files in the given directory.
       * @param path Path of the directory to parse.
       * @param createIndex Indicate if an index.ts file should be created.
       * @returns An array of paths to the generated files.
       */
      parseDirectory(path2, createIndex = false) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
          const result = [];
          for (let file of fs.readdirSync(path2)) {
            const ext = (0, path_1.extname)(file);
            if (this._supportedExtensions.has(ext)) {
              const f = yield this.parseFile((0, path_1.join)(path2, file));
              result.push(f);
            }
          }
          ;
          if (createIndex) {
            this._serializeIndex(path2, result);
          }
          return result;
        });
      }
    };
    exports.VocabularyGenerator = VocabularyGenerator;
  }
});

// node_modules/@faubulous/mentor-rdf/dist/rdf/index.js
var require_rdf2 = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/rdf/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_resource_repository(), exports);
    tslib_1.__exportStar(require_class_repository(), exports);
    tslib_1.__exportStar(require_property_repository(), exports);
    tslib_1.__exportStar(require_individual_repository(), exports);
    tslib_1.__exportStar(require_owl_reasoner(), exports);
    tslib_1.__exportStar(require_rdfs_reasoner(), exports);
    tslib_1.__exportStar(require_store_factory(), exports);
    tslib_1.__exportStar(require_vocabulary_generator(), exports);
  }
});

// node_modules/@faubulous/mentor-rdf/dist/index.js
var require_dist = __commonJS({
  "node_modules/@faubulous/mentor-rdf/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    tslib_1.__exportStar(require_ontologies(), exports);
    tslib_1.__exportStar(require_rdf2(), exports);
  }
});

// src/extension/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(extension_exports);
var import_vscode3 = require("vscode");

// src/extension/panels/SettingsPanel.ts
var import_vscode2 = require("vscode");

// src/extension/utilities.ts
var import_vscode = require("vscode");
function getUri(webview, extensionUri, pathList) {
  return webview.asWebviewUri(import_vscode.Uri.joinPath(extensionUri, ...pathList));
}
function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
function getNamespaceUri(uri) {
  if (!uri) {
    return uri;
  }
  let u = uri;
  let n = u.indexOf("?");
  if (n > -1) {
    u = uri.substring(0, n);
  }
  n = u.indexOf("#");
  if (n > -1) {
    return u.substring(0, n + 1);
  }
  n = u.lastIndexOf("/");
  if (n > 8) {
    return u.substring(0, n + 1);
  } else {
    return u + "/";
  }
}
function toJsonId(uri) {
  if (!uri) {
    return uri;
  }
  let u = uri.split("//")[1];
  u = u.replace(/[^a-zA-Z0-9]/g, ".");
  return u.endsWith(".") ? u.slice(0, -1) : u;
}

// src/extension/panels/SettingsPanel.ts
var SettingsPanel = class {
  /**
   * The ComponentGalleryPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  constructor(panel, extensionUri) {
    this._disposables = [];
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
  }
  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension.
   */
  static render(extensionUri) {
    if (SettingsPanel.currentPanel) {
      SettingsPanel.currentPanel._panel.reveal(import_vscode2.ViewColumn.One);
    } else {
      const panel = import_vscode2.window.createWebviewPanel(
        // Panel view type
        "mentor.view.settings",
        // Panel title
        "Mentor Settings",
        // The editor column the panel should be displayed in
        import_vscode2.ViewColumn.One,
        // Extra panel configurations
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          // Restrict the webview to only load resources from the `out` directory
          localResourceRoots: [import_vscode2.Uri.joinPath(extensionUri, "out", "extension")]
        }
      );
      SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri);
    }
  }
  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  dispose() {
    SettingsPanel.currentPanel = void 0;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where *references* to CSS and JavaScript files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  _getWebviewContent(webview, extensionUri) {
    const webviewUri = getUri(webview, extensionUri, ["out", "extension", "webview.js"]);
    const styleUri = getUri(webview, extensionUri, ["out", "extension", "style.css"]);
    const codiconUri = getUri(webview, extensionUri, ["out", "extension", "codicon.css"]);
    const nonce = getNonce();
    return (
      /*html*/
      `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" href="${styleUri}">
          <link rel="stylesheet" href="${codiconUri}">
          <title>Mentor Settings 2</title>
        </head>
        <body>
          <section class="component-container">
            <h2>Namespaces</h2>
            <section class="component-example">
              <vscode-data-grid class="basic-grid" generate-header="sticky" grid-template-columns="100px 1fr 2fr" aria-label="With Sticky Header"></vscode-data-grid>
            </section>
          </section>
          <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
        </body>
      </html>
    `
    );
  }
};

// src/extension/panels/SettingsViewProvider.ts
var SettingsViewProvider = class {
  constructor(_extensionUri) {
    this._extensionUri = _extensionUri;
  }
  resolveWebviewView(webviewView, context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }
  _getHtmlForWebview(webview) {
    const webviewUri = getUri(webview, this._extensionUri, ["out", "extension", "webview.js"]);
    const styleUri = getUri(webview, this._extensionUri, ["out", "extension", "style.css"]);
    const codiconUri = getUri(webview, this._extensionUri, ["out", "extension", "codicon.css"]);
    const nonce = getNonce();
    return (
      /*html*/
      `
		  <!DOCTYPE html>
		  <html lang="en">
			<head>
			  <meta charset="UTF-8">
			  <meta name="viewport" content="width=device-width, initial-scale=1.0">
			  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
			  <link rel="stylesheet" href="${styleUri}">
			  <link rel="stylesheet" href="${codiconUri}">
			  <title>Mentor Settings</title>
			</head>
			<body>
			  <vscode-text-field placeholder="Find"></vscode-text-field>
			  <vscode-panels aria-label="With Badge">
				<vscode-panel-tab id="tab-1">
				  Classes
				  <vscode-badge>1</vscode-badge>
				</vscode-panel-tab>
				<vscode-panel-tab id="tab-2">
				  Properties
				  <vscode-badge>1</vscode-badge>
				</vscode-panel-tab>
				<vscode-panel-tab id="tab-3">
				  Individuals
				</vscode-panel-tab>
				<vscode-panel-view id="view-1"></vscode-panel-view>
				<vscode-panel-view id="view-2"></vscode-panel-view>
				<vscode-panel-view id="view-3"></vscode-panel-view>
			  </vscode-panels>
			  <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
			</body>
		  </html>
		`
    );
  }
};
SettingsViewProvider.viewType = "mentor.view.settings";

// src/extension/class-node-provider.ts
var import_mentor_rdf3 = __toESM(require_dist());

// src/extension/class-node.ts
var vscode2 = __toESM(require("vscode"));

// src/extension/resource-node.ts
var vscode = __toESM(require("vscode"));
init_src();
var import_mentor_rdf = __toESM(require_dist());
var ResourceNode = class extends vscode.TreeItem {
  constructor(repository, uri) {
    super("");
    this.repository = repository;
    this.uri = uri;
    this.contextValue = "resource";
    this.iconPath = this.getIcon();
    this.label = this.getLabel();
    this.tooltip = this.getTooltip();
    this.command = {
      command: "mentor.command.selectResource",
      title: "",
      arguments: [uri]
    };
  }
  getLabel() {
    let label;
    const n = this.uri.lastIndexOf("#");
    if (n > -1) {
      label = this.uri.substring(n + 1);
    } else {
      label = this.uri.substring(this.uri.lastIndexOf("/") + 1);
    }
    return {
      label,
      highlights: this.uri.length > 1 ? [[this.uri.length - 2, this.uri.length - 1]] : void 0
    };
  }
  getTooltip() {
    let result = "";
    if (this.repository) {
      const s = N3DataFactory_default.namedNode(this.uri);
      for (let d of this.repository.store.match(s, import_mentor_rdf.skos.definition, null, null)) {
        result += d.object.value;
        break;
      }
      if (!result) {
        for (let d of this.repository.store.match(s, import_mentor_rdf.rdfs.comment, null, null)) {
          result += d.object.value;
          break;
        }
      }
    }
    if (result) {
      result += "\n\n";
    }
    result += this.uri;
    return new vscode.MarkdownString(result, true);
  }
  getColor() {
    const id = toJsonId(getNamespaceUri(this.uri));
    return new vscode.ThemeColor("mentor.color." + id);
  }
  getIcon() {
    return new vscode.ThemeIcon("primitive-square", this.getColor());
  }
};

// src/extension/class-node.ts
var ClassNode = class extends ResourceNode {
  constructor(repository, uri) {
    super(repository, uri);
    this.repository = repository;
    this.uri = uri;
    this.contextValue = "class";
    this.collapsibleState = this.repository.hasSubClasses(uri) ? vscode2.TreeItemCollapsibleState.Collapsed : vscode2.TreeItemCollapsibleState.None;
    this.command = {
      command: "mentor.command.selectClass",
      title: "",
      arguments: [uri]
    };
  }
  getIcon() {
    let icon = "rdf-class";
    if (this.repository.hasEquivalentClass(this.uri)) {
      icon += "-eq";
    } else if (!this.repository.hasSubject(this.uri)) {
      icon += "-ref";
    }
    return new vscode2.ThemeIcon(icon, this.getColor());
  }
};

// src/extension/resource-node-provider.ts
var vscode4 = __toESM(require("vscode"));

// src/extension/mentor.ts
var vscode3 = __toESM(require("vscode"));
var path = __toESM(require("path"));
init_src();
var import_mentor_rdf2 = __toESM(require_dist());
var VocabularyContext = class {
  constructor(document, store) {
    /**
     * All namespaces defined in the document.
     */
    this.namespaces = {};
    /**
     * Maps resource URIs to indexed tokens.
     */
    this.tokens = {};
    this.document = document;
    this.store = store;
    this._parseTokens(document);
  }
  _parseTokens(document) {
    const text = document.getText();
    const tokens = new N3Lexer().tokenize(text);
    tokens.forEach((t, i) => {
      if (!t.value) {
        return;
      }
      let v = t.value;
      switch (t.type) {
        case "prefix": {
          let u = tokens[i + 1].value;
          if (u) {
            this.namespaces[v] = u;
          }
          break;
        }
        case "prefixed": {
          if (t.prefix) {
            v = this.namespaces[t.prefix] + t.value;
            if (!this.tokens[v]) {
              this.tokens[v] = [];
            }
            this.tokens[v].push(t);
          }
          break;
        }
        case "IRI": {
          if (!this.tokens[v]) {
            this.tokens[v] = [];
          }
          this.tokens[v].push(t);
          break;
        }
      }
    });
  }
};
var MentorExtension = class {
  constructor() {
    /**
     * Maps document URIs to loaded document contexts.
     */
    this.contexts = {};
    this._onDidChangeDocumentContext = new vscode3.EventEmitter();
    this.onDidChangeVocabularyContext = this._onDidChangeDocumentContext.event;
    vscode3.workspace.onDidChangeTextDocument((e) => this.onTextDocumentChanged(e));
    vscode3.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
    this.onActiveEditorChanged();
  }
  onActiveEditorChanged() {
    if (!vscode3.window.activeTextEditor) {
      return;
    }
    const editor = vscode3.window.activeTextEditor;
    if (editor.document == this.activeContext?.document) {
      return;
    }
    if (!this._canLoadDocument(editor.document.uri)) {
      return;
    }
    this._loadDocument(editor.document).then((context) => {
      if (context) {
        this.activeContext = context;
        this._onDidChangeDocumentContext?.fire(context);
      }
    });
  }
  onTextDocumentChanged(e) {
    if (!this._canLoadDocument(e.document.uri)) {
      return;
    }
    this._loadDocument(e.document, true).then((context) => {
      if (context) {
        this._onDidChangeDocumentContext?.fire(context);
      }
    });
  }
  /**
   * Indicates whether a document with the given URI can be loaded.
   * @param uri A document URI.
   * @returns <c>true</c> if the document can be loaded, <c>false</c> otherwise.
   */
  _canLoadDocument(uri) {
    if (!uri || uri.scheme !== "file") {
      return false;
    }
    const ext = path.extname(uri.fsPath);
    return ext === ".ttl" || ext === ".nt";
  }
  async _loadDocument(document, reload = false) {
    if (!document) {
      return;
    }
    const uri = document.uri.toString();
    let context = this.contexts[uri];
    if (context && !reload) {
      return context;
    }
    const store = await import_mentor_rdf2.StoreFactory.createFromStream(document.getText(), uri);
    new import_mentor_rdf2.OwlReasoner().expand(store, uri, uri + "#inference");
    context = new VocabularyContext(document, store);
    this.contexts[uri] = context;
    this.activeContext = context;
    return context;
  }
};
var mentor = new MentorExtension();

// src/extension/resource-node-provider.ts
var ResourceNodeProvider = class {
  constructor() {
    this.nodes = {};
    this.showReferenced = false;
    this.autoRefresh = true;
    this._onDidChangeTreeData = new vscode4.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    mentor.onDidChangeVocabularyContext((context) => this._onVocabularyChanged(context));
    if (mentor.activeContext) {
      this._onVocabularyChanged(mentor.activeContext);
    }
  }
  _onVocabularyChanged(e) {
    if (e) {
      this.context = e;
      this.repository = this.getRepository(e);
      this.refresh();
    }
  }
  toggleReferenced() {
    this.showReferenced = !this.showReferenced;
  }
  refresh() {
    this._onDidChangeTreeData.fire(void 0);
  }
  select(uri) {
    if (this.context && this.context.tokens[uri]) {
      const context = this.context;
      this.activateDocument().then((editor) => {
        const token = context.tokens[uri].sort((a, b) => a.start - b.start)[0];
        const text = token.type == "prefixed" ? `${token.prefix}:${token.value}` : `<${token.value}>`;
        const n = token.line - 1;
        const line = context.document.lineAt(n);
        const start = line.text.indexOf(text);
        const end = start + text.length;
        const range = new vscode4.Range(n, start, n, end);
        if (editor) {
          editor.selection = new vscode4.Selection(range.start, range.end);
          editor.revealRange(range, vscode4.TextEditorRevealType.InCenter);
        }
      });
    }
  }
  async activateDocument() {
    const activeTextEditor = vscode4.window.activeTextEditor;
    if (activeTextEditor?.document != this.context?.document) {
      await vscode4.commands.executeCommand("vscode.open", this.context?.document.uri);
    }
    return activeTextEditor;
  }
  getNode(uri) {
    if (!this.nodes[uri]) {
      this.nodes[uri] = uri;
    }
    return this.nodes[uri];
  }
};

// src/extension/class-node-provider.ts
var ClassNodeProvider = class extends ResourceNodeProvider {
  getRepository(context) {
    return new import_mentor_rdf3.ClassRepository(context.store);
  }
  getParent(uri) {
    return void 0;
  }
  getChildren(uri) {
    if (!this.repository) {
      return [];
    }
    let result = this.repository.getSubClasses(uri).sort().map((u) => this.getNode(u));
    if (!this.showReferenced) {
      result = result.filter((u) => this.repository?.hasSubject(u) || this.repository?.hasSubClasses(u));
    }
    return result;
  }
  getTreeItem(uri) {
    if (!this.repository) {
      throw new Error("Invalid repostory.");
    }
    return new ClassNode(this.repository, uri);
  }
};

// src/extension/property-node-provider.ts
var import_mentor_rdf5 = __toESM(require_dist());

// src/extension/property-node.ts
var vscode5 = __toESM(require("vscode"));
var import_mentor_rdf4 = __toESM(require_dist());
var PropertyNode = class extends ResourceNode {
  constructor(repository, uri) {
    super(repository, uri);
    this.repository = repository;
    this.uri = uri;
    this.contextValue = "property";
    this.collapsibleState = this.repository.hasSubProperties(uri) ? vscode5.TreeItemCollapsibleState.Collapsed : vscode5.TreeItemCollapsibleState.None;
    this.command = {
      command: "mentor.command.selectProperty",
      title: "",
      arguments: [uri]
    };
  }
  getIcon() {
    let icon = "arrow-right";
    const range = this.repository.getRange(this.uri);
    switch (range) {
      case import_mentor_rdf4.xsd.date.id:
      case import_mentor_rdf4.xsd.dateTime.id: {
        icon = "calendar";
        break;
      }
      case import_mentor_rdf4.xsd.byte.id:
      case import_mentor_rdf4.xsd.decimal.id:
      case import_mentor_rdf4.xsd.double.id:
      case import_mentor_rdf4.xsd.float.id:
      case import_mentor_rdf4.xsd.int.id:
      case import_mentor_rdf4.xsd.integer.id:
      case import_mentor_rdf4.xsd.short.id:
      case import_mentor_rdf4.xsd.unsignedInt.id:
      case import_mentor_rdf4.xsd.unsignedShort.id:
      case import_mentor_rdf4.xsd.unsingedLong.id:
      case import_mentor_rdf4.xsd.usignedByte.id: {
        icon = "symbol-number";
        break;
      }
      case import_mentor_rdf4.xsd.boolean.id: {
        icon = "symbol-boolean";
        break;
      }
      case import_mentor_rdf4.xsd.string.id: {
        icon = "symbol-text";
        break;
      }
      case import_mentor_rdf4.xsd.base64Binary.id: {
        icon = "file-binary";
        break;
      }
    }
    return new vscode5.ThemeIcon(icon, this.getColor());
  }
};

// src/extension/property-node-provider.ts
var PropertyNodeProvider = class extends ResourceNodeProvider {
  getRepository(context) {
    return new import_mentor_rdf5.PropertyRepository(context.store);
  }
  getParent(uri) {
    return void 0;
  }
  getChildren(uri) {
    if (!this.repository) {
      return [];
    }
    let result = this.repository.getSubProperties(uri).sort().map((u) => this.getNode(u));
    if (!this.showReferenced) {
      result = result.filter((u) => this.repository?.hasSubject(u));
    }
    return result;
  }
  getTreeItem(uri) {
    if (!this.repository) {
      throw new Error("Invalid repostory.");
    }
    return new PropertyNode(this.repository, uri);
  }
};

// src/extension/individual-node-provider.ts
var import_mentor_rdf6 = __toESM(require_dist());

// src/extension/individual-node.ts
var vscode6 = __toESM(require("vscode"));
var IndividualNode = class extends ResourceNode {
  constructor(repository, uri) {
    super(repository, uri);
    this.repository = repository;
    this.uri = uri;
    this.contextValue = "individual";
    this.collapsibleState = vscode6.TreeItemCollapsibleState.None;
    this.command = {
      command: "mentor.command.selectIndividual",
      title: "",
      arguments: [uri]
    };
  }
  getIcon() {
    return new vscode6.ThemeIcon("rdf-individual", this.getColor());
  }
};

// src/extension/individual-node-provider.ts
var IndividualNodeProvider = class extends ResourceNodeProvider {
  getRepository(context) {
    return new import_mentor_rdf6.IndividualRepository(context.store);
  }
  getParent(uri) {
    return void 0;
  }
  getChildren(uri) {
    if (!this.repository) {
      return [];
    }
    let result = this.repository.getIndividuals().sort().map((u) => this.getNode(u));
    if (!this.showReferenced) {
      result = result.filter((u) => this.repository?.hasSubject(u));
    }
    return result;
  }
  getTreeItem(uri) {
    if (!this.repository) {
      throw new Error("Invalid repostory.");
    }
    return new IndividualNode(this.repository, uri);
  }
};

// src/extension/extension.ts
async function activate(context) {
  import_vscode3.commands.registerCommand("mentor.command.browseResource", (uri) => import_vscode3.commands.executeCommand("open", import_vscode3.Uri.parse(uri)));
  import_vscode3.commands.registerCommand("mentor.command.openExternal", (uri) => import_vscode3.env.openExternal(import_vscode3.Uri.parse(uri)));
  import_vscode3.commands.registerCommand("mentor.command.setNamespaceColor", (uri) => {
    import_vscode3.commands.executeCommand("editor.action.showOrFocusStandaloneColorPicker").then((value) => {
      console.debug(value);
    });
  });
  const classProvider = new ClassNodeProvider();
  import_vscode3.window.registerTreeDataProvider("mentor.classExplorer", classProvider);
  import_vscode3.commands.registerCommand("mentor.command.selectClass", (uri) => classProvider.select(uri));
  import_vscode3.commands.registerCommand("mentor.classExplorer.command.addEntry", () => import_vscode3.window.showInformationMessage(`Successfully called add entry.`));
  import_vscode3.commands.registerCommand("mentor.classExplorer.command.editEntry", (node) => import_vscode3.window.showInformationMessage(`Successfully called edit entry on ${node}.`));
  import_vscode3.commands.registerCommand("mentor.classExplorer.command.deleteEntry", (node) => import_vscode3.window.showInformationMessage(`Successfully called delete entry on ${node}.`));
  import_vscode3.commands.registerCommand("mentor.classExplorer.command.refreshEntry", () => classProvider.refresh());
  import_vscode3.commands.registerCommand("mentor.classExplorer.command.toggleReferenced", () => {
    classProvider.toggleReferenced();
    classProvider.refresh();
  });
  const propertyProvider = new PropertyNodeProvider();
  import_vscode3.window.registerTreeDataProvider("mentor.propertyExplorer", propertyProvider);
  import_vscode3.commands.registerCommand("mentor.command.selectProperty", (uri) => propertyProvider.select(uri));
  import_vscode3.commands.registerCommand("mentor.propertyExplorer.command.addEntry", () => import_vscode3.window.showInformationMessage(`Successfully called add entry.`));
  import_vscode3.commands.registerCommand("mentor.propertyExplorer.command.editEntry", (node) => import_vscode3.window.showInformationMessage(`Successfully called edit entry on ${node}.`));
  import_vscode3.commands.registerCommand("mentor.propertyExplorer.command.deleteEntry", (node) => import_vscode3.window.showInformationMessage(`Successfully called delete entry on ${node}.`));
  import_vscode3.commands.registerCommand("mentor.propertyExplorer.command.refreshEntry", () => classProvider.refresh());
  import_vscode3.commands.registerCommand("mentor.propertyExplorer.command.toggleReferenced", () => {
    propertyProvider.toggleReferenced();
    propertyProvider.refresh();
  });
  const individualProvider = new IndividualNodeProvider();
  import_vscode3.window.registerTreeDataProvider("mentor.individualExplorer", individualProvider);
  import_vscode3.commands.registerCommand("mentor.command.selectIndividual", (uri) => individualProvider.select(uri));
  import_vscode3.commands.registerCommand("mentor.individualExplorer.command.addEntry", () => import_vscode3.window.showInformationMessage(`Successfully called add entry.`));
  import_vscode3.commands.registerCommand("mentor.individualExplorer.command.editEntry", (node) => import_vscode3.window.showInformationMessage(`Successfully called edit entry on ${node}.`));
  import_vscode3.commands.registerCommand("mentor.individualExplorer.command.deleteEntry", (node) => import_vscode3.window.showInformationMessage(`Successfully called delete entry on ${node}.`));
  import_vscode3.commands.registerCommand("mentor.individualExplorer.command.refreshEntry", () => classProvider.refresh());
  import_vscode3.commands.registerCommand("mentor.individualExplorer.command.toggleReferenced", () => {
    individualProvider.toggleReferenced();
    individualProvider.refresh();
  });
  const command = () => {
    SettingsPanel.render(context.extensionUri);
  };
  const showGalleryCommand = import_vscode3.commands.registerCommand("mentor.command.openSettings", command);
  context.subscriptions.push(showGalleryCommand);
  const settingsViewProvider = new SettingsViewProvider(context.extensionUri);
  const settingsDisposable = import_vscode3.window.registerWebviewViewProvider(SettingsViewProvider.viewType, settingsViewProvider);
  context.subscriptions.push(settingsDisposable);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate
});
/*! Bundled license information:

tslib/tslib.es6.js:
  (*! *****************************************************************************
  Copyright (c) Microsoft Corporation.
  
  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.
  
  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** *)

queue-microtask/index.js:
  (*! queue-microtask. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> *)
*/
//# sourceMappingURL=extension.js.map
