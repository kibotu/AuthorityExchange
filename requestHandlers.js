var application_root = __dirname,
    path = require('path'),
    fs = require('fs'),
    Error = require('errno-codes'),
    request = require('request'),
    crypto = require('crypto'),
    async = require('async'),
    ssh2 = require('ssh2'),
    url = require('url');

db = require('mongoskin').db('localhost:27017/kaidb', {auto_reconnect: true, j: true, safe: true});

/**
 * UTILITY
 */
var checkError = function (err, res) {
    if (err) {
        console.log(err);
//        res.redirect('error', {error: Error.get(err.code)});
    }
    // TODO proper error page
    // if (err) res.writeHead(500, err.message)
    // else if (!results.length) res.writeHead(404);
};

var renderError = function (res, erroMessage) {
    res.render('error', { error: erroMessage});
};

var uploadFile = function (username, file, callback) {
    var now = new Date();
    var upload_path = [];
    upload_path[0] = "./uploads/" + username;
    upload_path[1] = upload_path[0] + "/" + now.getTime() + "/";

//    // hash folder
//    var md5sum = crypto.createHash('md5');
//    md5sum.update("" + now.getTime());
//    upload_path[2] = upload_path[1] + md5sum.digest('hex') + "/";

    var target_path = "";

    var uploadFile = function () {
        // get the temporary location of the file
        var tmp_path = file.path;
        console.log(__dirname);
        console.log(file.path);
        // set where the file should actually exists - in this case it is in the "img" directory
        target_path = upload_path[1] + file.name;
        // move the file from the temporary location to the intended location
        fs.rename(tmp_path, target_path, function (err) {
//            checkError(err); // TODO error handling
            // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
            fs.unlink(tmp_path, function () {
//                checkError(err); // TODO error handling
                var feedback = 'File uploaded to: ' + target_path + ' - ' + file.size + ' bytes';
//                res.send(feedback);
                console.log(feedback);
            });
        });
    };

    // mkdir
    var mkdirs = function (dirs, mode, cb) {
        (function next(e) {
            while (!e && dirs.length) {
                try {
                    var path = dirs.shift();
                    fs.mkdir(path, mode);
                } catch (err) {
                    // folder exists already - do nothing
                }
            }
            cb(e);
        })(null);
    };

    // make dirs
    mkdirs(upload_path.slice(), 0777, uploadFile);

    if (callback) callback(target_path);
    return target_path;
};

/** add devices to authorized keys **/
var updateAuthorizedKeys = function (targetID, deviceIDs) {

};

/**
 * GET HANDLER
 */

// show root '/'
function getRoot(req, res) {
    res.render('index');
}

// json 'all-devices.json'
function jsonDevices(req, res) {
    db.collection('devices').find().toArray(function (err, result) {
        checkError(err);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(result));
        res.end();
    });
}

// show 'all-devices-hosts'
function getDevicesHosts(req, res) {
    db.collection('devices').find().toArray(function (err, result) {
        checkError(err);

        // just in case plain
        res.writeHead(200, {'Content-Type': 'text/plain'});

        var printDevice = function (device) {
            res.write('<tr>');
            res.write('     <td class="center"><input type="radio" name="host" value="' + device._id + '"></td>');
            res.write('     <td width="200em" class="device-hostname break-word">' + device.hostname + '</td>');
            res.write('     <td>' + device.ip + '</td>');
            res.write('     <td>' + device.port + '</td>');
            res.write('     <td class="center">' + device.username + '</td>');
            res.write('     <td class="center"><a class="colorboxed" href="' + device.authorized_keys + '">key</a></td>');
            res.write('     <td class="center"><a class="colorboxed" href="/device-form/' + device._id + '">edit</a></td>');
            res.write('<td class="center">' +
                '<form class="colorboxed" enctype="multipart/form-data" action="/device/delete/' + device._id + '"" method="POST">' +
                '<input type="hidden" name="_method" value="put">' +
                '<input type="submit" name="Delete">' +
                '</form>' +
                '</td>');
            res.write('</tr>');
        };

        for (var i = 0; i < result.length; ++i) {
            printDevice(result[i]);
        }
        res.end();
    });
}

