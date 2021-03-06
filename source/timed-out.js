'use strict';

// Forked from https://github.com/floatdrop/timed-out
// ESOCKETTIMEDOUT - connected, but no response
// ETIMEDOUT - stuck at `connecting` state

module.exports = function (req, time) {
	if (req.timeoutTimer) {
		return req;
	}

	const delays = isNaN(time) ? time : {request: time};
	const host = req._headers ? (' to ' + req._headers.host) : '';

	function throwESOCKETTIMEDOUT() {
		req.abort();
		const e = new Error('Socket timed out on request' + host);
		e.code = 'ESOCKETTIMEDOUT';
		req.emit('error', e);
	}

	function throwETIMEDOUT() {
		req.abort();
		const e = new Error('Connection timed out on request' + host);
		e.code = 'ETIMEDOUT';
		req.emit('error', e);
	}

	if (delays.connect !== undefined) {
		req.timeoutTimer = setTimeout(throwETIMEDOUT, delays.connect);
	}

	if (delays.request !== undefined) {
		req.requestTimeoutTimer = setTimeout(() => {
			clear();

			if (req.connection.connecting || req.connection._connecting) {
				throwETIMEDOUT();
			} else {
				throwESOCKETTIMEDOUT();
			}
		}, delays.request);
	}

	// Clear the connection timeout timer once a socket is assigned to the
	// request and is connected.
	req.on('socket', socket => {
		// Socket may come from Agent pool and may be already connected.
		if (!(socket.connecting || socket._connecting)) {
			connect();
			return;
		}

		socket.once('connect', connect);
	});

	function clear() {
		if (req.timeoutTimer) {
			clearTimeout(req.timeoutTimer);
			req.timeoutTimer = null;
		}
	}

	function connect() {
		clear();

		if (delays.socket !== undefined) {
			// Abort the request if there is no activity on the socket for more
			// than `delays.socket` milliseconds.
			req.setTimeout(delays.socket, throwESOCKETTIMEDOUT);
		}

		req.on('end', () => {
			// The request is finished, cancel request timeout.
			clearTimeout(req.requestTimeoutTimer);
		});
	}

	return req.on('error', clear);
};
