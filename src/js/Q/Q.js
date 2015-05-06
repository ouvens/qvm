/*====================================================
 * 静态变量定义 
 *=====================================================*/
var $ = require('./jquery'),

    MARK = /\{\{(.+?)\}\}/,
    defer = window.requestAnimationFrame || window.webkitRequestAnimationFrame || setTimeout,
    isDebug = true,
    prototype = Object.prototype;
/*====================================================
 * 静态方法定义 
 *=====================================================*/
var noop = noop || function(){};

// 对对象的每个item进行处理
var objectEach = function (object, fn , scope  ) {
    for (var key in object)
        fn.call( scope, key, obj[key] );
};

// 对数组的每个item进行处理
var arrayEach = Array.prototype.forEach ? function (array, fn ,scope) {
    return array.forEach( fn ,scope )
} : function (array, fn , scope) {
    for (var i = 0 , len = array && array.length || 0; i < len; i++)
        fn.call( scope , array[i], i);
};

var getType = function(object){
    return prototype.toString.call(object).replace(/\[.+?\s|\]/g,'').toLowerCase() ;
}

// log信息
var log = function() {
    if (window.console && window.console.log && isDebug) {
        // http://stackoverflow.com/questions/8785624/how-to-safely-wrap-console-log
        Function.apply.call(console.log, console, arguments)
    }
}

//生成随机数字串
var generateId = function(){
    return Math.random().toString().replace(/0./,'');;
}

function inDoc(ele) {
    return Utils.contains(document.documentElement, ele);
}

/*====================================================
 *  jquery 借用方法
 *=====================================================*/

var Utils = {
    find: $.find,
    contains: $.contains,
    data: $.data,
    cleanData: $.cleanData,
    add: $.event.add,
    remove: $.event.remove,
    clone: $.clone,
    extend: $.extend,
    slice: [].slice,
    noop: noop,
    addClass: function (el, cls) {
        if (el.classList) {
            el.classList.add(cls);
        } else {
            var cur = ' ' + (el.getAttribute('class') || '') + ' ';
            if (cur.indexOf(' ' + cls + ' ') < 0) {
                el.setAttribute('class', trim((cur + cls)));
            }
        }
    },
    removeClass: function (el, cls) {
        if (el.classList) {
            el.classList.remove(cls);
        } else {
            var cur = ' ' + (el.getAttribute('class') || '') + ' ',
                tar = ' ' + cls + ' ';
            while (cur.indexOf(tar) >= 0) {
                cur = cur.replace(tar, ' ');
            }
            el.setAttribute('class', trim(cur));
        }
    },
    through: function (s) { return s; },
    warn: function () {
        return (window.console && console.error) ? function (msg) {
                console.error(msg);
            } : noop;
    },
    isObject: function (o) {
        return typeof o === 'object';
    },
    nextTick: function (cb, ctx) {
        ctx ?
            defer(function () { cb.call(ctx) }, 0) :
            defer(cb, 0);
    }
}

/*====================================================
 *  vm生成处理
 *=====================================================*/

function prefix(up, key, value) {
    //为何
    if (+key + '' === key) key = +key;

    var options = {
        data: value,
        up: up,
        top: up.top,
        namespace: [up.namespace, key].join('.')
    };
    up[key] = (typeof value === 'object' && value !== null) ? isArray(value) ? new DataArray(options) : new Data(options) : value;
}

function isArray(obj) {
    return Array.isArray(obj) || obj instanceof DataArray;
}

function Data(options) {
    var data = options.data,
        keys = Object.keys(options.data)
            .filter(function (key) { return key.indexOf('') !== 0; }),
        self = this;
    Utils.extend(this, data);

    // all key need to traverse
    this.keys = keys;
    // parent data container
    this.up = options.up;
    // the most top parent data container
    this.top = options.top || this;
    // the namespace of data
    this.namespace = options.namespace || '';
    keys.forEach(function (key) {
        prefix(self, key, data[key]);
    });
    // if it is a array
    Array.isArray(data) ?
        // fix the length
        (this.length = keys.length) :
        // if it is a DataArray Object
        data instanceof DataArray && (this.length = keys.length - 1);
};

