#!/usr/bin/env node
var Aqueduct = require('..')
  , Hapi = require('hapi')
  , util = require('util')
  , pkg = require('../package.json')
  ;

// require('nodetime').profile({
//     accountKey: '1765a180c09b73ea0a7d7262ff6dc60d776bf395', 
//     appName: 'Aqueuct'
//   });

var optimist = require('optimist')
            .options({
              host: {
                default : '0.0.0.0',
                describe: 'host to bind to'
              },
              port: {
                default : 10000,
                describe: 'port to bind to'
              },
              thalassaHost: {
                default : '127.0.0.1',
                describe: 'host of the Thalassa server'
              },
              thalassaPort: {
                default : 5001,
                describe: 'port of the Thalassa server'
              },
              haproxySocketPath: {
                default: '/tmp/haproxy.status.sock',
                describe: 'path to Haproxy socket file'
              },
              haproxyCfgPath: {
                default: '/etc/haproxy/haproxy.cfg',
                describe: 'generated Haproxy config location'
              },
              templateFile: {
                default: __dirname + '/../default.haproxycfg.tmpl',
                describe: 'template used to generate Haproxy config'
              },
              persistence: {
                describe: 'leveldb file path to persist data'
              },
              debug: {
                boolean: true,
                describe: 'enabled debug logging'
              },
              showhelp: {
                alias: 'h'
              }
            });

var argv = optimist.argv;
if (argv.h) {
  optimist.showHelp();
  process.exit(0);
}

var log = argv.log = require('../lib/defaultLogger')( (argv.debug == true) ? 'debug' : 'error' );
var aqueduct = new Aqueduct(argv);
var server = Hapi.createServer(argv.host, argv.port);
server.route(aqueduct.apiRoutes());

server.route({
    method: 'GET',
    path: '/{path*}',
    handler: {
        directory: { path: './public', listing: false, index: true }
    }
});

aqueduct.bindReadableWebsocketStream(server, '/readstream');
aqueduct.thalassaAgent.client.register(pkg.name, pkg.version, argv.port);

server.start(function () {
  log('info', util.format("Thalassa Aqueduct listening on %s:%s", argv.host, argv.port));
});

aqueduct.haproxyManager.on('configChanged', function() { log('debug', 'Config changed') });
aqueduct.haproxyManager.on('reloaded', function() { log('debug', 'Haproxy reloaded') });
aqueduct.data.stats.on('changes', function (it) { log('debug', it.state.id, it.state.status )})

// var memwatch = require('memwatch');
// memwatch.on('leak', function(info) { log('debug', 'leak', info); });
// memwatch.on('stats', function(stats) { log('debug', 'stats', stats); });
// var hd = new memwatch.HeapDiff();

// setInterval(function () {
//   log('debug', 'diff', hd.end().after.size);
//   hd = new memwatch.HeapDiff();
// }, 10000);

