
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    let running = false;
    function run_tasks() {
        tasks.forEach(task => {
            if (!task[0](now())) {
                tasks.delete(task);
                task[1]();
            }
        });
        running = tasks.size > 0;
        if (running)
            raf(run_tasks);
    }
    function loop(fn) {
        let task;
        if (!running) {
            running = true;
            raf(run_tasks);
        }
        return {
            promise: new Promise(fulfil => {
                tasks.add(task = [fn, fulfil]);
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_style(node, key, value) {
        node.style.setProperty(key, value);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var rgbaster_umd = createCommonjsModule(function (module, exports) {
    !function(e,t){module.exports=t();}(commonjsGlobal,function(){var e=function(e,t){void 0===t&&(t=1);var r=new Image;return e.startsWith("data")||(r.crossOrigin="Anonymous"),new Promise(function(n,o){r.onload=function(){var e=r.width*t,o=r.height*t,i=function(e,t){var r=document.createElement("canvas");return r.setAttribute("width",e),r.setAttribute("height",t),r.getContext("2d")}(e,o);i.drawImage(r,0,0,e,o);var a=i.getImageData(0,0,e,o);n(a.data);};var i=function(){return o(new Error("An error occurred attempting to load image"))};r.onerror=i,r.onabort=i,r.src=e;})},t={ignore:[],scale:1};return function(r,n){void 0===n&&(n=t);try{var o=(n=Object.assign({},t,n)).ignore,i=n.scale;return (i>1||i<=0)&&console.warn("You set scale to "+i+", which isn't between 0-1. This is either pointless (> 1) or a no-op (≤ 0)"),Promise.resolve(e(r,i)).then(function(e){return function(e,t){for(var r={},n=0;n<e.length;n+=4){var o=e[n+3];if(0!==o){var i=Array.from(e.subarray(n,n+3));if(-1===i.indexOf(void 0)){var a=o&&255!==o?"rgba("+i.concat([o]).join(",")+")":"rgb("+i.join(",")+")";-1===t.indexOf(a)&&(r[a]?r[a].count++:r[a]={color:a,count:1});}}}return Object.values(r).sort(function(e,t){return t.count-e.count})}(e,o)})}catch(e){return Promise.reject(e)}}});
    //# sourceMappingURL=rgbaster.umd.js.map
    });

    var nearestColor = createCommonjsModule(function (module) {
    (function(context) {

      /**
       * Defines an available color.
       *
       * @typedef {Object} ColorSpec
       * @property {string=} name A name for the color, e.g., 'red'
       * @property {string} source The hex-based color string, e.g., '#FF0'
       * @property {RGB} rgb The {@link RGB} color values
       */

      /**
       * Describes a matched color.
       *
       * @typedef {Object} ColorMatch
       * @property {string} name The name of the matched color, e.g., 'red'
       * @property {string} value The hex-based color string, e.g., '#FF0'
       * @property {RGB} rgb The {@link RGB} color values.
       */

      /**
       * Provides the RGB breakdown of a color.
       *
       * @typedef {Object} RGB
       * @property {number} r The red component, from 0 to 255
       * @property {number} g The green component, from 0 to 255
       * @property {number} b The blue component, from 0 to 255
       */

      /**
       * Gets the nearest color, from the given list of {@link ColorSpec} objects
       * (which defaults to {@link nearestColor.DEFAULT_COLORS}).
       *
       * Probably you wouldn't call this method directly. Instead you'd get a custom
       * color matcher by calling {@link nearestColor.from}.
       *
       * @public
       * @param {RGB|string} needle Either an {@link RGB} color or a hex-based
       *     string representing one, e.g., '#FF0'
       * @param {Array.<ColorSpec>=} colors An optional list of available colors
       *     (defaults to {@link nearestColor.DEFAULT_COLORS})
       * @return {ColorMatch|string} If the colors in the provided list had names,
       *     then a {@link ColorMatch} object with the name and (hex) value of the
       *     nearest color from the list. Otherwise, simply the hex value.
       *
       * @example
       * nearestColor({ r: 200, g: 50, b: 50 }); // => '#f00'
       * nearestColor('#f11');                   // => '#f00'
       * nearestColor('#f88');                   // => '#f80'
       * nearestColor('#ffe');                   // => '#ff0'
       * nearestColor('#efe');                   // => '#ff0'
       * nearestColor('#abc');                   // => '#808'
       * nearestColor('red');                    // => '#f00'
       * nearestColor('foo');                    // => throws
       */
      function nearestColor(needle, colors) {
        needle = parseColor(needle);

        if (!needle) {
          return null;
        }

        var distanceSq,
            minDistanceSq = Infinity,
            rgb,
            value;

        colors || (colors = nearestColor.DEFAULT_COLORS);

        for (var i = 0; i < colors.length; ++i) {
          rgb = colors[i].rgb;

          distanceSq = (
            Math.pow(needle.r - rgb.r, 2) +
            Math.pow(needle.g - rgb.g, 2) +
            Math.pow(needle.b - rgb.b, 2)
          );

          if (distanceSq < minDistanceSq) {
            minDistanceSq = distanceSq;
            value = colors[i];
          }
        }

        if (value.name) {
          return {
            name: value.name,
            value: value.source,
            rgb: value.rgb,
            distance: Math.sqrt(minDistanceSq)
          };
        }

        return value.source;
      }

      /**
       * Provides a matcher to find the nearest color based on the provided list of
       * available colors.
       *
       * @public
       * @param {Array.<string>|Object} availableColors An array of hex-based color
       *     strings, or an object mapping color *names* to hex values.
       * @return {function(string):ColorMatch|string} A function with the same
       *     behavior as {@link nearestColor}, but with the list of colors
       *     predefined.
       *
       * @example
       * var colors = {
       *   'maroon': '#800',
       *   'light yellow': { r: 255, g: 255, b: 51 },
       *   'pale blue': '#def',
       *   'white': 'fff'
       * };
       *
       * var bgColors = [
       *   '#eee',
       *   '#444'
       * ];
       *
       * var invalidColors = {
       *   'invalid': 'foo'
       * };
       *
       * var getColor = nearestColor.from(colors);
       * var getBGColor = getColor.from(bgColors);
       * var getAnyColor = nearestColor.from(colors).or(bgColors);
       *
       * getColor('ffe');
       * // => { name: 'white', value: 'fff', rgb: { r: 255, g: 255, b: 255 }, distance: 17}
       *
       * getColor('#f00');
       * // => { name: 'maroon', value: '#800', rgb: { r: 136, g: 0, b: 0 }, distance: 119}
       *
       * getColor('#ff0');
       * // => { name: 'light yellow', value: '#ffff33', rgb: { r: 255, g: 255, b: 51 }, distance: 51}
       *
       * getBGColor('#fff'); // => '#eee'
       * getBGColor('#000'); // => '#444'
       *
       * getAnyColor('#f00');
       * // => { name: 'maroon', value: '#800', rgb: { r: 136, g: 0, b: 0 }, distance: 119}
       *
       * getAnyColor('#888'); // => '#444'
       *
       * nearestColor.from(invalidColors); // => throws
       */
      nearestColor.from = function from(availableColors) {
        var colors = mapColors(availableColors),
            nearestColorBase = nearestColor;

        var matcher = function nearestColor(hex) {
          return nearestColorBase(hex, colors);
        };

        // Keep the 'from' method, to support changing the list of available colors
        // multiple times without needing to keep a reference to the original
        // nearestColor function.
        matcher.from = from;

        // Also provide a way to combine multiple color lists.
        matcher.or = function or(alternateColors) {
          var extendedColors = colors.concat(mapColors(alternateColors));
          return nearestColor.from(extendedColors);
        };

        return matcher;
      };

      /**
       * Given either an array or object of colors, returns an array of
       * {@link ColorSpec} objects (with {@link RGB} values).
       *
       * @private
       * @param {Array.<string>|Object} colors An array of hex-based color strings, or
       *     an object mapping color *names* to hex values.
       * @return {Array.<ColorSpec>} An array of {@link ColorSpec} objects
       *     representing the same colors passed in.
       */
      function mapColors(colors) {
        if (colors instanceof Array) {
          return colors.map(function(color) {
            return createColorSpec(color);
          });
        }

        return Object.keys(colors).map(function(name) {
          return createColorSpec(colors[name], name);
        });
      }
      /**
       * Parses a color from a string.
       *
       * @private
       * @param {RGB|string} source
       * @return {RGB}
       *
       * @example
       * parseColor({ r: 3, g: 22, b: 111 }); // => { r: 3, g: 22, b: 111 }
       * parseColor('#f00');                  // => { r: 255, g: 0, b: 0 }
       * parseColor('#04fbc8');               // => { r: 4, g: 251, b: 200 }
       * parseColor('#FF0');                  // => { r: 255, g: 255, b: 0 }
       * parseColor('rgb(3, 10, 100)');       // => { r: 3, g: 10, b: 100 }
       * parseColor('rgb(50%, 0%, 50%)');     // => { r: 128, g: 0, b: 128 }
       * parseColor('aqua');                  // => { r: 0, g: 255, b: 255 }
       * parseColor('fff');                   // => { r: 255, g: 255, b: 255 }
       * parseColor('foo');                   // => throws
       */
      function parseColor(source) {
        var red, green, blue;

        if (typeof source === 'object') {
          return source;
        }

        if (source in nearestColor.STANDARD_COLORS) {
          return parseColor(nearestColor.STANDARD_COLORS[source]);
        }

        var hexMatch = source.match(/^#?((?:[0-9a-f]{3}){1,2})$/i);
        if (hexMatch) {
          hexMatch = hexMatch[1];

          if (hexMatch.length === 3) {
            hexMatch = [
              hexMatch.charAt(0) + hexMatch.charAt(0),
              hexMatch.charAt(1) + hexMatch.charAt(1),
              hexMatch.charAt(2) + hexMatch.charAt(2)
            ];

          } else {
            hexMatch = [
              hexMatch.substring(0, 2),
              hexMatch.substring(2, 4),
              hexMatch.substring(4, 6)
            ];
          }

          red = parseInt(hexMatch[0], 16);
          green = parseInt(hexMatch[1], 16);
          blue = parseInt(hexMatch[2], 16);

          return { r: red, g: green, b: blue };
        }

        var rgbMatch = source.match(/^rgb\(\s*(\d{1,3}%?),\s*(\d{1,3}%?),\s*(\d{1,3}%?)\s*\)$/i);
        if (rgbMatch) {
          red = parseComponentValue(rgbMatch[1]);
          green = parseComponentValue(rgbMatch[2]);
          blue = parseComponentValue(rgbMatch[3]);

          return { r: red, g: green, b: blue };
        }

        throw Error('"' + source + '" is not a valid color');
      }

      /**
       * Creates a {@link ColorSpec} from either a string or an {@link RGB}.
       *
       * @private
       * @param {string|RGB} input
       * @param {string=} name
       * @return {ColorSpec}
       *
       * @example
       * createColorSpec('#800'); // => {
       *   source: '#800',
       *   rgb: { r: 136, g: 0, b: 0 }
       * }
       *
       * createColorSpec('#800', 'maroon'); // => {
       *   name: 'maroon',
       *   source: '#800',
       *   rgb: { r: 136, g: 0, b: 0 }
       * }
       */
      function createColorSpec(input, name) {
        var color = {};

        if (name) {
          color.name = name;
        }

        if (typeof input === 'string') {
          color.source = input;
          color.rgb = parseColor(input);

        } else if (typeof input === 'object') {
          // This is for if/when we're concatenating lists of colors.
          if (input.source) {
            return createColorSpec(input.source, input.name);
          }

          color.rgb = input;
          color.source = rgbToHex(input);
        }

        return color;
      }

      /**
       * Parses a value between 0-255 from a string.
       *
       * @private
       * @param {string} string
       * @return {number}
       *
       * @example
       * parseComponentValue('100');  // => 100
       * parseComponentValue('100%'); // => 255
       * parseComponentValue('50%');  // => 128
       */
      function parseComponentValue(string) {
        if (string.charAt(string.length - 1) === '%') {
          return Math.round(parseInt(string, 10) * 255 / 100);
        }

        return Number(string);
      }

      /**
       * Converts an {@link RGB} color to its hex representation.
       *
       * @private
       * @param {RGB} rgb
       * @return {string}
       *
       * @example
       * rgbToHex({ r: 255, g: 128, b: 0 }); // => '#ff8000'
       */
      function rgbToHex(rgb) {
        return '#' + leadingZero(rgb.r.toString(16)) +
          leadingZero(rgb.g.toString(16)) + leadingZero(rgb.b.toString(16));
      }

      /**
       * Puts a 0 in front of a numeric string if it's only one digit. Otherwise
       * nothing (just returns the value passed in).
       *
       * @private
       * @param {string} value
       * @return
       *
       * @example
       * leadingZero('1');  // => '01'
       * leadingZero('12'); // => '12'
       */
      function leadingZero(value) {
        if (value.length === 1) {
          value = '0' + value;
        }
        return value;
      }

      /**
       * A map from the names of standard CSS colors to their hex values.
       */
      nearestColor.STANDARD_COLORS = {
        aqua: '#0ff',
        black: '#000',
        blue: '#00f',
        fuchsia: '#f0f',
        gray: '#808080',
        green: '#008000',
        lime: '#0f0',
        maroon: '#800000',
        navy: '#000080',
        olive: '#808000',
        orange: '#ffa500',
        purple: '#800080',
        red: '#f00',
        silver: '#c0c0c0',
        teal: '#008080',
        white: '#fff',
        yellow: '#ff0'
      };

      /**
       * Default colors. Comprises the colors of the rainbow (good ol' ROY G. BIV).
       * This list will be used for calls to {@nearestColor} that don't specify a list
       * of available colors to match.
       */
      nearestColor.DEFAULT_COLORS = mapColors([
        '#f00', // r
        '#f80', // o
        '#ff0', // y
        '#0f0', // g
        '#00f', // b
        '#008', // i
        '#808'  // v
      ]);

      nearestColor.VERSION = '0.4.4';

      if ( module && module.exports) {
        module.exports = nearestColor;
      } else {
        context.nearestColor = nearestColor;
      }

    }(commonjsGlobal));
    });

    var bundle = createCommonjsModule(function (module, exports) {
    !function(t,e){module.exports=e();}("undefined"!=typeof self?self:commonjsGlobal,function(){return function(t){var e={};function n(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{configurable:!1,enumerable:!0,get:r});},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=50)}([function(t,e){var n=t.exports="undefined"!=typeof window&&window.Math==Math?window:"undefined"!=typeof self&&self.Math==Math?self:Function("return this")();"number"==typeof __g&&(__g=n);},function(t,e,n){var r=n(26)("wks"),o=n(18),i=n(0).Symbol,a="function"==typeof i;(t.exports=function(t){return r[t]||(r[t]=a&&i[t]||(a?i:o)("Symbol."+t))}).store=r;},function(t,e){var n=t.exports={version:"2.5.3"};"number"==typeof __e&&(__e=n);},function(t,e,n){var r=n(6);t.exports=function(t){if(!r(t))throw TypeError(t+" is not an object!");return t};},function(t,e,n){var r=n(5),o=n(17);t.exports=n(7)?function(t,e,n){return r.f(t,e,o(1,n))}:function(t,e,n){return t[e]=n,t};},function(t,e,n){var r=n(3),o=n(35),i=n(23),a=Object.defineProperty;e.f=n(7)?Object.defineProperty:function(t,e,n){if(r(t),e=i(e,!0),r(n),o)try{return a(t,e,n)}catch(t){}if("get"in n||"set"in n)throw TypeError("Accessors not supported!");return "value"in n&&(t[e]=n.value),t};},function(t,e){t.exports=function(t){return "object"==typeof t?null!==t:"function"==typeof t};},function(t,e,n){t.exports=!n(16)(function(){return 7!=Object.defineProperty({},"a",{get:function(){return 7}}).a});},function(t,e){var n={}.hasOwnProperty;t.exports=function(t,e){return n.call(t,e)};},function(t,e,n){var r=n(57),o=n(21);t.exports=function(t){return r(o(t))};},function(t,e,n){var r=n(0),o=n(2),i=n(14),a=n(4),u=function(t,e,n){var c,s,f,l=t&u.F,p=t&u.G,d=t&u.S,h=t&u.P,g=t&u.B,m=t&u.W,v=p?o:o[e]||(o[e]={}),y=v.prototype,_=p?r:d?r[e]:(r[e]||{}).prototype;for(c in p&&(n=e),n)(s=!l&&_&&void 0!==_[c])&&c in v||(f=s?_[c]:n[c],v[c]=p&&"function"!=typeof _[c]?n[c]:g&&s?i(f,r):m&&_[c]==f?function(t){var e=function(e,n,r){if(this instanceof t){switch(arguments.length){case 0:return new t;case 1:return new t(e);case 2:return new t(e,n)}return new t(e,n,r)}return t.apply(this,arguments)};return e.prototype=t.prototype,e}(f):h&&"function"==typeof f?i(Function.call,f):f,h&&((v.virtual||(v.virtual={}))[c]=f,t&u.R&&y&&!y[c]&&a(y,c,f)));};u.F=1,u.G=2,u.S=4,u.P=8,u.B=16,u.W=32,u.U=64,u.R=128,t.exports=u;},function(t,e){t.exports={};},function(t,e){var n={}.toString;t.exports=function(t){return n.call(t).slice(8,-1)};},function(t,e){t.exports=!0;},function(t,e,n){var r=n(15);t.exports=function(t,e,n){if(r(t),void 0===e)return t;switch(n){case 1:return function(n){return t.call(e,n)};case 2:return function(n,r){return t.call(e,n,r)};case 3:return function(n,r,o){return t.call(e,n,r,o)}}return function(){return t.apply(e,arguments)}};},function(t,e){t.exports=function(t){if("function"!=typeof t)throw TypeError(t+" is not a function!");return t};},function(t,e){t.exports=function(t){try{return !!t()}catch(t){return !0}};},function(t,e){t.exports=function(t,e){return {enumerable:!(1&t),configurable:!(2&t),writable:!(4&t),value:e}};},function(t,e){var n=0,r=Math.random();t.exports=function(t){return "Symbol(".concat(void 0===t?"":t,")_",(++n+r).toString(36))};},function(t,e,n){var r=n(5).f,o=n(8),i=n(1)("toStringTag");t.exports=function(t,e,n){t&&!o(t=n?t:t.prototype,i)&&r(t,i,{configurable:!0,value:e});};},function(t,e){var n=Math.ceil,r=Math.floor;t.exports=function(t){return isNaN(t=+t)?0:(t>0?r:n)(t)};},function(t,e){t.exports=function(t){if(void 0==t)throw TypeError("Can't call method on  "+t);return t};},function(t,e,n){var r=n(6),o=n(0).document,i=r(o)&&r(o.createElement);t.exports=function(t){return i?o.createElement(t):{}};},function(t,e,n){var r=n(6);t.exports=function(t,e){if(!r(t))return t;var n,o;if(e&&"function"==typeof(n=t.toString)&&!r(o=n.call(t)))return o;if("function"==typeof(n=t.valueOf)&&!r(o=n.call(t)))return o;if(!e&&"function"==typeof(n=t.toString)&&!r(o=n.call(t)))return o;throw TypeError("Can't convert object to primitive value")};},function(t,e,n){var r=n(38),o=n(27);t.exports=Object.keys||function(t){return r(t,o)};},function(t,e,n){var r=n(26)("keys"),o=n(18);t.exports=function(t){return r[t]||(r[t]=o(t))};},function(t,e,n){var r=n(0),o=r["__core-js_shared__"]||(r["__core-js_shared__"]={});t.exports=function(t){return o[t]||(o[t]={})};},function(t,e){t.exports="constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf".split(",");},function(t,e,n){e.f=n(1);},function(t,e,n){var r=n(0),o=n(2),i=n(13),a=n(28),u=n(5).f;t.exports=function(t){var e=o.Symbol||(o.Symbol=i?{}:r.Symbol||{});"_"==t.charAt(0)||t in e||u(e,t,{value:a.f(t)});};},function(t,e){e.f={}.propertyIsEnumerable;},function(t,e,n){t.exports={default:n(79),__esModule:!0};},function(t,e,n){var r=n(15);t.exports.f=function(t){return new function(t){var e,n;this.promise=new t(function(t,r){if(void 0!==e||void 0!==n)throw TypeError("Bad Promise constructor");e=t,n=r;}),this.resolve=r(e),this.reject=r(n);}(t)};},function(t,e,n){var r=n(54)(!0);n(34)(String,"String",function(t){this._t=String(t),this._i=0;},function(){var t,e=this._t,n=this._i;return n>=e.length?{value:void 0,done:!0}:(t=r(e,n),this._i+=t.length,{value:t,done:!1})});},function(t,e,n){var r=n(13),o=n(10),i=n(36),a=n(4),u=n(8),c=n(11),s=n(55),f=n(19),l=n(60),p=n(1)("iterator"),d=!([].keys&&"next"in[].keys()),h=function(){return this};t.exports=function(t,e,n,g,m,v,y){s(n,e,g);var _,w,S,x=function(t){if(!d&&t in I)return I[t];switch(t){case"keys":case"values":return function(){return new n(this,t)}}return function(){return new n(this,t)}},b=e+" Iterator",P="values"==m,E=!1,I=t.prototype,A=I[p]||I["@@iterator"]||m&&I[m],O=!d&&A||x(m),T=m?P?x("entries"):O:void 0,F="Array"==e&&I.entries||A;if(F&&(S=l(F.call(new t)))!==Object.prototype&&S.next&&(f(S,b,!0),r||u(S,p)||a(S,p,h)),P&&A&&"values"!==A.name&&(E=!0,O=function(){return A.call(this)}),r&&!y||!d&&!E&&I[p]||a(I,p,O),c[e]=O,c[b]=h,m)if(_={values:P?O:x("values"),keys:v?O:x("keys"),entries:T},y)for(w in _)w in I||i(I,w,_[w]);else o(o.P+o.F*(d||E),e,_);return _};},function(t,e,n){t.exports=!n(7)&&!n(16)(function(){return 7!=Object.defineProperty(n(22)("div"),"a",{get:function(){return 7}}).a});},function(t,e,n){t.exports=n(4);},function(t,e,n){var r=n(3),o=n(56),i=n(27),a=n(25)("IE_PROTO"),u=function(){},c=function(){var t,e=n(22)("iframe"),r=i.length;for(e.style.display="none",n(40).appendChild(e),e.src="javascript:",(t=e.contentWindow.document).open(),t.write("<script>document.F=Object<\/script>"),t.close(),c=t.F;r--;)delete c.prototype[i[r]];return c()};t.exports=Object.create||function(t,e){var n;return null!==t?(u.prototype=r(t),n=new u,u.prototype=null,n[a]=t):n=c(),void 0===e?n:o(n,e)};},function(t,e,n){var r=n(8),o=n(9),i=n(58)(!1),a=n(25)("IE_PROTO");t.exports=function(t,e){var n,u=o(t),c=0,s=[];for(n in u)n!=a&&r(u,n)&&s.push(n);for(;e.length>c;)r(u,n=e[c++])&&(~i(s,n)||s.push(n));return s};},function(t,e,n){var r=n(20),o=Math.min;t.exports=function(t){return t>0?o(r(t),9007199254740991):0};},function(t,e,n){var r=n(0).document;t.exports=r&&r.documentElement;},function(t,e,n){n(62);for(var r=n(0),o=n(4),i=n(11),a=n(1)("toStringTag"),u="CSSRuleList,CSSStyleDeclaration,CSSValueList,ClientRectList,DOMRectList,DOMStringList,DOMTokenList,DataTransferItemList,FileList,HTMLAllCollection,HTMLCollection,HTMLFormElement,HTMLSelectElement,MediaList,MimeTypeArray,NamedNodeMap,NodeList,PaintRequestList,Plugin,PluginArray,SVGLengthList,SVGNumberList,SVGPathSegList,SVGPointList,SVGStringList,SVGTransformList,SourceBufferList,StyleSheetList,TextTrackCueList,TextTrackList,TouchList".split(","),c=0;c<u.length;c++){var s=u[c],f=r[s],l=f&&f.prototype;l&&!l[a]&&o(l,a,s),i[s]=i.Array;}},function(t,e){e.f=Object.getOwnPropertySymbols;},function(t,e,n){var r=n(38),o=n(27).concat("length","prototype");e.f=Object.getOwnPropertyNames||function(t){return r(t,o)};},function(t,e){},function(t,e,n){var r=n(12),o=n(1)("toStringTag"),i="Arguments"==r(function(){return arguments}());t.exports=function(t){var e,n,a;return void 0===t?"Undefined":null===t?"Null":"string"==typeof(n=function(t,e){try{return t[e]}catch(t){}}(e=Object(t),o))?n:i?r(e):"Object"==(a=r(e))&&"function"==typeof e.callee?"Arguments":a};},function(t,e,n){var r=n(3),o=n(15),i=n(1)("species");t.exports=function(t,e){var n,a=r(t).constructor;return void 0===a||void 0==(n=r(a)[i])?e:o(n)};},function(t,e,n){var r,o,i,a=n(14),u=n(86),c=n(40),s=n(22),f=n(0),l=f.process,p=f.setImmediate,d=f.clearImmediate,h=f.MessageChannel,g=f.Dispatch,m=0,v={},y=function(){var t=+this;if(v.hasOwnProperty(t)){var e=v[t];delete v[t],e();}},_=function(t){y.call(t.data);};p&&d||(p=function(t){for(var e=[],n=1;arguments.length>n;)e.push(arguments[n++]);return v[++m]=function(){u("function"==typeof t?t:Function(t),e);},r(m),m},d=function(t){delete v[t];},"process"==n(12)(l)?r=function(t){l.nextTick(a(y,t,1));}:g&&g.now?r=function(t){g.now(a(y,t,1));}:h?(i=(o=new h).port2,o.port1.onmessage=_,r=a(i.postMessage,i,1)):f.addEventListener&&"function"==typeof postMessage&&!f.importScripts?(r=function(t){f.postMessage(t+"","*");},f.addEventListener("message",_,!1)):r="onreadystatechange"in s("script")?function(t){c.appendChild(s("script")).onreadystatechange=function(){c.removeChild(this),y.call(t);};}:function(t){setTimeout(a(y,t,1),0);}),t.exports={set:p,clear:d};},function(t,e){t.exports=function(t){try{return {e:!1,v:t()}}catch(t){return {e:!0,v:t}}};},function(t,e,n){var r=n(3),o=n(6),i=n(32);t.exports=function(t,e){if(r(t),o(e)&&e.constructor===t)return e;var n=i.f(t);return (0, n.resolve)(e),n.promise};},function(t,e,n){Object.defineProperty(e,"__esModule",{value:!0});var r=c(n(51)),o=c(n(75)),i=c(n(78)),a=c(n(31)),u=c(n(93));function c(t){return t&&t.__esModule?t:{default:t}}var s,f,l={1:{rotate:0,flip:!1},2:{rotate:0,flip:!0},3:{rotate:Math.PI,flip:!1},4:{rotate:Math.PI,flip:!0},5:{rotate:1.5*Math.PI,flip:!0},6:{rotate:.5*Math.PI,flip:!1},7:{rotate:.5*Math.PI,flip:!0},8:{rotate:1.5*Math.PI,flip:!1}},p=[0,90,180,270],d=function(t,e){var n=l[e];return n?function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,n=arguments.length>2&&void 0!==arguments[2]&&arguments[2];return t.translate(t.canvas.width/2,t.canvas.height/2),t.rotate(e),n&&t.scale(-1,1),t}(t,n.rotate,n.flip):t},h=function(t,e){var n=document.createElement("canvas");return n.width=t,n.height=e,n},g=function(t){return new a.default(function(e){var n=new Image;n.src=URL.createObjectURL(t),n.onload=function(){return e(n)};})},m=(s=(0, i.default)(o.default.mark(function t(e,n,r){var i,u,c,s,f,p,m,v,y,_,w;return o.default.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:if(l[n]){t.next=2;break}return t.abrupt("return",e);case 2:return i=new Blob([e]),t.next=5,g(i);case 5:if(u=t.sent,c=u.width,s=u.height,r.maxWidth&&c>r.maxWidth&&(f=r.maxWidth/c,c*=f,s*=f),r.maxHeight&&s>r.maxHeight&&(p=r.maxHeight/s,c*=p,s*=p),c=Math.floor(c),s=Math.floor(s),m=h(c,s),v=m.width,y=m.height,(n>4||90===r.rotate||270===r.rotate)&&(_=m.width,m.width=m.height,m.height=_),(w=d(m.getContext("2d"),n)).rotate(r.rotate*Math.PI/180),w.drawImage(u,0,0,u.width,u.height,-v/2,-y/2,v,y),void 0===m.toBlob){t.next=23;break}return t.abrupt("return",new a.default(function(t){return m.toBlob(t,r.type||i.type,r.quality/100)}));case 23:if(void 0===m.msToBlob){t.next=25;break}return t.abrupt("return",m.msToBlob());case 25:return t.abrupt("return",i);case 26:case"end":return t.stop()}},t,void 0)})),function(){return s.apply(this,arguments)}),v=function(t){return new a.default(function(e){var n=new FileReader;n.onload=function(t){e(t.target.result);},n.readAsArrayBuffer(t);})},y=(f=(0, i.default)(o.default.mark(function t(e){var n,i,a,c,s,f=arguments.length>1&&void 0!==arguments[1]?arguments[1]:void 0,l=arguments.length>2&&void 0!==arguments[2]?arguments[2]:100,d=arguments.length>3&&void 0!==arguments[3]?arguments[3]:0;return o.default.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return n=void 0,"object"===(void 0===f?"undefined":(0, r.default)(f))?((n=f).quality||(n.quality=100),n.rotate=p[n.rotate]):((n={}).maxWidth=f,n.quality=l,n.rotate=p[d]),i=1,t.prev=3,t.next=6,(0, u.default)(e);case 6:(a=t.sent).Orientation&&(i=a.Orientation.value),t.next=13;break;case 10:t.prev=10,t.t0=t.catch(3),"Invalid image format"===t.t0.message||n.silent||console.error("get metadata error",t.t0);case 13:return t.prev=13,t.next=16,m(e,i,n);case 16:return c=t.sent,t.next=19,v(c);case 19:return s=t.sent,t.abrupt("return",s);case 23:return t.prev=23,t.t1=t.catch(13),n.silent||console.error("error",t.t1),t.abrupt("return",e);case 27:case"end":return t.stop()}},t,void 0,[[3,10],[13,23]])})),function(){return f.apply(this,arguments)});e.default=y;},function(t,e,n){e.__esModule=!0;var r=a(n(52)),o=a(n(65)),i="function"==typeof o.default&&"symbol"==typeof r.default?function(t){return typeof t}:function(t){return t&&"function"==typeof o.default&&t.constructor===o.default&&t!==o.default.prototype?"symbol":typeof t};function a(t){return t&&t.__esModule?t:{default:t}}e.default="function"==typeof o.default&&"symbol"===i(r.default)?function(t){return void 0===t?"undefined":i(t)}:function(t){return t&&"function"==typeof o.default&&t.constructor===o.default&&t!==o.default.prototype?"symbol":void 0===t?"undefined":i(t)};},function(t,e,n){t.exports={default:n(53),__esModule:!0};},function(t,e,n){n(33),n(41),t.exports=n(28).f("iterator");},function(t,e,n){var r=n(20),o=n(21);t.exports=function(t){return function(e,n){var i,a,u=String(o(e)),c=r(n),s=u.length;return c<0||c>=s?t?"":void 0:(i=u.charCodeAt(c))<55296||i>56319||c+1===s||(a=u.charCodeAt(c+1))<56320||a>57343?t?u.charAt(c):i:t?u.slice(c,c+2):a-56320+(i-55296<<10)+65536}};},function(t,e,n){var r=n(37),o=n(17),i=n(19),a={};n(4)(a,n(1)("iterator"),function(){return this}),t.exports=function(t,e,n){t.prototype=r(a,{next:o(1,n)}),i(t,e+" Iterator");};},function(t,e,n){var r=n(5),o=n(3),i=n(24);t.exports=n(7)?Object.defineProperties:function(t,e){o(t);for(var n,a=i(e),u=a.length,c=0;u>c;)r.f(t,n=a[c++],e[n]);return t};},function(t,e,n){var r=n(12);t.exports=Object("z").propertyIsEnumerable(0)?Object:function(t){return "String"==r(t)?t.split(""):Object(t)};},function(t,e,n){var r=n(9),o=n(39),i=n(59);t.exports=function(t){return function(e,n,a){var u,c=r(e),s=o(c.length),f=i(a,s);if(t&&n!=n){for(;s>f;)if((u=c[f++])!=u)return !0}else for(;s>f;f++)if((t||f in c)&&c[f]===n)return t||f||0;return !t&&-1}};},function(t,e,n){var r=n(20),o=Math.max,i=Math.min;t.exports=function(t,e){return (t=r(t))<0?o(t+e,0):i(t,e)};},function(t,e,n){var r=n(8),o=n(61),i=n(25)("IE_PROTO"),a=Object.prototype;t.exports=Object.getPrototypeOf||function(t){return t=o(t),r(t,i)?t[i]:"function"==typeof t.constructor&&t instanceof t.constructor?t.constructor.prototype:t instanceof Object?a:null};},function(t,e,n){var r=n(21);t.exports=function(t){return Object(r(t))};},function(t,e,n){var r=n(63),o=n(64),i=n(11),a=n(9);t.exports=n(34)(Array,"Array",function(t,e){this._t=a(t),this._i=0,this._k=e;},function(){var t=this._t,e=this._k,n=this._i++;return !t||n>=t.length?(this._t=void 0,o(1)):o(0,"keys"==e?n:"values"==e?t[n]:[n,t[n]])},"values"),i.Arguments=i.Array,r("keys"),r("values"),r("entries");},function(t,e){t.exports=function(){};},function(t,e){t.exports=function(t,e){return {value:e,done:!!t}};},function(t,e,n){t.exports={default:n(66),__esModule:!0};},function(t,e,n){n(67),n(44),n(73),n(74),t.exports=n(2).Symbol;},function(t,e,n){var r=n(0),o=n(8),i=n(7),a=n(10),u=n(36),c=n(68).KEY,s=n(16),f=n(26),l=n(19),p=n(18),d=n(1),h=n(28),g=n(29),m=n(69),v=n(70),y=n(3),_=n(6),w=n(9),S=n(23),x=n(17),b=n(37),P=n(71),E=n(72),I=n(5),A=n(24),O=E.f,T=I.f,F=P.f,L=r.Symbol,M=r.JSON,R=M&&M.stringify,j=d("_hidden"),k=d("toPrimitive"),D={}.propertyIsEnumerable,C=f("symbol-registry"),U=f("symbols"),N=f("op-symbols"),G=Object.prototype,V="function"==typeof L,B=r.QObject,H=!B||!B.prototype||!B.prototype.findChild,K=i&&s(function(){return 7!=b(T({},"a",{get:function(){return T(this,"a",{value:7}).a}})).a})?function(t,e,n){var r=O(G,e);r&&delete G[e],T(t,e,n),r&&t!==G&&T(G,e,r);}:T,W=function(t){var e=U[t]=b(L.prototype);return e._k=t,e},Y=V&&"symbol"==typeof L.iterator?function(t){return "symbol"==typeof t}:function(t){return t instanceof L},J=function(t,e,n){return t===G&&J(N,e,n),y(t),e=S(e,!0),y(n),o(U,e)?(n.enumerable?(o(t,j)&&t[j][e]&&(t[j][e]=!1),n=b(n,{enumerable:x(0,!1)})):(o(t,j)||T(t,j,x(1,{})),t[j][e]=!0),K(t,e,n)):T(t,e,n)},q=function(t,e){y(t);for(var n,r=m(e=w(e)),o=0,i=r.length;i>o;)J(t,n=r[o++],e[n]);return t},z=function(t){var e=D.call(this,t=S(t,!0));return !(this===G&&o(U,t)&&!o(N,t))&&(!(e||!o(this,t)||!o(U,t)||o(this,j)&&this[j][t])||e)},X=function(t,e){if(t=w(t),e=S(e,!0),t!==G||!o(U,e)||o(N,e)){var n=O(t,e);return !n||!o(U,e)||o(t,j)&&t[j][e]||(n.enumerable=!0),n}},Z=function(t){for(var e,n=F(w(t)),r=[],i=0;n.length>i;)o(U,e=n[i++])||e==j||e==c||r.push(e);return r},Q=function(t){for(var e,n=t===G,r=F(n?N:w(t)),i=[],a=0;r.length>a;)!o(U,e=r[a++])||n&&!o(G,e)||i.push(U[e]);return i};V||(u((L=function(){if(this instanceof L)throw TypeError("Symbol is not a constructor!");var t=p(arguments.length>0?arguments[0]:void 0),e=function(n){this===G&&e.call(N,n),o(this,j)&&o(this[j],t)&&(this[j][t]=!1),K(this,t,x(1,n));};return i&&H&&K(G,t,{configurable:!0,set:e}),W(t)}).prototype,"toString",function(){return this._k}),E.f=X,I.f=J,n(43).f=P.f=Z,n(30).f=z,n(42).f=Q,i&&!n(13)&&u(G,"propertyIsEnumerable",z,!0),h.f=function(t){return W(d(t))}),a(a.G+a.W+a.F*!V,{Symbol:L});for(var $="hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables".split(","),tt=0;$.length>tt;)d($[tt++]);for(var et=A(d.store),nt=0;et.length>nt;)g(et[nt++]);a(a.S+a.F*!V,"Symbol",{for:function(t){return o(C,t+="")?C[t]:C[t]=L(t)},keyFor:function(t){if(!Y(t))throw TypeError(t+" is not a symbol!");for(var e in C)if(C[e]===t)return e},useSetter:function(){H=!0;},useSimple:function(){H=!1;}}),a(a.S+a.F*!V,"Object",{create:function(t,e){return void 0===e?b(t):q(b(t),e)},defineProperty:J,defineProperties:q,getOwnPropertyDescriptor:X,getOwnPropertyNames:Z,getOwnPropertySymbols:Q}),M&&a(a.S+a.F*(!V||s(function(){var t=L();return "[null]"!=R([t])||"{}"!=R({a:t})||"{}"!=R(Object(t))})),"JSON",{stringify:function(t){for(var e,n,r=[t],o=1;arguments.length>o;)r.push(arguments[o++]);if(n=e=r[1],(_(e)||void 0!==t)&&!Y(t))return v(e)||(e=function(t,e){if("function"==typeof n&&(e=n.call(this,t,e)),!Y(e))return e}),r[1]=e,R.apply(M,r)}}),L.prototype[k]||n(4)(L.prototype,k,L.prototype.valueOf),l(L,"Symbol"),l(Math,"Math",!0),l(r.JSON,"JSON",!0);},function(t,e,n){var r=n(18)("meta"),o=n(6),i=n(8),a=n(5).f,u=0,c=Object.isExtensible||function(){return !0},s=!n(16)(function(){return c(Object.preventExtensions({}))}),f=function(t){a(t,r,{value:{i:"O"+ ++u,w:{}}});},l=t.exports={KEY:r,NEED:!1,fastKey:function(t,e){if(!o(t))return "symbol"==typeof t?t:("string"==typeof t?"S":"P")+t;if(!i(t,r)){if(!c(t))return "F";if(!e)return "E";f(t);}return t[r].i},getWeak:function(t,e){if(!i(t,r)){if(!c(t))return !0;if(!e)return !1;f(t);}return t[r].w},onFreeze:function(t){return s&&l.NEED&&c(t)&&!i(t,r)&&f(t),t}};},function(t,e,n){var r=n(24),o=n(42),i=n(30);t.exports=function(t){var e=r(t),n=o.f;if(n)for(var a,u=n(t),c=i.f,s=0;u.length>s;)c.call(t,a=u[s++])&&e.push(a);return e};},function(t,e,n){var r=n(12);t.exports=Array.isArray||function(t){return "Array"==r(t)};},function(t,e,n){var r=n(9),o=n(43).f,i={}.toString,a="object"==typeof window&&window&&Object.getOwnPropertyNames?Object.getOwnPropertyNames(window):[];t.exports.f=function(t){return a&&"[object Window]"==i.call(t)?function(t){try{return o(t)}catch(t){return a.slice()}}(t):o(r(t))};},function(t,e,n){var r=n(30),o=n(17),i=n(9),a=n(23),u=n(8),c=n(35),s=Object.getOwnPropertyDescriptor;e.f=n(7)?s:function(t,e){if(t=i(t),e=a(e,!0),c)try{return s(t,e)}catch(t){}if(u(t,e))return o(!r.f.call(t,e),t[e])};},function(t,e,n){n(29)("asyncIterator");},function(t,e,n){n(29)("observable");},function(t,e,n){t.exports=n(76);},function(t,e,n){var r=function(){return this}()||Function("return this")(),o=r.regeneratorRuntime&&Object.getOwnPropertyNames(r).indexOf("regeneratorRuntime")>=0,i=o&&r.regeneratorRuntime;if(r.regeneratorRuntime=void 0,t.exports=n(77),o)r.regeneratorRuntime=i;else try{delete r.regeneratorRuntime;}catch(t){r.regeneratorRuntime=void 0;}},function(t,e){!function(e){var n,r=Object.prototype,o=r.hasOwnProperty,i="function"==typeof Symbol?Symbol:{},a=i.iterator||"@@iterator",u=i.asyncIterator||"@@asyncIterator",c=i.toStringTag||"@@toStringTag",s="object"==typeof t,f=e.regeneratorRuntime;if(f)s&&(t.exports=f);else{(f=e.regeneratorRuntime=s?t.exports:{}).wrap=w;var l="suspendedStart",p="suspendedYield",d="executing",h="completed",g={},m={};m[a]=function(){return this};var v=Object.getPrototypeOf,y=v&&v(v(L([])));y&&y!==r&&o.call(y,a)&&(m=y);var _=P.prototype=x.prototype=Object.create(m);b.prototype=_.constructor=P,P.constructor=b,P[c]=b.displayName="GeneratorFunction",f.isGeneratorFunction=function(t){var e="function"==typeof t&&t.constructor;return !!e&&(e===b||"GeneratorFunction"===(e.displayName||e.name))},f.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,P):(t.__proto__=P,c in t||(t[c]="GeneratorFunction")),t.prototype=Object.create(_),t},f.awrap=function(t){return {__await:t}},E(I.prototype),I.prototype[u]=function(){return this},f.AsyncIterator=I,f.async=function(t,e,n,r){var o=new I(w(t,e,n,r));return f.isGeneratorFunction(e)?o:o.next().then(function(t){return t.done?t.value:o.next()})},E(_),_[c]="Generator",_[a]=function(){return this},_.toString=function(){return "[object Generator]"},f.keys=function(t){var e=[];for(var n in t)e.push(n);return e.reverse(),function n(){for(;e.length;){var r=e.pop();if(r in t)return n.value=r,n.done=!1,n}return n.done=!0,n}},f.values=L,F.prototype={constructor:F,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=n,this.done=!1,this.delegate=null,this.method="next",this.arg=n,this.tryEntries.forEach(T),!t)for(var e in this)"t"===e.charAt(0)&&o.call(this,e)&&!isNaN(+e.slice(1))&&(this[e]=n);},stop:function(){this.done=!0;var t=this.tryEntries[0].completion;if("throw"===t.type)throw t.arg;return this.rval},dispatchException:function(t){if(this.done)throw t;var e=this;function r(r,o){return u.type="throw",u.arg=t,e.next=r,o&&(e.method="next",e.arg=n),!!o}for(var i=this.tryEntries.length-1;i>=0;--i){var a=this.tryEntries[i],u=a.completion;if("root"===a.tryLoc)return r("end");if(a.tryLoc<=this.prev){var c=o.call(a,"catchLoc"),s=o.call(a,"finallyLoc");if(c&&s){if(this.prev<a.catchLoc)return r(a.catchLoc,!0);if(this.prev<a.finallyLoc)return r(a.finallyLoc)}else if(c){if(this.prev<a.catchLoc)return r(a.catchLoc,!0)}else{if(!s)throw new Error("try statement without catch or finally");if(this.prev<a.finallyLoc)return r(a.finallyLoc)}}}},abrupt:function(t,e){for(var n=this.tryEntries.length-1;n>=0;--n){var r=this.tryEntries[n];if(r.tryLoc<=this.prev&&o.call(r,"finallyLoc")&&this.prev<r.finallyLoc){var i=r;break}}i&&("break"===t||"continue"===t)&&i.tryLoc<=e&&e<=i.finallyLoc&&(i=null);var a=i?i.completion:{};return a.type=t,a.arg=e,i?(this.method="next",this.next=i.finallyLoc,g):this.complete(a)},complete:function(t,e){if("throw"===t.type)throw t.arg;return "break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&e&&(this.next=e),g},finish:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var n=this.tryEntries[e];if(n.finallyLoc===t)return this.complete(n.completion,n.afterLoc),T(n),g}},catch:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var n=this.tryEntries[e];if(n.tryLoc===t){var r=n.completion;if("throw"===r.type){var o=r.arg;T(n);}return o}}throw new Error("illegal catch attempt")},delegateYield:function(t,e,r){return this.delegate={iterator:L(t),resultName:e,nextLoc:r},"next"===this.method&&(this.arg=n),g}};}function w(t,e,n,r){var o=e&&e.prototype instanceof x?e:x,i=Object.create(o.prototype),a=new F(r||[]);return i._invoke=function(t,e,n){var r=l;return function(o,i){if(r===d)throw new Error("Generator is already running");if(r===h){if("throw"===o)throw i;return M()}for(n.method=o,n.arg=i;;){var a=n.delegate;if(a){var u=A(a,n);if(u){if(u===g)continue;return u}}if("next"===n.method)n.sent=n._sent=n.arg;else if("throw"===n.method){if(r===l)throw r=h,n.arg;n.dispatchException(n.arg);}else"return"===n.method&&n.abrupt("return",n.arg);r=d;var c=S(t,e,n);if("normal"===c.type){if(r=n.done?h:p,c.arg===g)continue;return {value:c.arg,done:n.done}}"throw"===c.type&&(r=h,n.method="throw",n.arg=c.arg);}}}(t,n,a),i}function S(t,e,n){try{return {type:"normal",arg:t.call(e,n)}}catch(t){return {type:"throw",arg:t}}}function x(){}function b(){}function P(){}function E(t){["next","throw","return"].forEach(function(e){t[e]=function(t){return this._invoke(e,t)};});}function I(t){var e;this._invoke=function(n,r){function i(){return new Promise(function(e,i){!function e(n,r,i,a){var u=S(t[n],t,r);if("throw"!==u.type){var c=u.arg,s=c.value;return s&&"object"==typeof s&&o.call(s,"__await")?Promise.resolve(s.__await).then(function(t){e("next",t,i,a);},function(t){e("throw",t,i,a);}):Promise.resolve(s).then(function(t){c.value=t,i(c);},a)}a(u.arg);}(n,r,e,i);})}return e=e?e.then(i,i):i()};}function A(t,e){var r=t.iterator[e.method];if(r===n){if(e.delegate=null,"throw"===e.method){if(t.iterator.return&&(e.method="return",e.arg=n,A(t,e),"throw"===e.method))return g;e.method="throw",e.arg=new TypeError("The iterator does not provide a 'throw' method");}return g}var o=S(r,t.iterator,e.arg);if("throw"===o.type)return e.method="throw",e.arg=o.arg,e.delegate=null,g;var i=o.arg;return i?i.done?(e[t.resultName]=i.value,e.next=t.nextLoc,"return"!==e.method&&(e.method="next",e.arg=n),e.delegate=null,g):i:(e.method="throw",e.arg=new TypeError("iterator result is not an object"),e.delegate=null,g)}function O(t){var e={tryLoc:t[0]};1 in t&&(e.catchLoc=t[1]),2 in t&&(e.finallyLoc=t[2],e.afterLoc=t[3]),this.tryEntries.push(e);}function T(t){var e=t.completion||{};e.type="normal",delete e.arg,t.completion=e;}function F(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(O,this),this.reset(!0);}function L(t){if(t){var e=t[a];if(e)return e.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var r=-1,i=function e(){for(;++r<t.length;)if(o.call(t,r))return e.value=t[r],e.done=!1,e;return e.value=n,e.done=!0,e};return i.next=i}}return {next:M}}function M(){return {value:n,done:!0}}}(function(){return this}()||Function("return this")());},function(t,e,n){e.__esModule=!0;var r,o=n(31),i=(r=o)&&r.__esModule?r:{default:r};e.default=function(t){return function(){var e=t.apply(this,arguments);return new i.default(function(t,n){return function r(o,a){try{var u=e[o](a),c=u.value;}catch(t){return void n(t)}if(!u.done)return i.default.resolve(c).then(function(t){r("next",t);},function(t){r("throw",t);});t(c);}("next")})}};},function(t,e,n){n(44),n(33),n(41),n(80),n(91),n(92),t.exports=n(2).Promise;},function(t,e,n){var r,o,i,a,u=n(13),c=n(0),s=n(14),f=n(45),l=n(10),p=n(6),d=n(15),h=n(81),g=n(82),m=n(46),v=n(47).set,y=n(87)(),_=n(32),w=n(48),S=n(49),x=c.TypeError,b=c.process,P=c.Promise,E="process"==f(b),I=function(){},A=o=_.f,O=!!function(){try{var t=P.resolve(1),e=(t.constructor={})[n(1)("species")]=function(t){t(I,I);};return (E||"function"==typeof PromiseRejectionEvent)&&t.then(I)instanceof e}catch(t){}}(),T=function(t){var e;return !(!p(t)||"function"!=typeof(e=t.then))&&e},F=function(t,e){if(!t._n){t._n=!0;var n=t._c;y(function(){for(var r=t._v,o=1==t._s,i=0,a=function(e){var n,i,a=o?e.ok:e.fail,u=e.resolve,c=e.reject,s=e.domain;try{a?(o||(2==t._h&&R(t),t._h=1),!0===a?n=r:(s&&s.enter(),n=a(r),s&&s.exit()),n===e.promise?c(x("Promise-chain cycle")):(i=T(n))?i.call(n,u,c):u(n)):c(r);}catch(t){c(t);}};n.length>i;)a(n[i++]);t._c=[],t._n=!1,e&&!t._h&&L(t);});}},L=function(t){v.call(c,function(){var e,n,r,o=t._v,i=M(t);if(i&&(e=w(function(){E?b.emit("unhandledRejection",o,t):(n=c.onunhandledrejection)?n({promise:t,reason:o}):(r=c.console)&&r.error&&r.error("Unhandled promise rejection",o);}),t._h=E||M(t)?2:1),t._a=void 0,i&&e.e)throw e.v});},M=function(t){return 1!==t._h&&0===(t._a||t._c).length},R=function(t){v.call(c,function(){var e;E?b.emit("rejectionHandled",t):(e=c.onrejectionhandled)&&e({promise:t,reason:t._v});});},j=function(t){var e=this;e._d||(e._d=!0,(e=e._w||e)._v=t,e._s=2,e._a||(e._a=e._c.slice()),F(e,!0));},k=function(t){var e,n=this;if(!n._d){n._d=!0,n=n._w||n;try{if(n===t)throw x("Promise can't be resolved itself");(e=T(t))?y(function(){var r={_w:n,_d:!1};try{e.call(t,s(k,r,1),s(j,r,1));}catch(t){j.call(r,t);}}):(n._v=t,n._s=1,F(n,!1));}catch(t){j.call({_w:n,_d:!1},t);}}};O||(P=function(t){h(this,P,"Promise","_h"),d(t),r.call(this);try{t(s(k,this,1),s(j,this,1));}catch(t){j.call(this,t);}},(r=function(t){this._c=[],this._a=void 0,this._s=0,this._d=!1,this._v=void 0,this._h=0,this._n=!1;}).prototype=n(88)(P.prototype,{then:function(t,e){var n=A(m(this,P));return n.ok="function"!=typeof t||t,n.fail="function"==typeof e&&e,n.domain=E?b.domain:void 0,this._c.push(n),this._a&&this._a.push(n),this._s&&F(this,!1),n.promise},catch:function(t){return this.then(void 0,t)}}),i=function(){var t=new r;this.promise=t,this.resolve=s(k,t,1),this.reject=s(j,t,1);},_.f=A=function(t){return t===P||t===a?new i(t):o(t)}),l(l.G+l.W+l.F*!O,{Promise:P}),n(19)(P,"Promise"),n(89)("Promise"),a=n(2).Promise,l(l.S+l.F*!O,"Promise",{reject:function(t){var e=A(this);return (0, e.reject)(t),e.promise}}),l(l.S+l.F*(u||!O),"Promise",{resolve:function(t){return S(u&&this===a?P:this,t)}}),l(l.S+l.F*!(O&&n(90)(function(t){P.all(t).catch(I);})),"Promise",{all:function(t){var e=this,n=A(e),r=n.resolve,o=n.reject,i=w(function(){var n=[],i=0,a=1;g(t,!1,function(t){var u=i++,c=!1;n.push(void 0),a++,e.resolve(t).then(function(t){c||(c=!0,n[u]=t,--a||r(n));},o);}),--a||r(n);});return i.e&&o(i.v),n.promise},race:function(t){var e=this,n=A(e),r=n.reject,o=w(function(){g(t,!1,function(t){e.resolve(t).then(n.resolve,r);});});return o.e&&r(o.v),n.promise}});},function(t,e){t.exports=function(t,e,n,r){if(!(t instanceof e)||void 0!==r&&r in t)throw TypeError(n+": incorrect invocation!");return t};},function(t,e,n){var r=n(14),o=n(83),i=n(84),a=n(3),u=n(39),c=n(85),s={},f={};(e=t.exports=function(t,e,n,l,p){var d,h,g,m,v=p?function(){return t}:c(t),y=r(n,l,e?2:1),_=0;if("function"!=typeof v)throw TypeError(t+" is not iterable!");if(i(v)){for(d=u(t.length);d>_;_++)if((m=e?y(a(h=t[_])[0],h[1]):y(t[_]))===s||m===f)return m}else for(g=v.call(t);!(h=g.next()).done;)if((m=o(g,y,h.value,e))===s||m===f)return m}).BREAK=s,e.RETURN=f;},function(t,e,n){var r=n(3);t.exports=function(t,e,n,o){try{return o?e(r(n)[0],n[1]):e(n)}catch(e){var i=t.return;throw void 0!==i&&r(i.call(t)),e}};},function(t,e,n){var r=n(11),o=n(1)("iterator"),i=Array.prototype;t.exports=function(t){return void 0!==t&&(r.Array===t||i[o]===t)};},function(t,e,n){var r=n(45),o=n(1)("iterator"),i=n(11);t.exports=n(2).getIteratorMethod=function(t){if(void 0!=t)return t[o]||t["@@iterator"]||i[r(t)]};},function(t,e){t.exports=function(t,e,n){var r=void 0===n;switch(e.length){case 0:return r?t():t.call(n);case 1:return r?t(e[0]):t.call(n,e[0]);case 2:return r?t(e[0],e[1]):t.call(n,e[0],e[1]);case 3:return r?t(e[0],e[1],e[2]):t.call(n,e[0],e[1],e[2]);case 4:return r?t(e[0],e[1],e[2],e[3]):t.call(n,e[0],e[1],e[2],e[3])}return t.apply(n,e)};},function(t,e,n){var r=n(0),o=n(47).set,i=r.MutationObserver||r.WebKitMutationObserver,a=r.process,u=r.Promise,c="process"==n(12)(a);t.exports=function(){var t,e,n,s=function(){var r,o;for(c&&(r=a.domain)&&r.exit();t;){o=t.fn,t=t.next;try{o();}catch(r){throw t?n():e=void 0,r}}e=void 0,r&&r.enter();};if(c)n=function(){a.nextTick(s);};else if(!i||r.navigator&&r.navigator.standalone)if(u&&u.resolve){var f=u.resolve();n=function(){f.then(s);};}else n=function(){o.call(r,s);};else{var l=!0,p=document.createTextNode("");new i(s).observe(p,{characterData:!0}),n=function(){p.data=l=!l;};}return function(r){var o={fn:r,next:void 0};e&&(e.next=o),t||(t=o,n()),e=o;}};},function(t,e,n){var r=n(4);t.exports=function(t,e,n){for(var o in e)n&&t[o]?t[o]=e[o]:r(t,o,e[o]);return t};},function(t,e,n){var r=n(0),o=n(2),i=n(5),a=n(7),u=n(1)("species");t.exports=function(t){var e="function"==typeof o[t]?o[t]:r[t];a&&e&&!e[u]&&i.f(e,u,{configurable:!0,get:function(){return this}});};},function(t,e,n){var r=n(1)("iterator"),o=!1;try{var i=[7][r]();i.return=function(){o=!0;},Array.from(i,function(){throw 2});}catch(t){}t.exports=function(t,e){if(!e&&!o)return !1;var n=!1;try{var i=[7],a=i[r]();a.next=function(){return {done:n=!0}},i[r]=function(){return a},t(i);}catch(t){}return n};},function(t,e,n){var r=n(10),o=n(2),i=n(0),a=n(46),u=n(49);r(r.P+r.R,"Promise",{finally:function(t){var e=a(this,o.Promise||i.Promise),n="function"==typeof t;return this.then(n?function(n){return u(e,t()).then(function(){return n})}:t,n?function(n){return u(e,t()).then(function(){throw n})}:t)}});},function(t,e,n){var r=n(10),o=n(32),i=n(48);r(r.S,"Promise",{try:function(t){var e=o.f(this),n=i(t);return (n.e?e.reject:e.resolve)(n.v),e.promise}});},function(t,e,n){Object.defineProperty(e,"__esModule",{value:!0});var r,o=n(31),i=(r=o)&&r.__esModule?r:{default:r},a=n(94);e.default=function(t){return new i.default(function(e,n){try{var r=new a.ExifReader;r.load(t),e(r.getAllTags());}catch(t){"No Exif data"===t.message?e({}):n(t);}})};},function(t,e,n){(function(){(void 0!==e&&null!==e?e:this).ExifReader=function(){function t(){var t=this;this._getTagValueAt={1:function(e){return t._getByteAt(e)},2:function(e){return t._getAsciiAt(e)},3:function(e){return t._getShortAt(e)},4:function(e){return t._getLongAt(e)},5:function(e){return t._getRationalAt(e)},7:function(e){return t._getUndefinedAt(e)},9:function(e){return t._getSlongAt(e)},10:function(e){return t._getSrationalAt(e)}},this._tiffHeaderOffset=0;}return t.prototype._MIN_DATA_BUFFER_LENGTH=2,t.prototype._JPEG_ID_SIZE=2,t.prototype._JPEG_ID=65496,t.prototype._APP_MARKER_SIZE=2,t.prototype._APP0_MARKER=65504,t.prototype._APP1_MARKER=65505,t.prototype._APP15_MARKER=65519,t.prototype._APP_ID_OFFSET=4,t.prototype._BYTES_Exif=1165519206,t.prototype._TIFF_HEADER_OFFSET=10,t.prototype._BYTE_ORDER_BIG_ENDIAN=18761,t.prototype._BYTE_ORDER_LITTLE_ENDIAN=19789,t.prototype.load=function(t){return this.loadView(new DataView(t))},t.prototype.loadView=function(t){return this._dataView=t,this._tags={},this._checkImageHeader(),this._readTags(),this._dataView=null},t.prototype._checkImageHeader=function(){if(this._dataView.byteLength<this._MIN_DATA_BUFFER_LENGTH||this._dataView.getUint16(0,!1)!==this._JPEG_ID)throw new Error("Invalid image format");if(this._parseAppMarkers(this._dataView),!this._hasExifData())throw new Error("No Exif data")},t.prototype._parseAppMarkers=function(t){var e,n,r;for(e=this._JPEG_ID_SIZE,r=[];!(t.byteLength<e+this._APP_ID_OFFSET+5);){if(this._isApp1ExifMarker(t,e))n=t.getUint16(e+this._APP_MARKER_SIZE,!1),this._tiffHeaderOffset=e+this._TIFF_HEADER_OFFSET;else{if(!this._isAppMarker(t,e))break;n=t.getUint16(e+this._APP_MARKER_SIZE,!1);}r.push(e+=this._APP_MARKER_SIZE+n);}return r},t.prototype._isApp1ExifMarker=function(t,e){return t.getUint16(e,!1)===this._APP1_MARKER&&t.getUint32(e+this._APP_ID_OFFSET,!1)===this._BYTES_Exif&&0===t.getUint8(e+this._APP_ID_OFFSET+4,!1)},t.prototype._isAppMarker=function(t,e){var n=t.getUint16(e,!1);return n>=this._APP0_MARKER&&n<=this._APP15_MARKER},t.prototype._hasExifData=function(){return 0!==this._tiffHeaderOffset},t.prototype._readTags=function(){return this._setByteOrder(),this._read0thIfd(),this._readExifIfd(),this._readGpsIfd(),this._readInteroperabilityIfd()},t.prototype._setByteOrder=function(){if(this._dataView.getUint16(this._tiffHeaderOffset)===this._BYTE_ORDER_BIG_ENDIAN)return this._littleEndian=!0;if(this._dataView.getUint16(this._tiffHeaderOffset)===this._BYTE_ORDER_LITTLE_ENDIAN)return this._littleEndian=!1;throw new Error("Illegal byte order value. Faulty image.")},t.prototype._read0thIfd=function(){var t=this._getIfdOffset();return this._readIfd("0th",t)},t.prototype._getIfdOffset=function(){return this._tiffHeaderOffset+this._getLongAt(this._tiffHeaderOffset+4)},t.prototype._readExifIfd=function(){var t;if(null!=this._tags["Exif IFD Pointer"])return t=this._tiffHeaderOffset+this._tags["Exif IFD Pointer"].value,this._readIfd("exif",t)},t.prototype._readGpsIfd=function(){var t;if(null!=this._tags["GPS Info IFD Pointer"])return t=this._tiffHeaderOffset+this._tags["GPS Info IFD Pointer"].value,this._readIfd("gps",t)},t.prototype._readInteroperabilityIfd=function(){var t;if(null!=this._tags["Interoperability IFD Pointer"])return t=this._tiffHeaderOffset+this._tags["Interoperability IFD Pointer"].value,this._readIfd("interoperability",t)},t.prototype._readIfd=function(t,e){var n,r,o,i;for(n=this._getShortAt(e),e+=2,i=[],o=0;0<=n?o<n:o>n;0<=n?++o:--o)void 0!==(r=this._readTag(t,e))&&(this._tags[r.name]={value:r.value,description:r.description}),i.push(e+=12);return i},t.prototype._readTag=function(t,e){var n,r,o,i,a,u,c;if(n=this._getShortAt(e),a=this._getShortAt(e+2),r=this._getLongAt(e+4),void 0!==this._typeSizes[a])return this._typeSizes[a]*r<=4?u=this._getTagValue(e+8,a,r):(c=this._getLongAt(e+8),u=this._getTagValue(this._tiffHeaderOffset+c,a,r)),a===this._tagTypes.ASCII&&(u=this._splitNullSeparatedAsciiString(u)),null!=this._tagNames[t][n]?(null!=this._tagNames[t][n].name&&null!=this._tagNames[t][n].description?(i=this._tagNames[t][n].name,o=this._tagNames[t][n].description(u)):(i=this._tagNames[t][n],o=u instanceof Array?u.join(", "):u),{name:i,value:u,description:o}):{name:"undefined-"+n,value:u,description:u}},t.prototype._getTagValue=function(t,e,n){var r,o;return 1===(o=function(){var o,i;for(i=[],o=0;0<=n?o<n:o>n;0<=n?++o:--o)r=this._getTagValueAt[e](t),t+=this._typeSizes[e],i.push(r);return i}.call(this)).length?o=o[0]:e===this._tagTypes.ASCII&&(o=this._getAsciiValue(o)),o},t.prototype._getAsciiValue=function(t){var e;return function(){var n,r,o;for(o=[],n=0,r=t.length;n<r;n++)e=t[n],o.push(String.fromCharCode(e));return o}()},t.prototype._getByteAt=function(t){return this._dataView.getUint8(t)},t.prototype._getAsciiAt=function(t){return this._dataView.getUint8(t)},t.prototype._getShortAt=function(t){return this._dataView.getUint16(t,this._littleEndian)},t.prototype._getLongAt=function(t){return this._dataView.getUint32(t,this._littleEndian)},t.prototype._getRationalAt=function(t){return this._getLongAt(t)/this._getLongAt(t+4)},t.prototype._getUndefinedAt=function(t){return this._getByteAt(t)},t.prototype._getSlongAt=function(t){return this._dataView.getInt32(t,this._littleEndian)},t.prototype._getSrationalAt=function(t){return this._getSlongAt(t)/this._getSlongAt(t+4)},t.prototype._splitNullSeparatedAsciiString=function(t){var e,n,r,o,i;for(r=[],n=0,o=0,i=t.length;o<i;o++)"\0"!==(e=t[o])?(null==r[n]&&(r[n]=""),r[n]+=e):n++;return r},t.prototype._typeSizes={1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8},t.prototype._tagTypes={BYTE:1,ASCII:2,SHORT:3,LONG:4,RATIONAL:5,UNDEFINED:7,SLONG:9,SRATIONAL:10},t.prototype._tagNames={"0th":{256:"ImageWidth",257:"ImageLength",258:"BitsPerSample",259:"Compression",262:"PhotometricInterpretation",270:"ImageDescription",271:"Make",272:"Model",273:"StripOffsets",274:{name:"Orientation",description:function(t){switch(t){case 1:return "top-left";case 2:return "top-right";case 3:return "bottom-right";case 4:return "bottom-left";case 5:return "left-top";case 6:return "right-top";case 7:return "right-bottom";case 8:return "left-bottom";default:return "Undefined"}}},277:"SamplesPerPixel",278:"RowsPerStrip",279:"StripByteCounts",282:"XResolution",283:"YResolution",284:"PlanarConfiguration",296:{name:"ResolutionUnit",description:function(t){switch(t){case 2:return "inches";case 3:return "centimeters";default:return "Unknown"}}},301:"TransferFunction",305:"Software",306:"DateTime",315:"Artist",318:"WhitePoint",319:"PrimaryChromaticities",513:"JPEGInterchangeFormat",514:"JPEGInterchangeFormatLength",529:"YCbCrCoefficients",530:"YCbCrSubSampling",531:{name:"YCbCrPositioning",description:function(t){switch(t){case 1:return "centered";case 2:return "co-sited";default:return "undefied "+t}}},532:"ReferenceBlackWhite",33432:{name:"Copyright",description:function(t){return t.join("; ")}},34665:"Exif IFD Pointer",34853:"GPS Info IFD Pointer"},exif:{33434:"ExposureTime",33437:"FNumber",34850:{name:"ExposureProgram",description:function(t){switch(t){case 0:return "Undefined";case 1:return "Manual";case 2:return "Normal program";case 3:return "Aperture priority";case 4:return "Shutter priority";case 5:return "Creative program";case 6:return "Action program";case 7:return "Portrait mode";case 8:return "Landscape mode";default:return "Unknown"}}},34852:"SpectralSensitivity",34855:"ISOSpeedRatings",34856:{name:"OECF",description:function(){return "[Raw OECF table data]"}},36864:{name:"ExifVersion",description:function(t){var e,n,r,o;for(n="",r=0,o=t.length;r<o;r++)e=t[r],n+=String.fromCharCode(e);return n}},36867:"DateTimeOriginal",36868:"DateTimeDigitized",37121:{name:"ComponentsConfiguration",description:function(t){var e,n,r;for(e="",n=0,r=t.length;n<r;n++)switch(t[n]){case 49:e+="Y";break;case 50:e+="Cb";break;case 51:e+="Cr";break;case 52:e+="R";break;case 53:e+="G";break;case 54:e+="B";}return e}},37122:"CompressedBitsPerPixel",37377:"ShutterSpeedValue",37378:"ApertureValue",37379:"BrightnessValue",37380:"ExposureBiasValue",37381:"MaxApertureValue",37382:"SubjectDistance",37383:{name:"MeteringMode",description:function(t){switch(t){case 1:return "Average";case 2:return "CenterWeightedAverage";case 3:return "Spot";case 4:return "MultiSpot";case 5:return "Pattern";case 6:return "Partial";case 255:return "Other";default:return "Unknown"}}},37384:{name:"LightSource",description:function(t){switch(t){case 1:return "Daylight";case 2:return "Fluorescent";case 3:return "Tungsten (incandescent light)";case 4:return "Flash";case 9:return "Fine weather";case 10:return "Cloudy weather";case 11:return "Shade";case 12:return "Daylight fluorescent (D 5700 – 7100K)";case 13:return "Day white fluorescent (N 4600 – 5400K)";case 14:return "Cool white fluorescent (W 3900 – 4500K)";case 15:return "White fluorescent (WW 3200 – 3700K)";case 17:return "Standard light A";case 18:return "Standard light B";case 19:return "Standard light C";case 20:return "D55";case 21:return "D65";case 22:return "D75";case 23:return "D50";case 24:return "ISO studio tungsten";case 255:return "Other light source";default:return "Unknown"}}},37385:{name:"Flash",description:function(t){switch(t){case 0:return "Flash did not fire";case 1:return "Flash fired";case 5:return "Strobe return light not detected";case 7:return "Strobe return light detected";case 9:return "Flash fired, compulsory flash mode";case 13:return "Flash fired, compulsory flash mode, return light not detected";case 15:return "Flash fired, compulsory flash mode, return light detected";case 16:return "Flash did not fire, compulsory flash mode";case 24:return "Flash did not fire, auto mode";case 25:return "Flash fired, auto mode";case 29:return "Flash fired, auto mode, return light not detected";case 31:return "Flash fired, auto mode, return light detected";case 32:return "No flash function";case 65:return "Flash fired, red-eye reduction mode";case 69:return "Flash fired, red-eye reduction mode, return light not detected";case 71:return "Flash fired, red-eye reduction mode, return light detected";case 73:return "Flash fired, compulsory flash mode, red-eye reduction mode";case 77:return "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected";case 79:return "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected";case 89:return "Flash fired, auto mode, red-eye reduction mode";case 93:return "Flash fired, auto mode, return light not detected, red-eye reduction mode";case 95:return "Flash fired, auto mode, return light detected, red-eye reduction mode";default:return "Unknown"}}},37386:"FocalLength",37396:{name:"SubjectArea",description:function(t){switch(t.length){case 2:return "Location; X: "+t[0]+", Y: "+t[1];case 3:return "Circle; X: "+t[0]+", Y: "+t[1]+", diameter: "+t[2];case 4:return "Rectangle; X: "+t[0]+", Y: "+t[1]+", width: "+t[2]+", height: "+t[3];default:return "Unknown"}}},37500:{name:"MakerNote",description:function(){return "[Raw maker note data]"}},37510:{name:"UserComment",description:function(t){switch(t.slice(0,8).map(function(t){return String.fromCharCode(t)}).join("")){case"ASCII\0\0\0":return t.slice(8,t.length).map(function(t){return String.fromCharCode(t)}).join("");case"JIS\0\0\0\0\0":return "[JIS encoded text]";case"UNICODE\0":return "[Unicode encoded text]";case"\0\0\0\0\0\0\0\0":return "[Undefined encoding]"}}},37520:"SubSecTime",37521:"SubSecTimeOriginal",37522:"SubSecTimeDigitized",40960:{name:"FlashpixVersion",description:function(t){var e,n,r,o;for(n="",r=0,o=t.length;r<o;r++)e=t[r],n+=String.fromCharCode(e);return n}},40961:{name:"ColorSpace",description:function(t){switch(t){case 1:return "sRGB";case 65535:return "Uncalibrated";default:return "Unknown"}}},40962:"PixelXDimension",40963:"PixelYDimension",40964:"RelatedSoundFile",40965:"Interoperability IFD Pointer",41483:"FlashEnergy",41484:{name:"SpatialFrequencyResponse",description:function(){return "[Raw SFR table data]"}},41486:"FocalPlaneXResolution",41487:"FocalPlaneYResolution",41488:{name:"FocalPlaneResolutionUnit",description:function(t){switch(t){case 2:return "inches";case 3:return "centimeters";default:return "Unknown"}}},41492:{name:"SubjectLocation",description:function(t){return "X: "+t[0]+", Y: "+t[1]}},41493:"ExposureIndex",41495:{name:"SensingMethod",description:function(t){switch(t){case 1:return "Undefined";case 2:return "One-chip color area sensor";case 3:return "Two-chip color area sensor";case 4:return "Three-chip color area sensor";case 5:return "Color sequential area sensor";case 7:return "Trilinear sensor";case 8:return "Color sequential linear sensor";default:return "Unknown"}}},41728:{name:"FileSource",description:function(t){switch(t){case 3:return "DSC";default:return "Unknown"}}},41729:{name:"SceneType",description:function(t){switch(t){case 1:return "A directly photographed image";default:return "Unknown"}}},41730:{name:"CFAPattern",description:function(){return "[Raw CFA pattern table data]"}},41985:{name:"CustomRendered",description:function(t){switch(t){case 0:return "Normal process";case 1:return "Custom process";default:return "Unknown"}}},41986:{name:"ExposureMode",description:function(t){switch(t){case 0:return "Auto exposure";case 1:return "Manual exposure";case 2:return "Auto bracket";default:return "Unknown"}}},41987:{name:"WhiteBalance",description:function(t){switch(t){case 0:return "Auto white balance";case 1:return "Manual white balance";default:return "Unknown"}}},41988:{name:"DigitalZoomRatio",description:function(t){switch(t){case 0:return "Digital zoom was not used";default:return t}}},41989:{name:"FocalLengthIn35mmFilm",description:function(t){switch(t){case 0:return "Unknown";default:return t}}},41990:{name:"SceneCaptureType",description:function(t){switch(t){case 0:return "Standard";case 1:return "Landscape";case 2:return "Portrait";case 3:return "Night scene";default:return "Unknown"}}},41991:{name:"GainControl",description:function(t){switch(t){case 0:return "None";case 1:return "Low gain up";case 2:return "High gain up";case 3:return "Low gain down";case 4:return "High gain down";default:return "Unknown"}}},41992:{name:"Contrast",description:function(t){switch(t){case 0:return "Normal";case 1:return "Soft";case 2:return "Hard";default:return "Unknown"}}},41993:{name:"Saturation",description:function(t){switch(t){case 0:return "Normal";case 1:return "Low saturation";case 2:return "High saturation";default:return "Unknown"}}},41994:{name:"Sharpness",description:function(t){switch(t){case 0:return "Normal";case 1:return "Soft";case 2:return "Hard";default:return "Unknown"}}},41995:{name:"DeviceSettingDescription",description:function(){return "[Raw device settings table data]"}},41996:{name:"SubjectDistanceRange",description:function(t){switch(t){case 1:return "Macro";case 2:return "Close view";case 3:return "Distant view";default:return "Unknown"}}},42016:"ImageUniqueID"},gps:{0:{name:"GPSVersionID",description:function(t){var e,n;return t[0]===(e=t[1])&&2===e&&t[2]===(n=t[3])&&0===n?"Version 2.2":"Unknown"}},1:{name:"GPSLatitudeRef",description:function(t){switch(t.join("")){case"N":return "North latitude";case"S":return "South latitude";default:return "Unknown"}}},2:{name:"GPSLatitude",description:function(t){return t[0]+t[1]/60+t[2]/3600}},3:{name:"GPSLongitudeRef",description:function(t){switch(t.join("")){case"E":return "East longitude";case"W":return "West longitude";default:return "Unknown"}}},4:{name:"GPSLongitude",description:function(t){return t[0]+t[1]/60+t[2]/3600}},5:{name:"GPSAltitudeRef",description:function(t){switch(t){case 0:return "Sea level";case 1:return "Sea level reference (negative value)";default:return "Unknown"}}},6:{name:"GPSAltitude",description:function(t){return t+" m"}},7:{name:"GPSTimeStamp",description:function(t){return t.map(function(t){return function(){var e,n,r;for(r=[],e=0,n=2-(""+Math.floor(t)).length;0<=n?e<n:e>n;0<=n?++e:--e)r.push("0");return r}()+t}).join(":")}},8:"GPSSatellites",9:{name:"GPSStatus",description:function(t){switch(t.join("")){case"A":return "Measurement in progress";case"V":return "Measurement Interoperability";default:return "Unknown"}}},10:{name:"GPSMeasureMode",description:function(t){switch(t.join("")){case"2":return "2-dimensional measurement";case"3":return "3-dimensional measurement";default:return "Unknown"}}},11:"GPSDOP",12:{name:"GPSSpeedRef",description:function(t){switch(t.join("")){case"K":return "Kilometers per hour";case"M":return "Miles per hour";case"N":return "Knots";default:return "Unknown"}}},13:"GPSSpeed",14:{name:"GPSTrackRef",description:function(t){switch(t.join("")){case"T":return "True direction";case"M":return "Magnetic direction";default:return "Unknown"}}},15:"GPSTrack",16:{name:"GPSImgDirectionRef",description:function(t){switch(t.join("")){case"T":return "True direction";case"M":return "Magnetic direction";default:return "Unknown"}}},17:"GPSImgDirection",18:"GPSMapDatum",19:{name:"GPSDestLatitudeRef",description:function(t){switch(t.join("")){case"N":return "North latitude";case"S":return "South latitude";default:return "Unknown"}}},20:{name:"GPSDestLatitude",description:function(t){return t[0]+t[1]/60+t[2]/3600}},21:{name:"GPSDestLongitudeRef",description:function(t){switch(t.join("")){case"E":return "East longitude";case"W":return "West longitude";default:return "Unknown"}}},22:{name:"GPSDestLongitude",description:function(t){return t[0]+t[1]/60+t[2]/3600}},23:{name:"GPSDestBearingRef",description:function(t){switch(t.join("")){case"T":return "True direction";case"M":return "Magnetic direction";default:return "Unknown"}}},24:"GPSDestBearing",25:{name:"GPSDestDistanceRef",description:function(t){switch(t.join("")){case"K":return "Kilometers";case"M":return "Miles";case"N":return "Knots";default:return "Unknown"}}},26:"GPSDestDistance",27:{name:"GPSProcessingMethod",description:function(t){if(0===t)return "Undefined";switch(t.slice(0,8).map(function(t){return String.fromCharCode(t)}).join("")){case"ASCII\0\0\0":return t.slice(8,t.length).map(function(t){return String.fromCharCode(t)}).join("");case"JIS\0\0\0\0\0":return "[JIS encoded text]";case"UNICODE\0":return "[Unicode encoded text]";case"\0\0\0\0\0\0\0\0":return "[Undefined encoding]"}}},28:{name:"GPSAreaInformation",description:function(t){if(0===t)return "Undefined";switch(t.slice(0,8).map(function(t){return String.fromCharCode(t)}).join("")){case"ASCII\0\0\0":return t.slice(8,t.length).map(function(t){return String.fromCharCode(t)}).join("");case"JIS\0\0\0\0\0":return "[JIS encoded text]";case"UNICODE\0":return "[Unicode encoded text]";case"\0\0\0\0\0\0\0\0":return "[Undefined encoding]"}}},29:"GPSDateStamp",30:{name:"GPSDifferential",description:function(t){switch(t){case 0:return "Measurement without differential correction";case 1:return "Differential correction applied";default:return "Unknown"}}}},interoperability:{1:"InteroperabilityIndex",2:"UnknownInteroperabilityTag0x0002",4097:"UnknownInteroperabilityTag0x1001",4098:"UnknownInteroperabilityTag0x1002"}},t.prototype.getTagValue=function(t){return null!=this._tags[t]?this._tags[t].value:void 0},t.prototype.getTagDescription=function(t){return null!=this._tags[t]?this._tags[t].description:void 0},t.prototype.getAllTags=function(){return this._tags},t.prototype.deleteTag=function(t){return delete this._tags[t]},t}();}).call(void 0);}])});
    });

    var resizer = unwrapExports(bundle);

    /* src/Pele.svelte generated by Svelte v3.8.1 */

    const file = "src/Pele.svelte";

    // (72:0) {#if urlObject}
    function create_if_block_3(ctx) {
    	var img;

    	return {
    		c: function create() {
    			img = element("img");
    			attr(img, "id", "frame");
    			attr(img, "alt", "ok");
    			attr(img, "src", ctx.urlObject);
    			attr(img, "class", "svelte-11dsd4");
    			add_location(img, file, 71, 15, 1631);
    		},

    		m: function mount(target, anchor) {
    			insert(target, img, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.urlObject) {
    				attr(img, "src", ctx.urlObject);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(img);
    			}
    		}
    	};
    }

    // (81:0) {:else}
    function create_else_block(ctx) {
    	var t, if_block1_anchor;

    	var if_block0 = (ctx.colorFound1) && create_if_block_2(ctx);

    	var if_block1 = (ctx.colorFound2) && create_if_block_1(ctx);

    	return {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, if_block1_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (ctx.colorFound1) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (ctx.colorFound2) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);

    			if (detaching) {
    				detach(t);
    			}

    			if (if_block1) if_block1.d(detaching);

    			if (detaching) {
    				detach(if_block1_anchor);
    			}
    		}
    	};
    }

    // (79:0) {#if processingImg}
    function create_if_block(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("..processando imagem...");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (82:2) {#if colorFound1}
    function create_if_block_2(ctx) {
    	var div, t0_value = ctx.colorFound1.name + "", t0, t1, t2_value = ctx.colorFound1.value + "", t2;

    	return {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			set_style(div, "background", ctx.colorFound1.value);
    			add_location(div, file, 82, 2, 1916);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			append(div, t2);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.colorFound1) && t0_value !== (t0_value = ctx.colorFound1.name + "")) {
    				set_data(t0, t0_value);
    			}

    			if ((changed.colorFound1) && t2_value !== (t2_value = ctx.colorFound1.value + "")) {
    				set_data(t2, t2_value);
    			}

    			if (changed.colorFound1) {
    				set_style(div, "background", ctx.colorFound1.value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    // (85:2) {#if colorFound2}
    function create_if_block_1(ctx) {
    	var div, t0_value = ctx.colorFound2.name + "", t0, t1, t2_value = ctx.colorFound2.value + "", t2;

    	return {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			set_style(div, "background", ctx.colorFound2.value);
    			add_location(div, file, 85, 2, 2038);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			append(div, t2);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.colorFound2) && t0_value !== (t0_value = ctx.colorFound2.name + "")) {
    				set_data(t0, t0_value);
    			}

    			if ((changed.colorFound2) && t2_value !== (t2_value = ctx.colorFound2.value + "")) {
    				set_data(t2, t2_value);
    			}

    			if (changed.colorFound2) {
    				set_style(div, "background", ctx.colorFound2.value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    function create_fragment(ctx) {
    	var div2, div0, t0, div1, h1, t2, input, t3, dispose;

    	var if_block0 = (ctx.urlObject) && create_if_block_3(ctx);

    	function select_block_type(ctx) {
    		if (ctx.processingImg) return create_if_block;
    		return create_else_block;
    	}

    	var current_block_type = select_block_type(ctx);
    	var if_block1 = current_block_type(ctx);

    	return {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "ENVIE OU TIRE UMA FOTO DO SEU ROSTO";
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			if_block1.c();
    			attr(div0, "class", "img svelte-11dsd4");
    			add_location(div0, file, 70, 0, 1598);
    			add_location(h1, file, 75, 0, 1712);
    			attr(input, "type", "file");
    			attr(input, "accept", "image/*");
    			attr(input, "capture", "camera");
    			attr(input, "class", "svelte-11dsd4");
    			add_location(input, file, 76, 0, 1757);
    			attr(div1, "class", "photoButton svelte-11dsd4");
    			add_location(div1, file, 74, 0, 1686);
    			add_location(div2, file, 68, 0, 1591);
    			dispose = listen(input, "change", ctx.handleCam);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append(div2, t0);
    			append(div2, div1);
    			append(div1, h1);
    			append(div1, t2);
    			append(div1, input);
    			append(div2, t3);
    			if_block1.m(div2, null);
    		},

    		p: function update(changed, ctx) {
    			if (ctx.urlObject) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(changed, ctx);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);
    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div2, null);
    				}
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div2);
    			}

    			if (if_block0) if_block0.d();
    			if_block1.d();
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	

    var colors = {
      claro: '#efddca',
      claro_frio: '#f1dedc',
      claro_quente: '#faedb8',
      claro_olivia: '#efe6c8',
      medio: '#b18a61',
      medio_frio: '#997875',
      medio_quente: 'cba14d',
      medio_olivia: '#a98b46',
      escuro: '#532a1c',
      escuro_frio: '#3e221d',
      escuro_quente: '795304',
      escuro_olivia: '#4a4813'
    };


    let processingImg = false;

    let colorFound1 = null;
    let colorFound2 = null;


    let urlObject = null;

      const handleCam = async (e) => {
        $$invalidate('colorFound1', colorFound1 = null);
        $$invalidate('colorFound2', colorFound2 = null);

        $$invalidate('processingImg', processingImg = true);
        var file = e.target.files[0];
        // Do something with the image file.
        let _urlObject = URL.createObjectURL(file);
        
        let t = await fetch(_urlObject);
        console.log(1,t);
        t = await t.arrayBuffer();
        console.log(2,t);
        t = await resizer(t, 300, 50);
        console.log(3,t);
        
            const blob = new Blob([t]);
            const image = new Image();
        
            $$invalidate('urlObject', urlObject = URL.createObjectURL(blob));
        
        const result = await rgbaster_umd(urlObject); // also supports base64 encoded image strings

        $$invalidate('colorFound1', colorFound1 = nearestColor.from(colors)(result[0].color));
        $$invalidate('colorFound2', colorFound2 = nearestColor.from(colors)(result[1].color));
        //let y = nearestColor(result[0].color);

        console.log(`The dominant color is ${result[0].color} with ${result[0].count} occurrence(s)`);
        console.log(`The secondary color is ${result[1].color} with ${result[1].count} occurrence(s)`);
        
        $$invalidate('processingImg', processingImg = false);
      };

    	return {
    		processingImg,
    		colorFound1,
    		colorFound2,
    		urlObject,
    		handleCam
    	};
    }

    class Pele extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    	}
    }

    /* src/App.svelte generated by Svelte v3.8.1 */

    const file$1 = "src/App.svelte";

    // (241:0) {:else}
    function create_else_block$1(ctx) {
    	var div, div_intro, div_outro, current;

    	return {
    		c: function create() {
    			div = element("div");
    			div.textContent = "INICIANDO";
    			attr(div, "class", "svelte-2wng33");
    			add_location(div, file$1, 241, 4, 5882);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { x: ctx.width*ctx.direc, duration: 1000 });
    				div_intro.start();
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();

    			div_outro = create_out_transition(div, fly, {x:-ctx.width*ctx.direc, duration:1000});

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    				if (div_outro) div_outro.end();
    			}
    		}
    	};
    }

    // (235:27) 
    function create_if_block_4(ctx) {
    	var div, div_intro, div_outro, current;

    	return {
    		c: function create() {
    			div = element("div");
    			div.textContent = "corpo";
    			attr(div, "class", "svelte-2wng33");
    			add_location(div, file$1, 235, 4, 5729);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { x: ctx.width*ctx.direc, duration: 1000 });
    				div_intro.start();
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();

    			div_outro = create_out_transition(div, fly, {x:-ctx.width*ctx.direc, duration:1000});

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    				if (div_outro) div_outro.end();
    			}
    		}
    	};
    }

    // (229:28) 
    function create_if_block_3$1(ctx) {
    	var div, div_intro, div_outro, current;

    	return {
    		c: function create() {
    			div = element("div");
    			div.textContent = "cabelo";
    			attr(div, "class", "svelte-2wng33");
    			add_location(div, file$1, 229, 4, 5555);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { x: ctx.width*ctx.direc, duration: 1000 });
    				div_intro.start();
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();

    			div_outro = create_out_transition(div, fly, {x:-ctx.width*ctx.direc, duration:1000});

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    				if (div_outro) div_outro.end();
    			}
    		}
    	};
    }

    // (223:27) 
    function create_if_block_2$1(ctx) {
    	var div, div_intro, div_outro, current;

    	return {
    		c: function create() {
    			div = element("div");
    			div.textContent = "olhos";
    			attr(div, "class", "svelte-2wng33");
    			add_location(div, file$1, 223, 4, 5381);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { x: ctx.width*ctx.direc, duration: 1000 });
    				div_intro.start();
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();

    			div_outro = create_out_transition(div, fly, {x:-ctx.width*ctx.direc, duration:1000});

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    				if (div_outro) div_outro.end();
    			}
    		}
    	};
    }

    // (217:27) 
    function create_if_block_1$1(ctx) {
    	var div, div_intro, div_outro, current;

    	return {
    		c: function create() {
    			div = element("div");
    			div.textContent = "rosto";
    			attr(div, "class", "svelte-2wng33");
    			add_location(div, file$1, 217, 4, 5208);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { x: ctx.width*ctx.direc, duration: 1000 });
    				div_intro.start();
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();

    			div_outro = create_out_transition(div, fly, {x:-ctx.width*ctx.direc, duration:1000});

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    				if (div_outro) div_outro.end();
    			}
    		}
    	};
    }

    // (211:0) {#if page === 'pele'}
    function create_if_block$1(ctx) {
    	var div, div_intro, div_outro, current;

    	var pele = new Pele({ $$inline: true });

    	return {
    		c: function create() {
    			div = element("div");
    			pele.$$.fragment.c();
    			attr(div, "class", "svelte-2wng33");
    			add_location(div, file$1, 211, 4, 5032);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(pele, div, null);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(pele.$$.fragment, local);

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { x: ctx.width*ctx.direc, duration: 1000 });
    				div_intro.start();
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(pele.$$.fragment, local);
    			if (div_intro) div_intro.invalidate();

    			div_outro = create_out_transition(div, fly, {x:-ctx.width*ctx.direc, duration:1000});

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			destroy_component(pele);

    			if (detaching) {
    				if (div_outro) div_outro.end();
    			}
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var button0, t1, button1, t3, button2, t5, button3, t7, button4, t9, button5, t11, div, current_block_type_index, if_block, current, dispose;

    	var if_block_creators = [
    		create_if_block$1,
    		create_if_block_1$1,
    		create_if_block_2$1,
    		create_if_block_3$1,
    		create_if_block_4,
    		create_else_block$1
    	];

    	var if_blocks = [];

    	function select_block_type(ctx) {
    		if (ctx.page === 'pele') return 0;
    		if (ctx.page === 'rosto') return 1;
    		if (ctx.page === 'olhos') return 2;
    		if (ctx.page === 'cabelo') return 3;
    		if (ctx.page === 'corpo') return 4;
    		return 5;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "pele";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "rosto";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "olhos";
    			t5 = space();
    			button3 = element("button");
    			button3.textContent = "cabelo";
    			t7 = space();
    			button4 = element("button");
    			button4.textContent = "corpo";
    			t9 = space();
    			button5 = element("button");
    			button5.textContent = "questao";
    			t11 = space();
    			div = element("div");
    			if_block.c();
    			add_location(button0, file$1, 202, 0, 4643);
    			add_location(button1, file$1, 203, 0, 4698);
    			add_location(button2, file$1, 204, 0, 4755);
    			add_location(button3, file$1, 205, 0, 4812);
    			add_location(button4, file$1, 206, 0, 4871);
    			add_location(button5, file$1, 207, 0, 4928);
    			attr(div, "class", "x svelte-2wng33");
    			add_location(div, file$1, 209, 0, 4990);

    			dispose = [
    				listen(button0, "click", ctx.click_handler),
    				listen(button1, "click", ctx.click_handler_1),
    				listen(button2, "click", ctx.click_handler_2),
    				listen(button3, "click", ctx.click_handler_3),
    				listen(button4, "click", ctx.click_handler_4),
    				listen(button5, "click", ctx.click_handler_5)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, button0, anchor);
    			insert(target, t1, anchor);
    			insert(target, button1, anchor);
    			insert(target, t3, anchor);
    			insert(target, button2, anchor);
    			insert(target, t5, anchor);
    			insert(target, button3, anchor);
    			insert(target, t7, anchor);
    			insert(target, button4, anchor);
    			insert(target, t9, anchor);
    			insert(target, button5, anchor);
    			insert(target, t11, anchor);
    			insert(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);
    			if (current_block_type_index !== previous_block_index) {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button0);
    				detach(t1);
    				detach(button1);
    				detach(t3);
    				detach(button2);
    				detach(t5);
    				detach(button3);
    				detach(t7);
    				detach(button4);
    				detach(t9);
    				detach(button5);
    				detach(t11);
    				detach(div);
    			}

    			if_blocks[current_block_type_index].d();
    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	
        
        let i = 0;
        let direc = 1;
        let width = window.outerWidth;
        let { name, page='' } = $$props;

        const move = (to, fromId) => {
            $$invalidate('direc', direc = fromId > i ? 1 : -1);
            i = fromId;
            $$invalidate('page', page = to);
        };

    /*
      const bodyChoose = document.querySelector("#bodyChoose");
      const skinChoose = document.querySelector("#skinChoose");
      const answer = document.querySelector("#answer");
      const bodyText = document.querySelector("#bodyText");
      const skinText = document.querySelector("#skinText");
      const reset = document.querySelector("#reset");

      const areaCard = document.querySelector("#areaCard");
      let areaColor = document.querySelector("#areaColor");

      const bodySelect = function(e, value) {
        e.preventDefault();
        bodyText.innerText = value;
        bodyChoose.style.display = "none";
        skinChoose.style.display = "block";
        answer.style.display = "none";
      };
      const colorSelect = function(e, value) {
        e.preventDefault();
        skinText.innerText = value;
        bodyChoose.style.display = "none";
        skinChoose.style.display = "none";
        answer.style.display = "block";
      };

      const resetSelect = function(e) {
        e.preventDefault();
        skinText.innerText = "";
        bodyText.innerText = "";
        bodyChoose.style.display = "block";
        skinChoose.style.display = "none";
        answer.style.display = "none";
      };

      reset.addEventListener("click", resetSelect);

      for (data of dataList) {
        console.log(data);
        let el = document.createElement("div");
        el.className = "item ";
        el.innerHTML = template(data.imgUrl, data.title);
        let value = data.title;
        el.querySelector(".mdc-card__media").addEventListener("click", event => {
          bodySelect(event, value);
        });
        el.querySelector(".mdc-button").addEventListener("click", event => {
          bodySelect(event, value);
        });
        areaCard.appendChild(el);
      }

      for (color of colors) {
        let el = document.createElement("div");
        el.className = "color";
        el.style.backgroundColor = color;
        //el.innerHTML=color;
        el.innerHTML = "<div class='area'></div>";
        let value = color;
        el.addEventListener("click", event => {
          colorSelect(event, value);
        });
        areaColor.appendChild(el);
      }
     */

    	const writable_props = ['name', 'page'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function click_handler() {
    		return move('pele', 1);
    	}

    	function click_handler_1() {
    		return move('rosto', 2);
    	}

    	function click_handler_2() {
    		return move('olhos', 3);
    	}

    	function click_handler_3() {
    		return move('cabelo', 4);
    	}

    	function click_handler_4() {
    		return move('corpo', 5);
    	}

    	function click_handler_5() {
    		return move('questao', 6);
    	}

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('page' in $$props) $$invalidate('page', page = $$props.page);
    	};

    	return {
    		direc,
    		width,
    		name,
    		page,
    		move,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["name", "page"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get page() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set page(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
