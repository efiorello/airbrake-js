"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notifier = void 0;
var browser_1 = require("@airbrake/browser");
var node_1 = require("./filter/node");
var scope_1 = require("./scope");
var Notifier = /** @class */ (function (_super) {
    __extends(Notifier, _super);
    function Notifier(opt) {
        var _this = this;
        if (!opt.environment && process.env.NODE_ENV) {
            opt.environment = process.env.NODE_ENV;
        }
        opt.performanceStats = opt.performanceStats !== false;
        _this = _super.call(this, opt) || this;
        _this.addFilter(node_1.nodeFilter);
        _this._inFlight = 0;
        _this._scopeManager = new scope_1.ScopeManager();
        _this._mainScope = new scope_1.Scope();
        process.on('beforeExit', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.flush()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        process.on('uncaughtException', function (err) {
            _this.notify(err).then(function () {
                if (process.listeners('uncaughtException').length !== 1) {
                    return;
                }
                if (console.error) {
                    console.error('uncaught exception', err);
                }
                process.exit(1);
            });
        });
        process.on('unhandledRejection', function (reason, _p) {
            var msg = reason.message || String(reason);
            if (msg.indexOf && msg.indexOf('airbrake: ') === 0) {
                return;
            }
            _this.notify(reason).then(function () {
                if (process.listeners('unhandledRejection').length !== 1) {
                    return;
                }
                if (console.error) {
                    console.error('unhandled rejection', reason);
                }
                process.exit(1);
            });
        });
        if (opt.performanceStats) {
            _this._instrument();
        }
        return _this;
    }
    Notifier.prototype.scope = function () {
        var scope = this._scopeManager.active();
        if (scope) {
            return scope;
        }
        return this._mainScope;
    };
    Notifier.prototype.setActiveScope = function (scope) {
        this._scopeManager.setActive(scope);
    };
    Notifier.prototype.notify = function (err) {
        var _this = this;
        this._inFlight++;
        return _super.prototype.notify.call(this, err).finally(function () {
            _this._inFlight--;
        });
    };
    Notifier.prototype.flush = function (timeout) {
        if (timeout === void 0) { timeout = 3000; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (this._inFlight === 0 || timeout <= 0) {
                    return [2 /*return*/, Promise.resolve(true)];
                }
                return [2 /*return*/, new Promise(function (resolve, _reject) {
                        var interval = timeout / 100;
                        if (interval <= 0) {
                            interval = 10;
                        }
                        var timerID = setInterval(function () {
                            if (_this._inFlight === 0) {
                                resolve(true);
                                clearInterval(timerID);
                                return;
                            }
                            if (timeout <= 0) {
                                resolve(false);
                                clearInterval(timerID);
                                return;
                            }
                            timeout -= interval;
                        }, interval);
                    })];
            });
        });
    };
    Notifier.prototype._instrument = function () {
        var mods = ['pg', 'mysql', 'mysql2', 'redis', 'http', 'https'];
        for (var _i = 0, mods_1 = mods; _i < mods_1.length; _i++) {
            var modName = mods_1[_i];
            try {
                var mod = require(modName);
                var airbrakeMod = require("@airbrake/node/dist/instrumentation/" + modName);
                airbrakeMod.patch(mod, this);
            }
            catch (_) { }
        }
    };
    return Notifier;
}(browser_1.BaseNotifier));
exports.Notifier = Notifier;
//# sourceMappingURL=notifier.js.map