Utils.extend(Data.prototype, {
    /**
     * get the namespace
     */
    $namespace: function (key) {
        return ( key !== undefined ? [this.namespace, key].join('.') : this.namespace ).substring(1);
    },
    /**
     * set the value of the key
     */
    $set: function (key, value) {
        prefix(this, key, value);
        this.top.$emit('data:' + this.$namespace(key), this[key]);
        return this;
    },
    /**
     * get the actual value
     */
    $get: function () {
        var res, keys = this.keys, self = this;
        if (this instanceof Data) {
            res = {};
        } else {
            res = [];
        }
        keys.forEach(function (key) {
            res[key] = self[key].$get ?
                self[key].$get() :
                self[key];
        });
        return res;
    }
});

function DataArray(options) {
    Data.call(this, options);
}

Utils.extend(DataArray.prototype, Data.prototype, {
    /**
     * push data
     */
    push: function (value) {
        prefix(this, this.length, value);
        this.keys.push(this.length);
        this.length++;
        this.top.$emit('data:' + this.$namespace(), this);
        return this;
    },
    /**
     * pop data
     */
    pop: function () {
        var res = this[--this.length];
        this[this.length] = null;
        delete this[this.length];
        this.keys.pop();
        this.top.$emit('data:' + this.$namespace(), this);
        return res;
    },
    /**
     * unshift
     */
    unshift: function (value) {
        this.keys.push(this.length);
        this.length++;
        for (var l = this.length; l--;) {
            this[l] = this[l - 1];
        }
        prefix(this, 0, value);
        this.top.$emit('data:' + this.$namespace(), this);
        return this;
    },
    /**
     * shift
     */
    shift: function () {
        this.length--;
        var res = this[0];
        for (var i = 0, l = this.length; i < l; i++) {
            this[i] = this[i + 1];
        }
        this.keys.pop();
        this.top.$emit('data:' + this.$namespace(), this);
        return res;
    },
    /**
     * touch
     */
    touch: function (key) {
        this.top.$emit('data:' + this.$namespace(key), this);
    },
    /**
     * indexOf
     */
    indexOf: function (item) {
        for (var i = 0, l = this.length; i < l; i++) {
            if (this[i] === item) return i;
        }
        return -1;
    },
    /**
     * splice
     */
    splice: function (i, l /**, items support later **/) {
        for (var j = 0, k = l + i, z = this.length - l; i < z; i++, j++) {
            this[i] = this[k + j];
            this[i].namespace = this[i].namespace.replace(/\.(\d+?)$/, '.' + i);
        }
        for (;i < this.length; i++) {
            this[i] = null;
            delete this[i];
        }
        this.length -= l;
        this.keys.splice(this.length, l);
        this.top.$emit('data:' + this.$namespace(), this);
    },
    /**
     * forEach
     */
    forEach: function (foo) {
        for (var i = 0, l = this.length; i < l; i++) {
            foo(this[i], i);
        }
    },
    /**
     * filter
     */
    filter: function (foo) {
        var res = [];
        this.forEach(function (item, i) {
            if (foo(item)) res.push(item);
        });
        return res;
    }
});

/*=======================================================================
 *  创建节点缓存 https://github.com/yyx990803/vue/blob/master/src/cache.js
 *  缓存使用最近未使用策略进行内容淘汰 https://github.com/rsms/js-lru
 *=======================================================================*/

function Cache (limit) {
    this.size = 0;
    this.limit = limit;
    this.head = this.tail = undefined;
    this.keymap = {};
}

