const NodeHelper = require('node_helper');
const request = require('request');

module.exports = NodeHelper.create({

    start: function() {
        console.log("Starting node_helper for: " + this.name);
    },

    requestTimeTable: function(url) {
        request({
            url: url,
            method: 'GET'
        }, (error, response, body) => {
			//console.log(response.statusCode + " : " + body);
            if (!error && response.statusCode == 200) {
                var result = JSON.parse(body);
				this.sendSocketNotification('TIMETABLE_RESULT', result);
            }
        });
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'GET_TIMETABLE') {
            this.requestTimeTable(payload);
        }
    }
});
