'use strict';

const debug = require('debug')('ln-auctions:websocket');
const uuidv4 = require('uuid/v4');

module.exports = function (rpc, engine) {
    return function websocket (ws, req) {
        const id = uuidv4();
        let invoiceGenerated = false;

        debug(`Client ${id} connected`);

        function getStateObj() {
            const currentState = engine.getState();
            const stateObj = {
                action: 'STATE',
                state: {
                    value: currentState
                }
            };

            if (currentState == 'WAITING') {
                stateObj.state.timeout = engine.getStartTime(); 
            } else if (currentState == 'RUNNING' || currentState == 'DONE') {
                stateObj.state.highest = engine.getHighest(); 
            }

            return stateObj;
        }

        function send(obj) {
            try {
                ws.send(JSON.stringify(obj));
            } catch (e) {
            }
        }

        // Send the current state
        send(getStateObj());

        ws.on('message', function(msg) {
            try {
                msg = JSON.parse(msg);
            } catch(e) {
                //debug(e);
                return;
            }

            switch (msg.action) {
                case 'INVOICE':
                    if (invoiceGenerated) {
                        return false;
                    }

                    invoiceGenerated = true;

		    rpc.invoice('any', id, 'ln-auctions invoice')
			.then(inv => send({action: 'INVOICE', invoice: inv.bolt11}));
                break;
            }

            debug(msg);
        });

        function cleanOfferObj(offer) {
            const cleanOffer = {
                amount: offer.amount,
                timeout: offer.timeout,
                isOur: false
            };
            
            if (offer.id == id) {
                cleanOffer.isOur = true;
            }

            return cleanOffer;
        };

        engine.on('new_offer', offer => {
            send({
                action: 'NEW_OFFER',
                offer: cleanOfferObj(offer)
            });
        });

        engine.on('win', offer => {
            send({
                action: 'WIN',
                offer: cleanOfferObj(offer)
            });
        });
    }
};
