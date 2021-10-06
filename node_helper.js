const NodeHelper = require('node_helper');
const request = require('request');

module.exports = NodeHelper.create({

    start: function() {
        console.log("Starting node_helper for: " + this.name);
    },

    requestConnection: function(index, url) {
        request({
            url: url,
            method: 'GET'
        }, (error, response, body) => {
			//console.log(response.statusCode + " : " + body);
            if (!error && response.statusCode == 200) {
                var result = JSON.parse(body);
				this.sendSocketNotification('CONNECTION_RESULT', {
					index: index,
					timetable: result
				});
            }
        });
    },

    requestStationboard: function(index, url) {
        request({
            url: url,
            method: 'GET'
        }, (error, response, body) => {
			//console.log(response.statusCode + " : " + body);
            if (!error && response.statusCode == 200) {
                var result = JSON.parse(body);
				this.sendSocketNotification('STATIONBOARD_RESULT', {
					index: index,
					timetable: result
				});
            }
        });
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'GET_CONNECTION') {
            this.requestConnection(payload.index, payload.url);
        }
        if (notification === 'GET_STATIONBOARD') {
            this.requestStationboard(payload.index, payload.url);
        }
    }
});
