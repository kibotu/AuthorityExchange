/**
 * TODO
 *
 * - ssh key generation on new device & bit strength
 * - change device status to host
 *
 * ssh: tiberius@144.76.10.91  kl0ster
 */


/**
 * Module dependencies.
 */
var express = require('express')
    , request = require('request')
    , handlers = require('./requestHandlers')
    , http = require('http')
    , path = require('path');

exports.app = app = express();

/**
 * Configuration
 */
app.configure(function () {
    app.set('port', process.env.PORT || 8080);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', { pretty: true });
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser({uploadDir: './tmp'}));
    app.use(express.methodOverride());
    app.use(express.cookieParser('your secret here'));
    app.use(express.session());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

/**
 * Special development error handling.
 */
app.configure('dev', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

/**
 * Create http server.
 */
http.createServer(app).listen(app.get('port'), function () {
    console.log("Server listening on port " + app.get('port'));
});

/**
 * ROUTES
 */

/** GET **/

// root
app.get('/', handlers.getRoot);
// all devices
app.get('/devices', handlers.getDevices);
// all host devices
app.get('/host-devices', handlers.getDevicesHosts);
// get device by id
app.get('/device/:id', handlers.getDeviceById);
// ssh key
app.get('/ssh-key/:user/:time/:file', handlers.getSSHKey);

/** JSON **/

// get all devices as json
app.get('/devices.json', handlers.jsonDevices);

/** POST **/

// save device
app.post('/device', handlers.postDevice);
// provide devices
app.post('/provide-devices', handlers.postProvideDevices);

/** PUT **/

// update device
app.put('/device/:id', handlers.updateDevice);
app.post('/device/edit/:id', handlers.postUpdateDevice);

/** DELETE **/

// delete device by id
app.delete('/device/:id', handlers.deleteDevice);
app.get('/device/delete/:id', handlers.getDeleteDevice);

/** FORMS **/

// add/edit new device form
app.get('/device-form', handlers.getDeviceForm);
app.get('/device-form/:id', handlers.getDeviceForm);