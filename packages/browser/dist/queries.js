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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueriesStats = exports.QueryInfo = void 0;
var http_req_1 = require("./http_req");
var tdshared_1 = require("./tdshared");
var FLUSH_INTERVAL = 15000; // 15 seconds
var QueryInfo = /** @class */ (function () {
    function QueryInfo(query) {
        if (query === void 0) { query = ''; }
        this.method = '';
        this.route = '';
        this.query = '';
        this.func = '';
        this.file = '';
        this.line = 0;
        this.startTime = new Date();
        this.query = query;
    }
    QueryInfo.prototype._duration = function () {
        if (!this.endTime) {
            this.endTime = new Date();
        }
        return this.endTime.getTime() - this.startTime.getTime();
    };
    return QueryInfo;
}());
exports.QueryInfo = QueryInfo;
var QueriesStats = /** @class */ (function () {
    function QueriesStats(opt) {
        this._m = {};
        this._opt = opt;
        this._url = opt.host + "/api/v5/projects/" + opt.projectId + "/queries-stats?key=" + opt.projectKey;
        this._requester = http_req_1.makeRequester(opt);
    }
    QueriesStats.prototype.start = function (query) {
        if (query === void 0) { query = ''; }
        return new QueryInfo(query);
    };
    QueriesStats.prototype.notify = function (q) {
        var _this = this;
        if (!tdshared_1.hasTdigest) {
            return;
        }
        var ms = q._duration();
        var minute = 60 * 1000;
        var startTime = new Date(Math.floor(q.startTime.getTime() / minute) * minute);
        var key = {
            method: q.method,
            route: q.route,
            query: q.query,
            func: q.func,
            file: q.file,
            line: q.line,
            time: startTime,
        };
        var keyStr = JSON.stringify(key);
        var stat = this._m[keyStr];
        if (!stat) {
            stat = new tdshared_1.TDigestStat();
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
    QueriesStats.prototype._flush = function () {
        var queries = [];
        for (var keyStr in this._m) {
            if (!this._m.hasOwnProperty(keyStr)) {
                continue;
            }
            var key = JSON.parse(keyStr);
            var v = __assign(__assign({}, key), this._m[keyStr].toJSON());
            queries.push(v);
        }
        this._m = {};
        this._timer = null;
        var outJSON = JSON.stringify({
            environment: this._opt.environment,
            queries: queries,
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
                console.error('can not report queries stats', err);
            }
        });
    };
    return QueriesStats;
}());
exports.QueriesStats = QueriesStats;
//# sourceMappingURL=queries.js.map