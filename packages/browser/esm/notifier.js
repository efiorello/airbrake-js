var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import Promise from 'promise-polyfill';
import { BaseNotifier } from './base_notifier';
import { windowFilter } from './filter/window';
import { instrumentConsole } from './instrumentation/console';
import { instrumentDOM } from './instrumentation/dom';
import { instrumentFetch } from './instrumentation/fetch';
import { instrumentLocation } from './instrumentation/location';
import { instrumentXHR } from './instrumentation/xhr';
var Notifier = /** @class */ (function (_super) {
    __extends(Notifier, _super);
    function Notifier(opt) {
        var _this = _super.call(this, opt) || this;
        _this.offline = false;
        _this.todo = [];
        _this._ignoreWindowError = 0;
        _this._ignoreNextXHR = 0;
        if (typeof window === 'undefined') {
            return _this;
        }
        _this.addFilter(windowFilter);
        if (window.addEventListener) {
            _this.onOnline = _this.onOnline.bind(_this);
            window.addEventListener('online', _this.onOnline);
            _this.onOffline = _this.onOffline.bind(_this);
            window.addEventListener('offline', _this.onOffline);
            _this.onUnhandledrejection = _this.onUnhandledrejection.bind(_this);
            window.addEventListener('unhandledrejection', _this.onUnhandledrejection);
            _this._onClose.push(function () {
                window.removeEventListener('online', _this.onOnline);
                window.removeEventListener('offline', _this.onOffline);
                window.removeEventListener('unhandledrejection', _this.onUnhandledrejection);
            });
        }
        // TODO: deprecated
        if (_this._opt.ignoreWindowError) {
            opt.instrumentation.onerror = false;
        }
        _this._instrument(opt.instrumentation);
        return _this;
    }
    Notifier.prototype._instrument = function (opt) {
        if (opt === void 0) { opt = {}; }
        if (opt.console === undefined) {
            opt.console = !isDevEnv(this._opt.environment);
        }
        if (enabled(opt.onerror)) {
            // tslint:disable-next-line:no-this-assignment
            var self_1 = this;
            var oldHandler_1 = window.onerror;
            window.onerror = function abOnerror() {
                if (oldHandler_1) {
                    oldHandler_1.apply(this, arguments);
                }
                self_1.onerror.apply(self_1, arguments);
            };
        }
        instrumentDOM(this);
        if (enabled(opt.fetch) && typeof fetch === 'function') {
            instrumentFetch(this);
        }
        if (enabled(opt.history) && typeof history === 'object') {
            instrumentLocation(this);
        }
        if (enabled(opt.console) && typeof console === 'object') {
            instrumentConsole(this);
        }
        if (enabled(opt.xhr) && typeof XMLHttpRequest !== 'undefined') {
            instrumentXHR(this);
        }
    };
    Notifier.prototype.notify = function (err) {
        var _this = this;
        if (this.offline) {
            return new Promise(function (resolve, reject) {
                _this.todo.push({
                    err: err,
                    resolve: resolve,
                    reject: reject,
                });
                while (_this.todo.length > 100) {
                    var j = _this.todo.shift();
                    if (j === undefined) {
                        break;
                    }
                    j.resolve({
                        error: new Error('airbrake: offline queue is too large'),
                    });
                }
            });
        }
        return _super.prototype.notify.call(this, err);
    };
    Notifier.prototype.onOnline = function () {
        this.offline = false;
        var _loop_1 = function (j) {
            this_1.notify(j.err).then(function (notice) {
                j.resolve(notice);
            });
        };
        var this_1 = this;
        for (var _i = 0, _a = this.todo; _i < _a.length; _i++) {
            var j = _a[_i];
            _loop_1(j);
        }
        this.todo = [];
    };
    Notifier.prototype.onOffline = function () {
        this.offline = true;
    };
    Notifier.prototype.onUnhandledrejection = function (e) {
        // Handle native or bluebird Promise rejections
        // https://developer.mozilla.org/en-US/docs/Web/Events/unhandledrejection
        // http://bluebirdjs.com/docs/api/error-management-configuration.html
        var reason = e.reason || (e.detail && e.detail.reason);
        if (!reason) {
            return;
        }
        var msg = reason.message || String(reason);
        if (msg.indexOf && msg.indexOf('airbrake: ') === 0) {
            return;
        }
        if (typeof reason !== 'object' || reason.error === undefined) {
            this.notify({
                error: reason,
                context: {
                    unhandledRejection: true,
                },
            });
            return;
        }
        this.notify(__assign(__assign({}, reason), { context: {
                unhandledRejection: true,
            } }));
    };
    Notifier.prototype.onerror = function (message, filename, line, column, err) {
        if (this._ignoreWindowError > 0) {
            return;
        }
        if (err) {
            this.notify({
                error: err,
                context: {
                    windowError: true,
                },
            });
            return;
        }
        // Ignore errors without file or line.
        if (!filename || !line) {
            return;
        }
        this.notify({
            error: {
                message: message,
                fileName: filename,
                lineNumber: line,
                columnNumber: column,
                noStack: true,
            },
            context: {
                windowError: true,
            },
        });
    };
    Notifier.prototype._ignoreNextWindowError = function () {
        var _this = this;
        this._ignoreWindowError++;
        setTimeout(function () { return _this._ignoreWindowError--; });
    };
    return Notifier;
}(BaseNotifier));
export { Notifier };
function isDevEnv(env) {
    return env && env.startsWith && env.startsWith('dev');
}
function enabled(v) {
    return v === undefined || v === true;
}
//# sourceMappingURL=notifier.js.map