Utils.extend(Cache.prototype, {

    put: function(key, value){
        var entry = {
            key: key,
            value: value
        }
        this.keymap[key] = entry;

        if (this.tail) {
            this.tail.newer = entry;
            entry.older = this.tail;
        } else {
            this.head = entry;
        }
        this.tail = entry;
        if (this.size === this.limit) {
            return this.shift();
        } else {
            this.size++;
        }
    },

    shift: function(){
        var entry = this.head;
        if (entry) {
            this.head = this.head.newer;
            this.head.older = undefined;
            entry.newer = entry.older = undefined;
            this.keymap[entry.key] = undefined;
        }
        return entry;
    },

    get: function(key, returnEntry){
        var entry = this.keymap[key];
        if (entry === undefined) return;
        if (entry === this.tail) {
            return returnEntry ?
                entry :
                entry.value;
        }
        if (entry.newer) {
            if (entry === this.head) {
                this.head = entry.newer;
            }
            entry.newer.older = entry.older;
        }
        if (entry.older) {
            entry.older.newer = entry.newer;
        }
        entry.newer = undefined;
        entry.older = this.tail;
        if (this.tail) {
            this.tail.newer = entry; 
        }
        this.tail = entry;
        return returnEntry ? entry : entry.value;
    }
});

var cache = new Cache(1000);
console.log(cache)


/*====================================================
 *  创建directive
 *=====================================================*/
var directives = {
    show: function (value) {
        var el = this.el;
        if (value) el.style.display = 'block';
        else el.style.display = 'none';
    },
    class: function (value) {
        var el = this.el,
            arg = this.arg;
        value ?
            addClass(el, arg) :
            removeClass(el, arg);
    },
    value: function (value) {
        var el = this.el;
        if (el.type === 'checkbox') {
            el.checked = value;
        } else {
            el.value = value;
        }
    },
    text: function (value) {
        value !== undefined &&
            (this.el.innerText = value);
    },
    on: {
        unwatch: true,
        bind: function () {
            var key = this.target || this.exp.match(/^[\w\-]+/)[0],
                expression = this.exp,
                filters = this.filters,
                vm = this.vm,
                handler = vm.applyFilters(this.vm[key], filters),
                data = this.namespace ?
                    vm.data(this.namespace) :
                    vm;
            Utils.add(this.el, this.arg, function (e) {
                if (!handler || typeof handler !== 'function') {
                    return warn('You need implement the ' + key + ' method.');
                }
                expression ?
                    handler.call(vm, data) :
                    handler.apply(vm, arguments);
            });
        }
    },
    model: {
        bind: function () {
            var key = this.target,
                namespace = this.namespace || '',
                el = this.el,
                vm = this.vm;
            add(el, 'input onpropertychange change', function (e) {
                vm.data(namespace).$set(key, el.value);
            });
        },
        update: function (value) {
            this.el.value = value;
        }
    }
}


/*====================================================
 *  节点 解析
 *=====================================================*/

function parse(str) {
    var hit = cache.get(str);
    if (hit) return hit;
    var exps = str.trim().split(/ *\, */),
        eventReg = /^([\w\-]+)\:/,
        keyReg = /^[\w\-]+$/,
        arr = [];
    exps.forEach(function (exp) {
        var res = {},
            match = exp.match(eventReg),
            filters, exp;
        if (match) {
            res.arg = match[1];
            exp = exp.substring(match[0].length).trim();
        }
        filters = exp.split(/ *\| */);
        exp = filters.shift();
        if (keyReg.test(exp)) {
            res.target = exp;
        } else {
            res.exp = exp;
        }
        res.filters = filters;
        arr.push(res);
    });
    cache.put(str, arr);
    return arr;
}
/*====================================================
 *  节点扫描
 *=====================================================*/
var qtid = 0;

function walk($el, cb, isTemplate, isFirst) {
    var i, j, l, el, atts, res, qtid;
    for (i = 0; el = $el[i++];) {
        if (el.nodeType === 1) {
            if (
                isTemplate &&
                    (qtid = el.getAttribute('qtid')) &&
                    (res = cache.get(qtid))
            ) {
                el.removeAttribute('qtid');
            } else {
                atts = el.attributes;
                l = atts.length;
                res = [];
                for (j = 0; j < l; j++) {
                    atts[j].name.indexOf('q-') === 0 &&
                        res.push({
                            name: atts[j].name,
                            value: atts[j].value
                        })
                }
                if (isTemplate && !qtid) {
                    qtid = qtid || ++qtid;
                    el.setAttribute('qtid', qtid);
                    cache.put(qtid, res);
                }
            }
            res.length > 0 &&
                cb(el, res, isFirst);
        }
        if (el.childNodes.length) walk(el.childNodes, cb, isTemplate);
    }
}

