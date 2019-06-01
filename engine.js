'use strict';

const {EventEmitter} = require('events');
const debug = require('debug')('ln-auctions:engine');
const assert = require('assert');

const MIN_BUMP = 1000000;
const OFFER_COOLDOWN_TIME = 45 * 1000;

class AuctionsEngine extends EventEmitter {
    constructor(_startTime) {
        super();

        const _self = this;

        this.startTimeout = null;
        this.startTime = _startTime;
        this.state = 'WAITING'; // WAITING, RUNNING, DONE

        this.highest = {
            amount: 0,
            time: null,
            timeout: null
        };

        this.delayBegin();
}

    delayBegin() {
        const _self = this;
        clearTimeout(_self.startTimeout);

        debug('Delayed begin to', _self.startTime);

        // Delay begin
        const now = new Date();
        _self.startTimeout = setTimeout(() => _self.begin(), Math.max(0, _self.startTime - now));
    }

    delay(minutes) {
        this.startTime = new Date(this.startTime.getTime() + minutes * 1000 * 60);
        this.delayBegin();

        this.emit('start_delayed', {});
    }

    begin() {
        assert(this.state == 'WAITING'); 

        debug('The auction is now running');

        this.state = 'RUNNING';
        this.emit('begin', {});
    }

    newOffer(amount, id) {
        assert(this.state == 'RUNNING'); 
        const _self = this;

        if (amount < this.highest.amount + MIN_BUMP) {
            return Promise.reject();
        }

        this.highest.time = new Date();
        this.highest.timeout = new Date(this.highest.time.getTime() + OFFER_COOLDOWN_TIME);
        this.highest.amount = amount;

        this.emit('new_offer', {
            amount: amount,
            timeout: this.highest.timeout,
            id: id
        });

        return new Promise((resolve, reject) => {
            function win() {
                resolve(); // You won!

                debug('The winner is: ', id);

                _self.emit('win', {amount: amount, id: id});
                _self.end();
            }

            const winTimeout = setTimeout(win, OFFER_COOLDOWN_TIME);
            _self.on('new_offer', (data) => {
                clearTimeout(winTimeout);
                reject(data);
            });
        });
    }

    end() {
        assert(this.state == 'RUNNING');

        this.state = 'DONE';

        debug('The auction is now completed');
    }

    getState() {
        return this.state;
    }

    getStartTime() {
        return this.startTime;
    }

    getHighest() {
        return this.highest;
    }

    getMinBump() {
        return MIN_BUMP;
    }
}

module.exports = AuctionsEngine;
