#!/usr/bin/env node

const debug = require('debug')('ln-auctions:index');
const LightningClient = require('lightning-client');

const JSONRpcServer = require('./jsonrpc');
const AuctionsEngine = require('./engine');
const webserver = require('./webserver');

const startDate = new Date();

const server = new JSONRpcServer();
const engine = new AuctionsEngine(startDate);

server.on('getmanifest', (msg) => {
    msg.reply({
        options: [],
        rpcmethods: [],
        subscriptions: [],
        hooks: ["invoice_payment"]
    });
});

server.on('init', (msg) => {
    const client = new LightningClient(msg.configuration['lightning-dir']);
    webserver(client, engine);
});

server.on('invoice_payment', (payment) => {
    if (engine.getState() != 'RUNNING') {
        payment.reply({failure_code: 21});
        return;
    }

    const amount = parseInt(payment.payment.msat.replace('msat', ''));
    debug(amount);

    engine.newOffer(amount, payment.payment.label)
        .then(() => payment.reply({}))
        .catch(() => payment.reply({failure_code: 21}));
});
