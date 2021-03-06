"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = void 0;
var promise_polyfill_1 = __importDefault(require("promise-polyfill"));
var api_1 = require("./api");
var rateLimitReset = 0;
function request(req) {
    var utime = Date.now() / 1000;
    if (utime < rateLimitReset) {
        return promise_polyfill_1.default.reject(api_1.errors.ipRateLimited);
    }
    var opt = {
        method: req.method,
        body: req.body,
    };
    return fetch(req.url, { method: opt.method, body: opt.body }).then(function (resp) {
        if (resp.status === 401) {
            throw api_1.errors.unauthorized;
        }
        if (resp.status === 429) {
            var s = resp.headers.get('X-RateLimit-Delay');
            if (!s) {
                throw api_1.errors.ipRateLimited;
            }
            var n = parseInt(s, 10);
            if (n > 0) {
                rateLimitReset = Date.now() / 1000 + n;
            }
            throw api_1.errors.ipRateLimited;
        }
        if (resp.status === 204) {
            return { json: null };
        }
        if (resp.status === 404) {
            throw new Error('404 Not Found');
        }
        if (resp.status >= 200 && resp.status < 300) {
            return resp.json().then(function (json) {
                return { json: json };
            });
        }
        if (resp.status >= 400 && resp.status < 500) {
            return resp.json().then(function (json) {
                var err = new Error(json.message);
                throw err;
            });
        }
        return resp.text().then(function (body) {
            var err = new Error("airbrake: fetch: unexpected response: code=" + resp.status + " body='" + body + "'");
            throw err;
        });
    });
}
exports.request = request;
//# sourceMappingURL=fetch.js.map