define(function (require, exports, module) {
    var $ = require('jquery');

    var Route = function () {

    };

    Route.debug = true;

    var log = function () {
        if (Route.debug) {
            try {
                console.log.apply(console, [].slice.call(arguments));
            } catch (e) {

            }
        }
    };

    var processRoutePath = function (path) {
        if (path.constructor === RegExp) {
            return path;
        }
        if (!path.indexOf(':')) {
            return path;
        }
        var paramList = [];
        var ret = new RegExp('^' + path.toString().replace(/\//g, '\\/').replace(/\:[a-zA-Z_][a-zA-Z_0-9]*/g, function (v) {
            paramList.push(v.substr(1));
            return '([^\/]+)';
        }) + '$');
        ret.paramList = paramList;
        return ret;
    };

    var parseQueryString = function (qs) {
        var ret = {};
        qs.split('&').forEach(function (v) {
            var x = v.split('=');
            if (!x[0]) {
                return;
            }
            try {
                ret[x[0]] = decodeURIComponent(x[1]);
            } catch (e) {
                ret[x[0]] = x[1];
            }
        });
        return ret;
    };

    $.extend(Route.prototype, {
        verbs: ['GET', 'POST', 'DELETE', 'PUSH', 'HEAD', 'PUT', 'TRACE', 'OPTIONS', 'CONNECT'],
        allRoutes: [],
        location: '/',
        setLocation: function (path, option) {
            this.location = path;
            if (option === true || option.runRoute) {
                this.runRoute(option.verb || 'GET', path, option.param || {});
            }
        },
        getLoaction: function () {
            return this.location;
        },
        route: function (verb, path, param, callback) {
            if (callback === undefined && typeof param === 'function') {
                callback = param;
                param = {};
            }
            var route = {
                verb: verb,
                path: processRoutePath(path),
                param: param,
                callback: callback
            };
            this.allRoutes.push(route);
        },
        all: function (path, param, callback) {
            this.route('ALL', path, param, callback);
        },
        findRoute: function (verb, path, startIndex) {
            verb = verb.toUpperCase();
            var allRoutes = this.allRoutes, match, route, ret = {};
            var qs = {};
            ret.param = qs;
            for (var i = startIndex || 0, mx = allRoutes.length; i < mx; i++) {
                route = allRoutes[i];
                if (route.verb !== 'ALL' && route.verb !== verb) {
                    continue;
                }
                if (typeof route.path === "string" && path.indexOf(route.path) >= 0) {
                    ret.index = i;
                    ret.route = route;
                    break;
                } else if ((match = route.path.exec(path))) {
                    ret.index = i;
                    ret.route = route;
                    if (route.path.paramList) {
                        route.path.paramList.forEach(function (v, i) {
                            qs[v] = match[i + 1];
                        });
                    } else {
                        qs.match = match;
                    }
                    break;
                }
            }
            if (ret.route) {
                return ret;
            }
            return null;
        },
        notFound: function (verb, path) {
            throw new Error(verb + " " + path + " not found in route");
        },
        runRoute: function (verb, path, param) {
            log("start run route: %s %s", verb, path);
            var match = /^([^?]*)(?:\?(.*))?/.exec(path);
            path = match[1] || '';
            var qs = parseQueryString(match[2] || '');
            var index = 0;
            var context = {
                verb: verb,
                path: path,
                param: []
            };
            var next = (function () {
                var routeInfo = this.findRoute(verb, path, index);
                if (routeInfo === null) {
                    this.notFound(verb, path);
                    return;
                }
                var route = routeInfo.route;
                index = routeInfo.index + 1;
                context.param = $.extend(context.param, route.param, routeInfo.param, qs, param);
                context.route = route;
                log('found route:');
                log(context);
                route.callback(context, next);
            }).bind(this);
            next();
        },
        run: function (path) {
            this.runRoute('GET', path || '/');
        }
    });
    // http method alias
    Route.prototype.verbs.forEach(function (verb) {
        Route.prototype[verb.toLowerCase()] = function (path, param, callback) {
            this.route(verb, path, param, callback);
        };
    });
    // alias for delete method
    Route.prototype.del = function (path, param, callback) {
        this.route("DELETE", path, param, callback);
    };

    return exports = module.exports = Route;
});