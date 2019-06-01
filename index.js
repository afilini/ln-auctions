#!/usr/bin/env node

const debug = require('debug')('ln-auctions:index');
const LightningClient = require('lightning-client');

const JSONRpcServer = require('./jsonrpc');
const AuctionsEngine = require('./engine');
const webserver = require('./webserver');

const startDate = new Date();

const server = new JSONRpcServer();
const engine = new AuctionsEngine(startDate);

const rpc = new LightningClient('/home/user/.lightning/');
webserver(rpc, engine);
