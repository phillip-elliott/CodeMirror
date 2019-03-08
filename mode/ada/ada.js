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

  var commonKeywords = [
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
  ]

  var commonWordOperators = ["and", "or", "xor", "not", "and then", "or else", "abs", "mod", "rem", "in", "not in"]
  
  var isPunctuationChar = /[\[\]{}\(\),;\:\.]/
  var isOperators = /^([-+*/&<>=])/
  var numberStart = /[\d\.]/
  var number = /^(?:0x[a-f\d]+|0b[01]+|(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)(u|ll?|l|f)?/i
  var identifiers = /^[A-Za-z][_A-Za-z0-9\u00A1-\uFFFF]*/
  var isChar = /('([^']|[']{2})')/

  var indentWords = wordRegexp(["package", "procedure", "function", "if", "for", "declare"])


  CodeMirror.registerHelper("hintWords", "ada", commonKeywords.concat(commonWordOperators));

  CodeMirror.defineMode("ada", function(config, parserConfig) {

    var keywords = wordRegexp(commonKeywords.concat(parserConfig.extraKeywords))
    var wordOperators = wordRegexp(commonWordOperators)
    var builtIns = wordRegexp(parserConfig.customBuiltins)
    var identifierCache = {}

    function tokenBase(stream, state) {
      if (stream.eatSpace()) return null;

      if(stream.match(keywords) || stream.match(wordOperators)) {
        return "keyword";
      }

      if(stream.match(builtIns)){
        return "builtin";
      }

      if(stream.match(identifiers)) {
        if (state.lastToken == "procedure" || state.lastToken == "body" || state.lastToken == "function" || state.lastToken == "type" || state.lastToken == "end") {
          identifierCache[stream.current()] = stream.current;
          return "def";
        }
      }

      if(stream.match(isChar)) {
        return "string";
      }

      var ch = stream.next();

      // comments start with --
      if (ch == "-" && stream.eat("-")) {
        stream.skipToEnd();
        return "comment";
      }

      if (ch == '"') {
        return tokenAtString(stream, ch);
      }

      if(numberStart.test(ch)) {
        stream.backUp(1);
        if (stream.match(number)) return "number"
        stream.next();
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
      var next;
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
          lastToken: null,
          lastWord: null,
          dedenting: true,
          indented: 0,
          context: {type: "top", indented: -config.indentUnit}
        }
      },
      token: function(stream, state) {
        if (stream.sol()) state.indented = stream.indentation();
        var style = state.tokenize(stream, state);
        var word = stream.current();
        var kwtype;

        if (style) {
          state.lastToken = style == "keyword" ? word : null;
        }

        if (word == "end") {
          kwtype = "dedent";
        } else if (style == "keyword" && indentWords.test(word)) {
          if(word == "if" && state.lastWord == "end"){
            kwtype = "";
          } else
            kwtype = "indent";
        } 
        
        if (kwtype == "indent") {
          state.context = {prev: state.context, type: style, indented: state.indented}
        } else if (kwtype == "dedent") {
          state.context = state.context.prev 
        }
        
        state.lastWord = style == "keyword" ? word : state.lastWord;

        return style;
      },
      indent: function(state, textAfter) {
        var ct = state.context;
        var closing = ct.type == "keyword" &&  (/^(?:end|else|elsif|begin|is|then)\b/.test(textAfter));
        var value = ct.indented + (closing ? 0 : config.indentUnit);
        return value;
      },
      lineComment: "--",
      fold: "indent",
      electricInput: /^\s*(?:end|else|elsif|begin|is|then)\b/
    }
  })

  CodeMirror.defineMIME("text/x-ada", "ada")
})