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
var tdigest;
export var hasTdigest = false;
try {
    tdigest = require('tdigest');
    hasTdigest = true;
}
catch (err) { }
var TDigestStat = /** @class */ (function () {
    function TDigestStat() {
        this.count = 0;
        this.sum = 0;
        this.sumsq = 0;
        this._td = new tdigest.Digest();
    }
    TDigestStat.prototype.add = function (ms) {
        if (ms === 0) {
            ms = 0.00001;
        }
        this.count += 1;
        this.sum += ms;
        this.sumsq += ms * ms;
        if (this._td) {
            this._td.push(ms);
        }
    };
    TDigestStat.prototype.toJSON = function () {
        return {
            count: this.count,
            sum: this.sum,
            sumsq: this.sumsq,
            tdigestCentroids: tdigestCentroids(this._td),
        };
    };
    return TDigestStat;
}());
export { TDigestStat };
var TDigestStatGroups = /** @class */ (function (_super) {
    __extends(TDigestStatGroups, _super);
    function TDigestStatGroups() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.groups = {};
        return _this;
    }
    TDigestStatGroups.prototype.addGroups = function (totalMs, groups) {
        this.add(totalMs);
        for (var name_1 in groups) {
            if (groups.hasOwnProperty(name_1)) {
                this.addGroup(name_1, groups[name_1]);
            }
        }
    };
    TDigestStatGroups.prototype.addGroup = function (name, ms) {
        var stat = this.groups[name];
        if (!stat) {
            stat = new TDigestStat();
            this.groups[name] = stat;
        }
        stat.add(ms);
    };
    TDigestStatGroups.prototype.toJSON = function () {
        return {
            count: this.count,
            sum: this.sum,
            sumsq: this.sumsq,
            tdigestCentroids: tdigestCentroids(this._td),
            groups: this.groups,
        };
    };
    return TDigestStatGroups;
}(TDigestStat));
export { TDigestStatGroups };
function tdigestCentroids(td) {
    var means = [];
    var counts = [];
    td.centroids.each(function (c) {
        means.push(c.mean);
        counts.push(c.n);
    });
    return {
        mean: means,
        count: counts,
    };
}
//# sourceMappingURL=tdshared.js.map