// show 'all-devices'
function getDevices(req, res) {
    db.collection('devices').find().toArray(function (err, result) {
        checkError(err);

        // just in case plain
        res.writeHead(200, {'Content-Type': 'text/plain'});

        var printDevice = function (device) {
            res.write('<tr>');
            res.write('     <td class="center"><input type="checkbox" name="devices" value="' + device._id + '"></td>');
            res.write('     <td width="200em" class="device-hostname break-word">' + device.hostname + '</td>');
            res.write('     <td>' + device.ip + '</td>');
            res.write('     <td>' + device.port + '</td>');
            if (device.ssh_key !== undefined) {
                var array = device.ssh_key.split("/");
                res.write('<td><a class="colorboxed" href="/ssh-key/' + array[2] + '/' + array[3] + '/' + array[4] + '">Key</a></td>');
            }
            res.write('</tr>');
        };

        for (var i = 0; i < result.length; ++i) {
            printDevice(result[i]);
        }
        res.end();
    });
}

// show 'devices:id'
function getDeviceById(req, res) {
    if (req.params.id !== undefined) {
        db.collection('devices').findById(req.params.id, function (err, item) {
            checkError(err);
            if (item === undefined) {
                renderError(res, "Device not found.");
                return;
            }
            var pageData = { formDescription: 'Edit Device',
                formTargetUrl: '/device/edit/' + req.params.id,
                id: req.params.id,
                submitButtonName: 'Save Device',
                username: item.username,
                hostname: item.hostname,
                ip: item.ip,
                port: item.port
            };
            // render
            res.render('device-form', {locals: pageData});
        });
    } else {
        renderError(res, "Device not found.");
    }
}

// show add or edit 'device' form
function getDeviceForm(req, res) {
    // show device by id
    if (req.params.id === undefined) {
        var pageData = { formDescription: 'Add New Device',
            formTargetUrl: '/device',
            id: -1,
            submitButtonName: 'Add Device',
            username: '',
            hostname: '',
            ip: '',
            port: ''
        };
        res.render('device-form', {locals: pageData});
    } else {
        getDeviceById(req, res);
    }
}

/**
 * POST HANDLER
 */

// 'device'
function postDevice(req, res) {

    // parse input
    var username = req.body.username;
    var hostname = req.body.hostname;
    var ip = req.body.ip;
    var port = req.body.port;
    uploadFile(username, req.files.filedata, function (fileurl) {

        var result = {};
        var response = { success: false };

        // validate data
        // TODO validate user input

        /* Building Device JSON */
        var device = {
            username: username,
            hostname: hostname,
            ip: ip,
            port: port,
            ssh_key: fileurl,
            authorized_keys: []
        };

        // insert into db
        db.collection('devices').insert(device, function (err, result) {
            checkError(err);
        });

        // add this device to authorized keys by default
        db.collection('devices').updateById(device._id, { $push: { authorized_keys: device._id }}, function (err, result) {
            checkError(err);
        });

        res.redirect('/');
    });
}

