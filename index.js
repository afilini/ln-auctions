#!/usr/bin/env node

const debug = require('debug')('ln-auctions:index');
const LightningClient = require('lightning-client');

const JSONRpcServer = require('./jsonrpc');
const AuctionsEngine = require('./engine');
const webserver = require('./webserver');

const startDate = new Date('2019-06-02 15:00:00');

const server = new JSONRpcServer();
const engine = new AuctionsEngine(startDate);

server.on('getmanifest', msg => {
	msg.reply({
		options: [],
		rpcmethods: [{
                    "name": "delayauction",
                    "usage": "[minutes]",
                    "description": "Delay the auction by {minutes}"
                }],
		subscriptions: [],
		hooks: ["invoice_payment"]
	});
}); 

server.on('invoice_payment', msg => {
        debug(msg);
        
        if (engine.getState() != 'RUNNING') {
            msg.reply({failure_code: 21});
            return;
        }

        const amount = parseInt(msg.payment.msat.replace('msat', ''))

        engine.newOffer(amount, msg.payment.label)
            .then(() => msg.reply({}))
            .catch(() => msg.reply({failure_code: 21}));
});

server.on('delayauction', (msg) => {
    if (engine.getState() != 'WAITING') {
        return;
    }

    engine.delay(msg[0]);

    msg.reply({new_start: engine.getStartTime()});
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
