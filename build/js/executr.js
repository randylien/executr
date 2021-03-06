// Generated by CoffeeScript 1.3.3
(function() {
  var Editor, converters, getCodeElement, insertOutput, normalizeType, runners;

  runners = {
    'javascript': function(opts, code) {
      return eval(code);
    }
  };

  converters = {
    'coffeescript:javascript': function(opts, code) {
      var csOptions;
      csOptions = $.extend({}, opts.coffeeOptions, {
        bare: true
      });
      return CoffeeScript.compile(code, csOptions);
    },
    'javascript:coffeescript': function(opts, code) {
      var out;
      if (Js2coffee) {
        return out = Js2coffee.build(code);
      } else {
        console.error("Can't convert javascript to coffeescript");
        return code;
      }
    }
  };

  normalizeType = function(codeType) {
    switch (codeType.toLowerCase()) {
      case 'js':
      case 'javascript':
      case 'text/javascript':
      case 'application/javascript':
        return 'javascript';
      case 'cs':
      case 'coffee':
      case 'coffeescript':
      case 'text/coffeescript':
      case 'application/coffeescript':
        return 'coffeescript';
      default:
        return console.log("Code type " + codeType + " not understood.");
    }
  };

  Editor = (function() {

    function Editor(args) {
      this.el = args.el;
      this.opts = args.opts;
      this.codeCache = {};
      this.$el = $(this.el);
      this.buildEditor();
      this.addRunButton();
      this.addListeners();
    }

    Editor.prototype.getValue = function() {
      return this.editor.getValue();
    };

    Editor.prototype.addListeners = function() {
      var _this = this;
      return this.$el.on('executrSwitchType', function(e, type) {
        return _this.switchType(type);
      });
    };

    Editor.prototype.addRunButton = function() {
      var _this = this;
      this.$runButton = $('<button>');
      this.$runButton.addClass('executr-run-button');
      this.$runButton.text(this.opts.buttonText);
      this.$editorCont.append(this.$runButton);
      this.$runButton.css({
        top: "" + (this.$editorCont.height() / 2 - this.$runButton.height() / 2) + "px"
      });
      if (this.$editorCont.height() < parseInt(this.$runButton.css('font-size'), 10) + 4) {
        this.$runButton.css('font-size', "" + (this.$editorCont.height() - 4) + "px");
      }
      return this.$runButton.click(function() {
        return _this.execute();
      });
    };

    Editor.prototype.buildEditor = function() {
      var code, codeType, mirrorOpts, _ref,
        _this = this;
      this.$editorCont = $('<div>');
      this.$editorCont.addClass('executr-code-editor');
      this.$editorCont.css({
        height: "" + (this.$el.height() + 10) + "px",
        width: "" + (this.$el.width()) + "px"
      });
      this.$editorCont.insertBefore(this.$el);
      this.$el.detach();
      codeType = normalizeType((_ref = this.$el.attr('data-type')) != null ? _ref : this.opts.defaultType);
      code = this.$el.text();
      mirrorOpts = {
        value: code,
        mode: codeType
      };
      this.codeCache[codeType] = code;
      this.editor = CodeMirror(this.$editorCont[0], $.extend(mirrorOpts, this.opts.codeMirrorOptions));
      return this.editor.on('change', function(doc, changeObj) {
        if ((changeObj != null ? changeObj.origin : void 0) && !(changeObj.origin instanceof Object)) {
          return _this.codeCache = [];
        }
      });
    };

    Editor.prototype.getType = function() {
      return this.editor.getMode().name;
    };

    Editor.prototype.switchType = function(type) {
      var code, converter, currentType, scrollInfo;
      type = normalizeType(type);
      currentType = this.getType();
      if (type === currentType) {
        return;
      }
      if (this.codeCache[type]) {
        code = this.codeCache[type];
      } else {
        converter = converters["" + currentType + ":" + type];
        if (converter == null) {
          console.error("Can't convert " + currentType + " to " + type);
          return;
        }
        code = converter(this.opts, this.editor.getValue());
        this.codeCache[type] = code;
      }
      this.editor.setOption('mode', type);
      this.editor.setValue(code);
      this.editor.refresh();
      scrollInfo = this.editor.getScrollInfo();
      return this.$editorCont.css({
        height: "" + scrollInfo.height + "px"
      });
    };

    Editor.prototype.run = function(type, opts, code) {
      var from, func, key, runner, to, _ref;
      runner = runners[type];
      if (runner == null) {
        for (key in converters) {
          func = converters[key];
          _ref = key.split(':'), from = _ref[0], to = _ref[1];
          if (type === from && runners[to]) {
            runner = runners[to];
            code = func(opts, code);
          }
        }
      }
      if (!(runner != null)) {
        console.error("Couldn't find a way to run " + type + " block");
        return;
      }
      return runner(opts, code);
    };

    Editor.prototype.execute = function() {
      var code, codeType, output;
      code = this.getValue();
      codeType = this.getType();
      this.$el.trigger('executrBeforeExecute', [code, codeType, this.opts]);
      if (this.opts.setUp != null) {
        this.opts.setUp(codeType, this.opts);
      }
      output = this.run(codeType, this.opts, code);
      if (this.opts.tearDown != null) {
        this.opts.tearDown(output, codeType, this.opts);
      }
      this.$el.trigger('executrAfterExecute', [output, code, codeType, this.opts]);
      return insertOutput(this.opts, output);
    };

    return Editor;

  })();

  getCodeElement = function(e, opts) {
    var $code, $target;
    $target = $(e.target);
    $code = $target.parents(opts.codeSelector);
    if (!$code.length && $target.is(opts.codeSelector)) {
      $code = $target;
    }
    return $code;
  };

  insertOutput = function(opts, output) {
    if (opts.outputTo) {
      if (opts.appendOutput) {
        return $(opts.outputTo).append($('<div>').text(output));
      } else {
        return $(opts.outputTo).text(output);
      }
    }
  };

  $.fn.executr = function(opts) {
    var codeSelectors, defaults;
    defaults = {
      codeSelector: 'code[executable]',
      outputTo: false,
      appendOutput: true,
      defaultType: 'coffee',
      buttonText: "RUN"
    };
    opts = $.extend({}, defaults, opts);
    if (this.is(opts.codeSelector)) {
      opts.codeSelector = null;
    }
    codeSelectors = this.find(opts.codeSelector);
    codeSelectors.each(function(i, el) {
      return new Editor({
        el: el,
        opts: opts
      });
    });
    return $('.executr-switch').click(function() {
      var $this, codeType;
      $this = $(this);
      codeType = $this.attr('data-code-type');
      return codeSelectors.trigger('executrSwitchType', codeType);
    });
  };

}).call(this);
