'use strict';

const socket = new WebSocket("wss://auction.afilini.com/");

const amount = document.getElementById('amount');
const next_amount = document.getElementById('next_amount');
const message = document.getElementById('message');
const our_id = document.getElementById('our_id');
const timerText = document.getElementById('timer');
const qrcode = document.getElementById('qrcode');
const invoice = document.getElementById('invoice');

let MIN_BUMP = 1;

Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
}

let timer = {
    interval: null,
    to: new Date(),
    doneCallback: null
};

function countdownInterval() {
    if (timer.to < (new Date())) {
        timerText.innerText = '00:00:00';

        clearInterval(timer.interval);

        if (timer.doneCallback) {
            timer.doneCallback();
        }

        return;
    }

    const left = timer.to - (new Date());
    const fmt = '' + Math.floor(left / 60000).pad(2) + ':' + Math.floor((left % 60000) / 1000).pad(2) + ':' + (left % 1000).pad(3);
    timerText.innerText = fmt;
}

function startCountdown(to, callback) {
    clearInterval(timer.interval);

    timer.to = new Date(to);
    timer.interval = setInterval(countdownInterval, 100);
    timer.doneCallback = callback;
}

function send(msg) {
    socket.send(JSON.stringify(msg));
}

socket.onopen = function () {
    send({action: 'INVOICE'});    
}

function onInvoice(data) {
    new QRCode(qrcode, 'lightning:' + data.invoice);
    invoice.innerText = data.invoice;
}

function setMessage(state) {
    if (state == 'WAITING') {
        message.innerText = 'Waiting for the auction to start...';
    } else if (state == 'RUNNING') {
        message.innerText = 'The auction is running';
    } else if (state == 'DONE') {
        message.innerText = 'The auction has ended';
    }
}

function onState(data) {
    setMessage(data.state.value);
    MIN_BUMP = data.config.min_bump;

    if (data.state.value == 'WAITING') {
        startCountdown(data.state.timeout, () => setMessage('RUNNING'));
    } else if (data.state.value == 'RUNNING') {
        onNewOffer(data.state.highest);
    } else if (data.state.value == 'DONE') {
        onNewOffer(data.state.highest);
    }
}

function onNewOffer(offer) {
    amount.innerText = Math.round(offer.amount / 1000);
    amount.style.color = offer.isOur ? 'green' : 'black';

    next_amount.innerText = offer.isOur ? '' : Math.round((offer.amount + MIN_BUMP) / 1000);

    startCountdown(offer.timeout);
}

socket.onmessage = function (msg) {
    const data = JSON.parse(msg.data);

    switch (data.action) {
        case 'INVOICE':
            onInvoice(data);
            break;
        case 'STATE':
            onState(data);
            break;
        case 'NEW_OFFER':
            console.log(data);
            onNewOffer(data.offer);
            break;
        case 'WIN':
            setMessage('DONE');

            if (data.offer.isOur) {
                our_id.style.display = '';
                our_id.innerText = 'Win ID: ' + data.offer.ourId;
            }

            onNewOffer(data.offer);
            break;

    }
}

