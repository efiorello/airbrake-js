"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseNotifier = void 0;
var promise_polyfill_1 = __importDefault(require("promise-polyfill"));
var jsonify_notice_1 = require("./jsonify_notice");
var scope_1 = require("./scope");
var esp_1 = require("./processor/esp");
var angular_message_1 = require("./filter/angular_message");
var debounce_1 = require("./filter/debounce");
var ignore_noise_1 = require("./filter/ignore_noise");
var uncaught_message_1 = require("./filter/uncaught_message");
var http_req_1 = require("./http_req");
var queries_1 = require("./queries");
var queues_1 = require("./queues");
var routes_1 = require("./routes");
var version_1 = require("./version");
var BaseNotifier = /** @class */ (function () {
    function BaseNotifier(opt) {
        var _this = this;
        this._filters = [];
        this._performanceFilters = [];
        this._scope = new scope_1.Scope();
        this._onClose = [];
        if (!opt.projectId || !opt.projectKey) {
            throw new Error('airbrake: projectId and projectKey are required');
        }
        this._opt = opt;
        this._opt.host = this._opt.host || 'https://api.airbrake.io';
        this._opt.timeout = this._opt.timeout || 10000;
        this._opt.keysBlocklist = this._opt.keysBlocklist ||
            this._opt.keysBlacklist || [/password/, /secret/];
        this._url = this._opt.host + "/api/v3/projects/" + this._opt.projectId + "/notices?key=" + this._opt.projectKey;
        this._processor = this._opt.processor || esp_1.espProcessor;
        this._requester = http_req_1.makeRequester(this._opt);
        this.addFilter(ignore_noise_1.ignoreNoiseFilter);
        this.addFilter(debounce_1.makeDebounceFilter());
        this.addFilter(uncaught_message_1.uncaughtMessageFilter);
        this.addFilter(angular_message_1.angularMessageFilter);
        this.addFilter(function (notice) {
            notice.context.notifier = {
                name: version_1.NOTIFIER_NAME,
                version: version_1.NOTIFIER_VERSION,
                url: version_1.NOTIFIER_URL,
            };
            if (_this._opt.environment) {
                notice.context.environment = _this._opt.environment;
            }
            return notice;
        });
        this.routes = new Routes(this);
        this.queues = new Queues(this);
        this.queries = new queries_1.QueriesStats(this._opt);
    }
    BaseNotifier.prototype.close = function () {
        for (var _i = 0, _a = this._onClose; _i < _a.length; _i++) {
            var fn = _a[_i];
            fn();
        }
    };
    BaseNotifier.prototype.scope = function () {
        return this._scope;
    };
    BaseNotifier.prototype.setActiveScope = function (scope) {
        this._scope = scope;
    };
    BaseNotifier.prototype.addFilter = function (filter) {
        this._filters.push(filter);
    };
    BaseNotifier.prototype.addPerformanceFilter = function (performanceFilter) {
        this._performanceFilters.push(performanceFilter);
    };
    BaseNotifier.prototype.notify = function (err) {
        var notice = {
            errors: [],
            context: __assign(__assign({ severity: 'error' }, this.scope().context()), err.context),
            params: err.params || {},
            environment: err.environment || {},
            session: err.session || {},
        };
        if (typeof err !== 'object' || err.error === undefined) {
            err = { error: err };
        }
        if (!err.error) {
            notice.error = new Error("airbrake: got err=" + JSON.stringify(err.error) + ", wanted an Error");
            return promise_polyfill_1.default.resolve(notice);
        }
        var error = this._processor(err.error);
        notice.errors.push(error);
        for (var _i = 0, _a = this._filters; _i < _a.length; _i++) {
            var filter = _a[_i];
            var r = filter(notice);
            if (r === null) {
                notice.error = new Error('airbrake: error is filtered');
                return promise_polyfill_1.default.resolve(notice);
            }
            notice = r;
        }
        if (!notice.context) {
            notice.context = {};
        }
        notice.context.language = 'JavaScript';
        return this._sendNotice(notice);
    };
    BaseNotifier.prototype._sendNotice = function (notice) {
        var body = jsonify_notice_1.jsonifyNotice(notice, {
            keysBlocklist: this._opt.keysBlocklist,
        });
        if (this._opt.reporter) {
            if (typeof this._opt.reporter === 'function') {
                return this._opt.reporter(notice);
            }
            else {
                console.warn('airbrake: options.reporter must be a function');
            }
        }
        var req = {
            method: 'POST',
            url: this._url,
            body: body,
        };
        return this._requester(req)
            .then(function (resp) {
            notice.id = resp.json.id;
            notice.url = resp.json.url;
            return notice;
        })
            .catch(function (err) {
            notice.error = err;
            return notice;
        });
    };
    BaseNotifier.prototype.wrap = function (fn, props) {
        if (props === void 0) { props = []; }
        if (fn._airbrake) {
            return fn;
        }
        // tslint:disable-next-line:no-this-assignment
        var client = this;
        var airbrakeWrapper = function () {
            var fnArgs = Array.prototype.slice.call(arguments);
            var wrappedArgs = client._wrapArguments(fnArgs);
            try {
                return fn.apply(this, wrappedArgs);
            }
            catch (err) {
                client.notify({ error: err, params: { arguments: fnArgs } });
                this._ignoreNextWindowError();
                throw err;
            }
        };
        for (var prop in fn) {
            if (fn.hasOwnProperty(prop)) {
                airbrakeWrapper[prop] = fn[prop];
            }
        }
        for (var _i = 0, props_1 = props; _i < props_1.length; _i++) {
            var prop = props_1[_i];
            if (fn.hasOwnProperty(prop)) {
                airbrakeWrapper[prop] = fn[prop];
            }
        }
        airbrakeWrapper._airbrake = true;
        airbrakeWrapper.inner = fn;
        return airbrakeWrapper;
    };
    BaseNotifier.prototype._wrapArguments = function (args) {
        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            if (typeof arg === 'function') {
                args[i] = this.wrap(arg);
            }
        }
        return args;
    };
    BaseNotifier.prototype._ignoreNextWindowError = function () { };
    BaseNotifier.prototype.call = function (fn) {
        var _args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            _args[_i - 1] = arguments[_i];
        }
        var wrapper = this.wrap(fn);
        return wrapper.apply(this, Array.prototype.slice.call(arguments, 1));
    };
    return BaseNotifier;
}());
exports.BaseNotifier = BaseNotifier;
var Routes = /** @class */ (function () {
    function Routes(notifier) {
        this._notifier = notifier;
        this._routes = new routes_1.RoutesStats(notifier._opt);
        this._breakdowns = new routes_1.RoutesBreakdowns(notifier._opt);
    }
    Routes.prototype.start = function (method, route, statusCode, contentType) {
        if (method === void 0) { method = ''; }
        if (route === void 0) { route = ''; }
        if (statusCode === void 0) { statusCode = 0; }
        if (contentType === void 0) { contentType = ''; }
        var metric = new routes_1.RouteMetric(method, route, statusCode, contentType);
        var scope = this._notifier.scope().clone();
        scope.setContext({ httpMethod: method, route: route });
        scope.setRouteMetric(metric);
        this._notifier.setActiveScope(scope);
        return metric;
    };
    Routes.prototype.notify = function (req) {
        req.end();
        for (var _i = 0, _a = this._notifier._performanceFilters; _i < _a.length; _i++) {
            var performanceFilter = _a[_i];
            if (performanceFilter(req) === null) {
                return;
            }
        }
        this._routes.notify(req);
        this._breakdowns.notify(req);
    };
    return Routes;
}());
var Queues = /** @class */ (function () {
    function Queues(notifier) {
        this._notifier = notifier;
        this._queues = new queues_1.QueuesStats(notifier._opt);
    }
    Queues.prototype.start = function (queue) {
        var metric = new queues_1.QueueMetric(queue);
        var scope = this._notifier.scope().clone();
        scope.setContext({ queue: queue });
        scope.setQueueMetric(metric);
        this._notifier.setActiveScope(scope);
        return metric;
    };
    Queues.prototype.notify = function (q) {
        q.end();
        this._queues.notify(q);
    };
    return Queues;
}());
//# sourceMappingURL=base_notifier.js.map