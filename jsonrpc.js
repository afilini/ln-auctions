'use strict';

const process = require('process');
const {EventEmitter} = require('events');
const JSONParser = require('jsonparse');
const debug = require('debug')('ln-auctions:jsonrpc');

class JSONRpcServer extends EventEmitter {
	constructor(rx=process.stdin, tx=process.stdout) {
		super();

		this.rx = rx;
		this.tx = tx;

		this.parser = new JSONParser();

		const _self = this;

		this.rx.on('data', chunk => _self.parser.write(chunk));	

		this.parser.onValue = function(val) {
			if (this.stack.length) return; // top-level objects only

			debug('<===', val);
			_self.emit(val.method || 'req', _self.wrapReply(val));
		}
	}

	wrapReply(val) {
		const _self = this;

		val.params['reply'] = (msg) => {
			debug('===> ', msg);

			_self.write({
				id: val.id || 0,
				jsonrpc: '2.0',
				result: msg
			});	
		};

		return val.params;
	}

	write(msg) {
		this.tx.write(JSON.stringify(msg));
	}
}

module.exports = JSONRpcServer;