// 'provide-devices'
function postProvideDevices(req, res) {

    // 0) check error
    if (req.body.jsonData === undefined) {// && req.body.jsonData.selected_host === undefined && req.body.jsonData.selected_devices === undefined) {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.write("error");
        res.end();
        return;
    }

    var selected_host = req.body.jsonData.selected_host;
    var selected_devices = req.body.jsonData.selected_devices;

    if (selected_devices === undefined) return;
    if (selected_host === undefined) return;


    var result = '';
//    res.writeHead(200, {'Content-Type': 'text/plain'});
    result += '<textarea class="round shadow textarea" >';

    // 1) update host with selected devices
    db.collection('devices').updateById(selected_host, { $set: { authorized_keys: selected_devices }}, function (err, result) {
        checkError(err);
    });

    // 2) load selected devices from db
    db.collection('devices').findById(selected_host, function (err, result) {
        checkError(err);
        fs.readFile(result.ssh_key, 'utf-8', function (error, data) {
            result += data;
            for (var i = 0; i < selected_devices.length; ++i) {
                db.collection('devices').findById(selected_devices[i], function (err, result) {
                    checkError(err);
                    fs.readFile(result.ssh_key, 'utf-8', function (error, data) {
                        result += data;
                    });
                });
            }

            result += '</textarea>';
        });
    });

    // 3) load files of selected devices from file system


    // 4) build authorized keys
    var authorized_keys_file = "";

    // 5) connect to host

    // 6) upload file

    // 7) feedback to front-end

//    console.log(selected_host);
//    console.log(selected_devices);

    console.log(result);

//    res.writeHead(200, {'Content-Type':'text/plain'});
//    res.write("success");
//    res.end();
    res.redirect('/');
}

// '/ssh-key/:url'
function getSSHKey(req, res) {
    var file_path = "./uploads/" + req.params.user + "/" + req.params.time + "/" + req.params.file;
    fs.readFile(file_path, 'utf-8', function (error, data) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.write('<textarea class="round shadow textarea" >');
        res.write(data);
        res.write("</textarea>");
        res.end();
    });
}

function sshKeyTransfer(req, res) {

    var c = new ssh2();
    c.on('connect', function () {
        console.log('Connection :: connect');
    });
    c.on('ready', function () {
        console.log('Connection :: ready');
        c.exec('uptime', function (err, stream) {
            if (err) throw err;
            stream.on('data', function (data, extended) {
                console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ')
                    + data);
            });
            stream.on('end', function () {
                console.log('Stream :: EOF');
            });
            stream.on('close', function () {
                console.log('Stream :: close');
            });
            stream.on('exit', function (code, signal) {
                console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
                c.end();
            });
        });
    });
    c.on('error', function (err) {
        console.log('Connection :: error :: ' + err);
    });
    c.on('end', function () {
        console.log('Connection :: end');
    });
    c.on('close', function (had_error) {
        console.log('Connection :: close');
    });
    c.connect({
        host: '192.168.178.110',
        port: 22,
        username: 'test',
        privateKey: fs.readFileSync('C://Users//Kibotu//.ssh.js//id_rsa')
    });
}

function updateDevice(req, res) {
    if (req.params.id === undefined) return;
    var device = {
        username: req.body.username,
        hostname: req.body.hostname,
        ip: req.body.ip,
        port: req.body.port
    };
    if (req.files.filedata !== undefined && req.files.filedata.name !== '') {
        uploadFile(device.username, req.files.filedata, function (fileurl) {
            device.ssh_key = fileurl;
            db.collection('devices').updateById(req.params.id, device, function (err, result) {
                checkError(err);
            });
        });
    } else {
        db.collection('devices').updateById(req.params.id, { $set: {username: device.username,
            hostname: device.hostname, ip: device.ip, port: device.port}}, function (err, result) {
            checkError(err);
        });
    }
    res.redirect('/');
}

function deleteDevice(req, res) {
    if (req.params.id === undefined) return;
    db.collection('devices').removeById(req.params.id, function (err, result) {
        checkError(err);
        res.redirect('/');
    });
}

/**
 *  EXPORTS
 */

// GET
exports.getRoot = getRoot;
exports.getDeviceById = getDeviceById;
exports.getDevicesHosts = getDevicesHosts;
exports.getDevices = getDevices;
exports.getSSHKey = getSSHKey;

// JSON
exports.jsonDevices = jsonDevices;

// POST
exports.postDevice = postDevice;
exports.postProvideDevices = postProvideDevices;

// PUT
exports.updateDevice = updateDevice;
exports.postUpdateDevice = updateDevice;

// DELETE
exports.deleteDevice = deleteDevice;
exports.getDeleteDevice = deleteDevice;

// FORMS
exports.getDeviceForm = getDeviceForm;