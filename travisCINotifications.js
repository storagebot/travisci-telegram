'use strict';

let TravisCINotifications = function TravisCIHook() {
    const express = require("express"),
          app = express(),
          bodyParser = require('body-parser');

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.post('/notify', (req, res) => {
        this.emit('notify', req.query.secret, JSON.parse(req.body.payload));
        res.send();
    });

    this.startWebhook = (port) => {
        app.listen(port);
    }
};

require('util').inherits(TravisCINotifications, require('events').EventEmitter);

module.exports = TravisCINotifications;