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
import { makeRequester } from './http_req';
import { BaseMetric } from './metrics';
import { hasTdigest, TDigestStat, TDigestStatGroups } from './tdshared';
var FLUSH_INTERVAL = 15000; // 15 seconds
var RouteMetric = /** @class */ (function (_super) {
    __extends(RouteMetric, _super);
    function RouteMetric(method, route, statusCode, contentType) {
        if (method === void 0) { method = ''; }
        if (route === void 0) { route = ''; }
        if (statusCode === void 0) { statusCode = 0; }
        if (contentType === void 0) { contentType = ''; }
        var _this = _super.call(this) || this;
        _this.method = method;
        _this.route = route;
        _this.statusCode = statusCode;
        _this.contentType = contentType;
        _this.startTime = new Date();
        return _this;
    }
    return RouteMetric;
}(BaseMetric));
export { RouteMetric };
var RoutesStats = /** @class */ (function () {
    function RoutesStats(opt) {
        this._m = {};
        this._opt = opt;
        this._url = opt.host + "/api/v5/projects/" + opt.projectId + "/routes-stats?key=" + opt.projectKey;
        this._requester = makeRequester(opt);
    }
    RoutesStats.prototype.notify = function (req) {
        var _this = this;
        if (!hasTdigest) {
            return;
        }
        var ms = req._duration();
        var minute = 60 * 1000;
        var startTime = new Date(Math.floor(req.startTime.getTime() / minute) * minute);
        var key = {
            method: req.method,
            route: req.route,
            statusCode: req.statusCode,
            time: startTime,
        };
        var keyStr = JSON.stringify(key);
        var stat = this._m[keyStr];
        if (!stat) {
            stat = new TDigestStat();
            this._m[keyStr] = stat;
        }
        stat.add(ms);
        if (this._timer) {
            return;
        }
        this._timer = setTimeout(function () {
            _this._flush();
        }, FLUSH_INTERVAL);
    };
    RoutesStats.prototype._flush = function () {
        var routes = [];
        for (var keyStr in this._m) {
            if (!this._m.hasOwnProperty(keyStr)) {
                continue;
            }
            var key = JSON.parse(keyStr);
            var v = __assign(__assign({}, key), this._m[keyStr].toJSON());
            routes.push(v);
        }
        this._m = {};
        this._timer = null;
        var outJSON = JSON.stringify({
            environment: this._opt.environment,
            routes: routes,
        });
        var req = {
            method: 'POST',
            url: this._url,
            body: outJSON,
        };
        this._requester(req)
            .then(function (_resp) {
            // nothing
        })
            .catch(function (err) {
            if (console.error) {
                console.error('can not report routes stats', err);
            }
        });
    };
    return RoutesStats;
}());
export { RoutesStats };
var RoutesBreakdowns = /** @class */ (function () {
    function RoutesBreakdowns(opt) {
        this._m = {};
        this._opt = opt;
        this._url = opt.host + "/api/v5/projects/" + opt.projectId + "/routes-breakdowns?key=" + opt.projectKey;
        this._requester = makeRequester(opt);
    }
    RoutesBreakdowns.prototype.notify = function (req) {
        var _this = this;
        if (!hasTdigest) {
            return;
        }
        if (req.statusCode < 200 ||
            (req.statusCode >= 300 && req.statusCode < 400) ||
            req.statusCode === 404 ||
            Object.keys(req._groups).length === 0) {
            return;
        }
        var ms = req._duration();
        if (ms === 0) {
            ms = 0.00001;
        }
        var minute = 60 * 1000;
        var startTime = new Date(Math.floor(req.startTime.getTime() / minute) * minute);
        var key = {
            method: req.method,
            route: req.route,
            responseType: this._responseType(req),
            time: startTime,
        };
        var keyStr = JSON.stringify(key);
        var stat = this._m[keyStr];
        if (!stat) {
            stat = new TDigestStatGroups();
            this._m[keyStr] = stat;
        }
        stat.addGroups(ms, req._groups);
        if (this._timer) {
            return;
        }
        this._timer = setTimeout(function () {
            _this._flush();
        }, FLUSH_INTERVAL);
    };
    RoutesBreakdowns.prototype._flush = function () {
        var routes = [];
        for (var keyStr in this._m) {
            if (!this._m.hasOwnProperty(keyStr)) {
                continue;
            }
            var key = JSON.parse(keyStr);
            var v = __assign(__assign({}, key), this._m[keyStr].toJSON());
            routes.push(v);
        }
        this._m = {};
        this._timer = null;
        var outJSON = JSON.stringify({
            environment: this._opt.environment,
            routes: routes,
        });
        var req = {
            method: 'POST',
            url: this._url,
            body: outJSON,
        };
        this._requester(req)
            .then(function (_resp) {
            // nothing
        })
            .catch(function (err) {
            if (console.error) {
                console.error('can not report routes breakdowns', err);
            }
        });
    };
    RoutesBreakdowns.prototype._responseType = function (req) {
        if (req.statusCode >= 500) {
            return '5xx';
        }
        if (req.statusCode >= 400) {
            return '4xx';
        }
        if (!req.contentType) {
            return '';
        }
        return req.contentType.split(';')[0].split('/')[-1];
    };
    return RoutesBreakdowns;
}());
export { RoutesBreakdowns };
//# sourceMappingURL=routes.js.map