templateBind = function (el, options) {
    options = options || {};

    var self = this,
        directives = self.$options.directives,
        index = options.index,
        data = options.data || self,
        namespace = options.namespace;

    walk([el], function (node, res, isFirst) {
        res.forEach(function (obj) {
            var name = obj.name.substring(2),
                directive = directives[name],
                descriptors = parse(obj.value);
            directive &&
                descriptors.forEach(function (descriptor) {
                    var readFilters = self.makeReadFilters(descriptor.filters),
                        key = descriptor.target,
                        target = namespace ? ([namespace, key].join('.')) : key,
                        update = directive.update || directive,
                        that = Utils.extend({
                            el: node,
                            vm: self,
                            namespace: namespace
                        }, descriptor, {
                            filters: readFilters
                        });
                    directive.unwatch || self.$watch(target, function (value) {
                        value = self.applyFilters(value, readFilters);
                        update.call(that, value);
                    }, typeof data[key] === 'object', options.immediate || (data[key] !== undefined));
                    if (Utils.isObject(directive) && directive.bind) directive.bind.call(that);
                });

            name === 'repeat' && !isFirst &&
                descriptors.forEach(function (descriptor) {
                    var key = descriptor.target,
                        target = namespace ? ([namespace, key].join('.')) : key,
                        readFilters = self.makeReadFilters(descriptor.filters),
                        repeats = [],
                        tpl = node,
                        ref = document.createComment('q-repeat');
                    node.parentNode.replaceChild(ref, tpl);
                    walk([tpl], Utils.noop, true, true);
                    readFilters.push(function (arr) {
                        if (repeats.length) {
                            repeats.forEach(function (node) {
                                node.parentNode.removeChild(node);
                            });
                            Utils.cleanData(repeats);
                            repeats.length = 0;
                        }
                        var fragment = document.createDocumentFragment(),
                            itemNode;
                        arr.forEach(function (obj, i) {
                            itemNode = Utils.clone(tpl);
                            self.templateBind(itemNode, {
                                data: obj,
                                namespace: obj.$namespace(),
                                immediate: true,
                                isTemplate: true
                            });
                            repeats.push(itemNode);
                            fragment.appendChild(itemNode);
                        });
                        ref.parentNode.insertBefore(fragment, ref);
                    });
                    self.$watch(target, function (value) {
                        Utils.nextTick(function () {
                            self.applyFilters(value, readFilters);
                            self.$emit('repeat-render');
                        });
                    }, false, true);
                });
        });
    }, options.isTemplate, true);
};



/*====================================================
 *  节点扫描
 *=====================================================*/
var strats = {};
strats.created =
strats.ready =
strats.attached =
strats.detached =
strats.compiled =
strats.beforeDestroy =
strats.destroyed =
strats.paramAttributes = function (parentVal, childVal) {
    return childVal ?
        parentVal ?
            parentVal.concat(childVal) :
                Array.isArray(childVal) ?
                    childVal :
                        [childVal] :
        parentVal;
};
strats.methods =
strats.directives = function (parentVal, childVal) {
  if (!childVal) return parentVal;
  if (!parentVal) return childVal;
  return Utils.extend({}, parentVal, childVal);
}

var defaultStrat = function (parentVal, childVal) {
    return childVal === undefined ?
        parentVal :
        childVal;
};

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 *
 * All strategy functions follow the same signature:
 *
 * @param {*} parentVal
 * @param {*} childVal
 * @param {Vue} [vm]
 */
function mergeOptions(parent, child, vm) {
    var options = {}, key;
    for (key in parent) {
        merge(key);
    }
    for (key in child) {
        if (!(parent.hasOwnProperty(key))) {
            merge(key);
        }
    }
    function merge(key) {
        var strat = strats[key] || defaultStrat;
        options[key] = strat(parent[key], child[key], vm, key);
    }
    return options;
}

var strats = {
    strats: strats,
    mergeOptions: mergeOptions
}
var mergeOptions = strats.mergeOptions;

/*====================================================
 *  实例构造
 *=====================================================*/


