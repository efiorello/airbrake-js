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
import { hasTdigest, TDigestStatGroups } from './tdshared';
var FLUSH_INTERVAL = 15000; // 15 seconds
var QueueMetric = /** @class */ (function (_super) {
    __extends(QueueMetric, _super);
    function QueueMetric(queue) {
        var _this = _super.call(this) || this;
        _this.queue = queue;
        _this.startTime = new Date();
        return _this;
    }
    return QueueMetric;
}(BaseMetric));
export { QueueMetric };
var QueuesStats = /** @class */ (function () {
    function QueuesStats(opt) {
        this._m = {};
        this._opt = opt;
        this._url = opt.host + "/api/v5/projects/" + opt.projectId + "/queues-stats?key=" + opt.projectKey;
        this._requester = makeRequester(opt);
    }
    QueuesStats.prototype.notify = function (q) {
        var _this = this;
        if (!hasTdigest) {
            return;
        }
        var ms = q._duration();
        if (ms === 0) {
            ms = 0.00001;
        }
        var minute = 60 * 1000;
        var startTime = new Date(Math.floor(q.startTime.getTime() / minute) * minute);
        var key = {
            queue: q.queue,
            time: startTime,
        };
        var keyStr = JSON.stringify(key);
        var stat = this._m[keyStr];
        if (!stat) {
            stat = new TDigestStatGroups();
            this._m[keyStr] = stat;
        }
        stat.addGroups(ms, q._groups);
        if (this._timer) {
            return;
        }
        this._timer = setTimeout(function () {
            _this._flush();
        }, FLUSH_INTERVAL);
    };
    QueuesStats.prototype._flush = function () {
        var queues = [];
        for (var keyStr in this._m) {
            if (!this._m.hasOwnProperty(keyStr)) {
                continue;
            }
            var key = JSON.parse(keyStr);
            var v = __assign(__assign({}, key), this._m[keyStr].toJSON());
            queues.push(v);
        }
        this._m = {};
        this._timer = null;
        var outJSON = JSON.stringify({
            environment: this._opt.environment,
            queues: queues,
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
                console.error('can not report queues breakdowns', err);
            }
        });
    };
    return QueuesStats;
}());
export { QueuesStats };
//# sourceMappingURL=queues.js.map