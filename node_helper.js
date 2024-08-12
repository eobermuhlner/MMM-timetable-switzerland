const NodeHelper = require('node_helper');

module.exports = NodeHelper.create({

    start: function() {
        console.log("Starting node_helper for: " + this.name);
    },

    requestTimetable: function(index, url) {
        fetch(url)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('Request failed with status code ' + response.status);
                }
            })
            .then(result => {
                this.sendSocketNotification('TIMETABLE_RESULT', {
                    index: index,
                    timetable: result
                });
            })
            .catch(error => {
                console.error('Error:', error);
            });
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'GET_TIMETABLE') {
            this.requestTimetable(payload.index, payload.url);
        }
    }
});
