// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  function wordRegexp(words) {
    return new RegExp("^((" + words.join(")|(") + "))\\b");
  }

  const keywords = wordRegexp([
    "abort", "abstract", "accept",
    "access", "aliased", "all",
    "array", "at", "begin", "body",
    "case", "constant", "declare", "delay",
    "delta", "digits", "do", "else",
    "elsif", "end", "entry", "exception",
    "exit", "for", "function", "generic",
    "goto", "if", "interface", "is",
    "limited", "loop", "new",
    "null", "of", "others",
    "out", "overriding", "package", "pragma",
    "private", "procedure", "protected", "raise",
    "range", "record", "renames",
    "requeue", "return", "reverse", "select",
    "separate", "some", "subtype", "synchronized",
    "tagged", "task", "terminate", "then",
    "type", "until", "use", "when",
    "while", "with"
  ])

  const wordOperators = wordRegexp(["and", "or", "xor", "not", "and then", "or else", "abs", "mod", "rem", "in", "not in"])
  
  const isPunctuationChar = /[\[\]{}\(\),;\:\.]/
  const isOperators = /^([-+*/&<>=])/
  const numberStart = /[\d\.]/
  const number = /^(?:0x[a-f\d]+|0b[01]+|(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)(u|ll?|l|f)?/i
  const identifiers = /^[A-Za-z][_A-Za-z0-9\u00A1-\uFFFF]*/
  const isChar = /('([^']|[']{2})')/


  CodeMirror.registerHelper("hintWords", "ada", keywords);

  CodeMirror.defineMode("ada", function(config, parserConfig) {
    function tokenBase(stream, state) {
      if (stream.eatSpace()) return null;

      if(stream.match(keywords) || stream.match(wordOperators)) {
        return "keyword";
      }

      if(stream.match(identifiers)) {
        if (state.lastToken == "procedure" || state.lastToken == "body" || state.lastToken == "function" || state.lastToken == "type" || state.lastToken == "end")
          return "def"
      }

      if(stream.match(isChar)) {
        return "string"
      }

      let ch = stream.next();

      // comments start with --
      if (ch == "-" && stream.eat("-")) {
        stream.skipToEnd();
        return "comment";
      }

      if (ch == '"') {
        return tokenAtString(stream, ch)
      }

      if(numberStart.test(ch)) {
        stream.backUp(1)
        if (stream.match(number)) return "number"
        stream.next()
      }
      
      if (isPunctuationChar.test(ch)) {
        return null;
      }

      if (isOperators.test(ch)) {
        if (ch == "/" || ch == ">" || ch == "<" ) {
          stream.eat("=")
        }
        if (ch == "*") {
          stream.eat("*")
        }
        return "operator"
      }
    }

    function tokenAtString(stream, check) {
      let next;
      while ((next = stream.next()) != null) {
        if (next == check && !stream.eat(check)) {
          break;
        }
      }
      return "string";
    }

    return {
      startState: function () {
        return {
          tokenize: tokenBase,
          lastToken: null
        }
      },
      token: function(stream, state) {
        if (stream.sol()) stream.indentation();
        let style = state.tokenize(stream, state);
        if (style) {
          state.lastToken = style == "keyword" ? stream.current() : null
        }
        return style
      },
      indent: null,
      lineComment: "--",
      fold: "indent",
      electricInput: null
    }
  })

  CodeMirror.defineMIME("text/x-ada", "ada")
})