function Q(options) {
    this.init(options);
}
Q.options = {
    directives: directives
};
Q.get = function (selector) {
    var ele = Utils.find(selector)[0];
    if (ele) {
        return Utils.data(ele, 'QI');
    } else {
        return null;
    }
};
Q.all = function (options) {
    return Utils.find(options.el).map(function (ele) {
        return new Q(Utils.extend(options, { el: ele }));
    });
};
Utils.extend(Q.prototype, {
    init: function (options) {
        options = options || {};
        this.$el = options.el &&
                typeof options.el === 'string' ?
                    Utils.find(options.el)[0] :
                    options.el;
        // element references
        this.$$ = {};
        // merge options
        options = this.$options = mergeOptions(
            this.constructor.options,
            options,
            this
        );
        // lifecycle state
        this.isCompiled = false;
        this.isAttached = false;
        this.isReady = false;
        // events bookkeeping
        this.events = {};
        this.watchers = {};
        Data.call(this, options);
        // this.data = options.data;
        // initialize data and scope inheritance.
        this.initScope();
        // call created hook
        this.callHook('created')
        // start compilation
        if (this.$el) {
            // cache the instance
            Utils.data(this.$el, 'QI', this);
            this.$mount(this.$el);
        }
    },

    data: function (key, value) {
        var i = 0, l, data = this;
        if (~key.indexOf('.')) {
            var keys = key.split('.');
            for (l = keys.length; i < l - 1; i++) {
                key = keys[i];
                // key is number
                if (+key + '' === key) key = +key;
                data = data[key];
            }
        }
        l && (key = keys[i]);
        if (value === undefined) return data[key];
        data.$set(key, value);
    },

    $on: function (event, fn) {
        (this.events[event] || (this.events[event] = []))
            .push(fn);
        return this;
    },

    $once: function (event, fn) {
        var self = this;
        function on() {
            self.$off(event, on);
            fn.apply(this, arguments);
        }
        on.fn = fn;
        this.$on(event, on);
        return this;
    },

    $off: function (event, fn) {
        var cbs, cb, i;
        // all event
        if (!arguments.length) {
            this.events = {};
            return this;
        }
        // specific event
        cbs = this.events[event];
        if (!cbs) {
            return this;
        }
        if (arguments.length === 1) {
            this.events[event] = null;
            return this;
        }
        // specific handler
        i = cbs.length;
        while (i--) {
            cb = cbs[i];
            if (cb === fn || cb.fn === fn) {
                cbs.splice(i, 1);
                break;
            }
        }
        return this;
    },
    /**
     * Watch an expression, trigger callback when its
     * value changes.
     *
     * @param {String} exp
     * @param {Function} cb
     * @param {Boolean} [deep]
     * @param {Boolean} [immediate]
     * @return {Function} - unwatchFn
     */
    $watch: function (exp, cb, deep, immediate) {
        var key = deep ? exp + '**deep**' : exp;
        (this.watchers[key] || (this.watchers[key] = []))
            .push(cb);
        immediate && cb(this.data(exp));
        return this;
    },
    /**
     * Trigger an event on self.
     *
     * @param {String} event
     */
    $emit: function (event) {
        this.emit.apply(this, arguments);
        // emit data change
        if (event.indexOf('data:') === 0) {
            var args = Utils.slice.call(arguments, 1);
            args.unshift(event.substring(5));
            this.callDataChange.apply(this, args);
        }
        return this;
    },

    emit: function (key) {
        var cbs = this.events[key];
        if (cbs) {
            var i = arguments.length - 1,
                args = new Array(i);
            while (i--) {
                args[i] = arguments[i + 1];
            }
            i = 0
            cbs = cbs.length > 1 ? Utils.slice.call(cbs, 0) : cbs;
            for (var l = cbs.length; i < l; i++) {
                cbs[i].apply(this, args);
            }
        }
    },

    clearWatch: function (namespace) {
        namespace = namespace + '.';
        var key;
        for (key in this.watchers) {
            if (~key.indexOf(namespace)) {
                this.watchers[key].length = 0;
            }
        }
    },

    callDataChange: function (key) {
        var keys = key.split('.'),
            self = { events: this.watchers },
            args = Utils.slice.call(arguments, 1),
            emit = this.emit, key;
        args.unshift(key);

        // TODO It must use a better way
        if (args[1] instanceof Data && 'length' in args[1]) this.clearWatch(key);
        emit.apply(self, args);
        for (; keys.length > 0;) {
            key = keys.join('.');
            args[0] = key + '**deep**';
            args[1] = this.data(key);
            emit.apply(self, args);
            keys.pop();
        }
    },
    /**
     * Setup the scope of an instance, which contains:
     * - observed data
     * - computed properties
     * - user methods
     * - meta properties
     */
    initScope: function () {
        this.initMethods();
    },

    /**
     * Setup instance methods. Methods must be bound to the
     * instance since they might be called by children
     * inheriting them.
     */
    initMethods: function () {
        var methods = this.$options.methods, key;
        if (methods) {
            for (key in methods) {
                this[key] = methods[key].bind(this);
            }
        }
    },

    /**
     * Set instance target element and kick off the compilation
     * process. The passed in `el` can be a template string, an
     * existing Element, or a DocumentFragment (for block
     * instances).
     *
     * @param {String|Element|DocumentFragment} el
     * @public
     */
    $mount: function (el) {
        if (this.isCompiled) {
            return Utils.warn('$mount() should be called only once');
        }
        if (typeof el === 'string') {
            // TODO for template
        }
        this.compile(el);
        this.isCompiled = true;
        this.callHook('compiled');
        if (inDoc(this.$el)) {
            this.callHook('attached');
            this.ready();
        } else {
            this.$once('hook:attached', this.ready);
        }
    },

    /**
     * ready
     */
    ready: function () {
        this.isAttached = true;
        this.isReady = true;
        this.callHook('ready');
    },
    /**
     * Transclude, compile and link element.
     *
     * If a pre-compiled linker is available, that means the
     * passed in element will be pre-transcluded and compiled
     * as well - all we need to do is to call the linker.
     *
     * Otherwise we need to call transclude/compile/link here.
     *
     * @param {Element} el
     * @return {Element}
     */
    compile: function (el) {
        this.transclue(el, this.$options);
    },
    /**
     * Process an element or a DocumentFragment based on a
     * instance option object. This allows us to transclude
     * a template node/fragment before the instance is created,
     * so the processed fragment can then be cloned and reused
     * in v-repeat.
     *
     * @param {Element} el
     * @param {Object} options
     * @return {Element|DocumentFragment}
     */
    transclue: function (el, options) {
        // static template bind
        if (Utils.find('.q-mark', el).length) {
            this.renderedBind(el, options);
        } else {
            this.templateBind(el, options);
        }
    },

    /**
     * bind rendered template
     */
    templateBind: templateBind,

    /**
     * bind rendered template
     */
    renderedBind: function (el, options) {
        var self = this;
    },

    /**
     * Trigger all handlers for a hook
     *
     * @param {String} hook
     */
    callHook: function (hook) {
        var handlers = this.$options[hook];
        if (handlers) {
            for (var i = 0, j = handlers.length; i < j; i++) {
                handlers[i].call(this);
            }
        }
        this.$emit('hook:' + hook);
    },


    //获取options的filter方法列表
    makeReadFilters: function (names) {
        if (!names.length) return [];
        var filters = this.$options.filters,
            self = this;
        return names.map(function (name) {
            var args = name.split(' '),
                reader;
            name = args.shift();
            reader = (filters[name] ? (filters[name].read || filters[name]) : Utils.through);
            return function (value) {
                return args ?
                    reader.apply(self, [value].concat(args)) :
                        reader.call(self, value);
            };
        });
    },

    //调用filter方法列表的方法
    applyFilters: function (value, filters, oldVal) {
        if (!filters || !filters.length) {
            return value;
        }
        for (var i = 0, l = filters.length; i < l; i++) {
            value = filters[i].call(this, value, oldVal);
        }
        return value;
    }
});

Utils.extend(Q.prototype, Data.prototype);
module.exports = Q;
