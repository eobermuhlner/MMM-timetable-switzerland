Module.register("MMM-timetable-switzerland", {
	defaults: {
		refreshHours: 0, // request timetable every x hours (plus refreshMinutes)
		refreshMinutes: 5,  // request timetable every x minutes (plus refreshHours)
		refreshScreenMinutes: 0, // refresh screen timetable every x minutes (plus refreshScreenSeconds)
		refreshScreenSeconds: 1, // refresh screen timetable every x seconds (plus refreshScreenSeconds)
		timetables: [
			{
				type: "connections",
				from: "Landesmuseum, Zürich",
				to: "Bundeshaus, Bern",
				showDepartedMinutes: 1,
				showWalk: true,
				limitDisplay: 4,
			},
			{
				type: "stationboard",
				station: "Zürich",
				limitDisplay: 8,
				opacityFactor: 0.8,
				transportations: [ 'train' ]
			}
		],
		limit: 10, // limit requested number of entries (should be at least limitDisplay)
		transportations: null, // limit transportation types to some of the following: [ 'train', 'tram', 'ship', 'bus', 'cableway' ]
		limitDisplay: 5, // limit displayed number of entries
		opacityFactor: 0.6, // fade out later entries by this factor
		timeFormat: "HH:mm", // time format to display
		showDepartedMinutes: 0, // show already departed connections for x minutes
		showFrom: false, // show the name of departure station
		showTo: false, // show the name of arrival station
		showWalk: false, // show the walking parts of the connection
		showNextStops: 3, // show the number of next stops in "stationboard"
		showTimeUntilDeparture: true, // show the relative time until departure (e.g. "in 2m 15s")
		showTimeUntilDepartureRedLessThanMinutes: 1, // show the relative time until departure in _red_ when less than x minutes
		showTimeUntilDepartureOrangeLessThanMinutes: 2 // show the relative time until departure in _orange_ when less than x minutes
	},

	getScripts: function() {
		return [ "moment.js" ];
	},

	getStyles: function() {
		return [ "MMM-timetable-switzerland.css" ];
	},

	getTranslations: function() {
		return {
			en: "translations/en.json",
			de: "translations/de.json"
		};
	},

	start: function () {
		var self = this;

		self.timetableUrls = [];
		self.timetables = [];

		for (timetable of self.config.timetables) {
			if (timetable.type === 'connections') {
				var url = "http://transport.opendata.ch/v1";
				url += "/connections";
				url += "?from=" + timetable.from;
				url += "&to=" + timetable.to;
				var limit = self.firstValue(timetable.limit, self.config.limit);
				if (limit) {
					url += "&limit=" + limit;
				}
				var transportations = self.firstValue(timetable.transportations, self.config.transportations);
				if (transportations) {
					url += "&transportations=" + transportations;
				}
				self.timetableUrls.push(url);
				self.timetables.push(null);
			} else {
				var url = "http://transport.opendata.ch/v1";
				url += "/stationboard";
				url += "?station=" + timetable.station;
				var limit = self.firstValue(timetable.limit, self.config.limit);
				if (limit) {
					url += "&limit=" + limit;
				}
				var transportations = self.firstValue(timetable.transportations, self.config.transportations);
				if (transportations) {
					url += "&transportations=" + transportations;
				}
				self.timetableUrls.push(url);
				self.timetables.push(null);
			}
		}
	},

	getDom: function() {
		var self = this;

		var wrapper = document.createElement("div");

		for (i = 0; i < self.timetables.length; i++) {
			if (self.timetables[i]) {
				if (self.config.timetables[i].type === 'connections') {
					var div = document.createElement("div");
					div.className = "medium connection-header";

					var span = document.createElement("span");
					span.innerHTML = self.config.timetables[i].from;
					span.className = "dimmed station-name connection-from"
					div.appendChild(span);

					var span = document.createElement("span");
					span.innerHTML = self.config.timetables[i].to;
					span.className = "bright station-name connection-to"
					div.appendChild(span);

					wrapper.appendChild(div);

					dom = self.getConnectionsDom(self.timetables[i], self.config.timetables[i]);
					wrapper.appendChild(dom);
				} else {
					var div = document.createElement("div");
					div.className = "medium stationboard-header";

					var span = document.createElement("span");
					span.innerHTML = self.config.timetables[i].station;
					span.className = "bright station-name stationboard-station"
					div.appendChild(span);

					wrapper.appendChild(div);

					dom = self.getStationboardDom(self.timetables[i], self.config.timetables[i]);
					wrapper.appendChild(dom);
				}
			} else {
				var div = document.createElement("div");
				div.innerHTML = self.translate("LOADING");
				div.className = "dimmed light small";
				wrapper.appendChild(div);
			}
		}

		return wrapper;
	},

	getStationboardDom: function(data, config) {
		var self = this;

		var now = moment();

		var limitDisplay = self.firstValue(config.limitDisplay, self.config.limitDisplay);
		var opacityFactor = self.firstValue(config.opacityFactor, self.config.opacityFactor);
		var showDepartedMinutes = self.firstValue(config.showDepartedMinutes, self.config.showDepartedMinutes);
		var showTimeUntilDeparture = self.firstValue(config.showTimeUntilDeparture, self.config.showTimeUntilDeparture);
		var showTimeUntilDepartureRedLessThanMinutes = self.firstValue(config.showTimeUntilDepartureRedLessThanMinutes, self.config.showTimeUntilDepartureRedLessThanMinutes);
		var showTimeUntilDepartureOrangeLessThanMinutes = self.firstValue(config.showTimeUntilDepartureOrangeLessThanMinutes, self.config.showTimeUntilDepartureOrangeLessThanMinutes);
		var showNextStops = self.firstValue(config.showNextStops, self.config.showNextStops);
		var timeFormat = self.firstValue(config.timeFormat, self.config.timeFormat);

		table = document.createElement("table");
		table.className = "small";

		tbody = document.createElement("tbody");
		table.appendChild(tbody);

		var displayCount = 0;
		var opacity = 1.0;
		for (let i = 0; i < data.stationboard.length; i++) {
			var journey = data.stationboard[i];

			if (journey.stop.departure) {
				var mom = moment(journey.stop.departure);
				if (journey.stop.delay && journey.stop.delay > 0) {
					mom.add(connection.from.delay, 'minutes');
				}
				var millisUntilDeparture = mom.diff(now);
				if (millisUntilDeparture <= -showDepartedMinutes * 60*1000) {
					continue;
				}
			}

			if (displayCount++ >= limitDisplay) {
				continue;
			}

			tr = document.createElement("tr");
			tr.style.opacity = opacity;
			opacity = opacity * opacityFactor;
			tbody.appendChild(tr);

			if (showTimeUntilDeparture) {
				td = document.createElement("td");
				if (journey.stop.departure) {
					var mom = moment(journey.stop.departure);
					if (journey.stop.delay && journey.stop.delay > 0) {
						mom.add(connection.from.delay, 'minutes');
					}
					var millisUntilDeparture = mom.diff(now);
					td.innerHTML = self.humanizeDepartureMillis(millisUntilDeparture);
					td.className = "dimmed xsmall align-left time-until-departure";
					td.style.min
					if (millisUntilDeparture < showTimeUntilDepartureRedLessThanMinutes*60*1000) {
						td.className += " red";
					} else if (millisUntilDeparture < showTimeUntilDepartureOrangeLessThanMinutes*60*1000) {
						td.className += " orange";
					}
				}
				tr.appendChild(td);
			}

			td = document.createElement("td");
			if (journey.stop.departure) {
				var mom = moment(journey.stop.departure);
				td.innerHTML = mom.format(timeFormat);
				td.className = "bright departure-time";
			}
			tr.appendChild(td);

			td = document.createElement("td");
			if (journey.stop.delay && journey.stop.delay > 0) {
				td.innerHTML = "+" + journey.stop.delay;
				td.className = "bright red departure-delay";
			}
			tr.appendChild(td);

			td = document.createElement("td");
			td.innerHTML = journey.category;
			td.className = "bright journey-category";
			tr.appendChild(td);

			td = document.createElement("td");
			td.innerHTML = journey.number;
			td.className = "align-left bright journey-number";
			tr.appendChild(td);

			if (showNextStops > 0) {
				for (let stopIndex = 0; stopIndex < showNextStops; stopIndex++) {
					td = document.createElement("td");
					if (stopIndex+1 < journey.passList.length-1) { // do not show index 0 (current station) and last index (final destination)
						td.innerHTML = journey.passList[stopIndex+1].station.name;
					}
					td.className = "dimmed xsmall station-name";
					tr.appendChild(td);
				}
			}

			td = document.createElement("td");
			td.innerHTML = journey.to;
			td.className = "bright station-name";
			tr.appendChild(td);

			td = document.createElement("td");
			td.innerHTML = journey.stop.platform;
			td.className = "dimmed platform"
			tr.appendChild(td);

			tr.appendChild(td);
		}

		return table;
	},

	getConnectionsDom: function(data, config) {
		var self = this;

		var now = moment();

		var limitDisplay = self.firstValue(config.limitDisplay, self.config.limitDisplay);
		var opacityFactor = self.firstValue(config.opacityFactor, self.config.opacityFactor);
		var showDepartedMinutes = self.firstValue(config.showDepartedMinutes, self.config.showDepartedMinutes);
		var showTimeUntilDeparture = self.firstValue(config.showTimeUntilDeparture, self.config.showTimeUntilDeparture);
		var showTimeUntilDepartureRedLessThanMinutes = self.firstValue(config.showTimeUntilDepartureRedLessThanMinutes, self.config.showTimeUntilDepartureRedLessThanMinutes);
		var showTimeUntilDepartureOrangeLessThanMinutes = self.firstValue(config.showTimeUntilDepartureOrangeLessThanMinutes, self.config.showTimeUntilDepartureOrangeLessThanMinutes);
		var showFrom = self.firstValue(config.showFrom, self.config.showFrom);
		var showTo = self.firstValue(config.showTo, self.config.showTo);
		var timeFormat = self.firstValue(config.timeFormat, self.config.timeFormat);

		table = document.createElement("table");
		table.className = "small";

		tbody = document.createElement("tbody");
		table.appendChild(tbody);

		var maxSections = 0;
		for (let i = 0; i < data.connections.length; i++) {
			maxSections = Math.max(maxSections, data.connections[i].sections.length);
		}

		var displayCount = 0;
		var opacity = 1.0;
		for (let i = 0; i < data.connections.length; i++) {
			var connection = data.connections[i];

			if (connection.from.departure) {
				var mom = moment(connection.from.departure);
				if (connection.from.delay && connection.from.delay > 0) {
					mom.add(connection.from.delay, 'minutes');
				}
				var millisUntilDeparture = mom.diff(now);
				if (millisUntilDeparture  <= -showDepartedMinutes * 60*1000) {
					continue;
				}
			}

			if (displayCount++ >= limitDisplay) {
				continue;
			}

			tr = document.createElement("tr");
			tr.style.opacity = opacity;
			opacity = opacity * opacityFactor;
			tbody.appendChild(tr);

			if (showTimeUntilDeparture) {
				td = document.createElement("td");
				if (connection.from.departure) {
					var mom = moment(connection.from.departure);
					if (connection.from.delay && connection.from.delay > 0) {
						mom.add(connection.from.delay, 'minutes');
					}
					var millisUntilDeparture = mom.diff(now);
					td.innerHTML = self.humanizeDepartureMillis(millisUntilDeparture);
					td.className = "dimmed xsmall align-left time-until-departure";
					if (millisUntilDeparture < showTimeUntilDepartureRedLessThanMinutes*60*1000) {
						td.className += " red";
					} else if (millisUntilDeparture < showTimeUntilDepartureOrangeLessThanMinutes*60*1000) {
						td.className += " orange";
					}
				}
				tr.appendChild(td);
			}

			td = document.createElement("td");
			if (connection.from.departure) {
				var mom = moment(connection.from.departure);
				td.innerHTML = mom.format(timeFormat);
				td.className = "bright departure-time";
			}
			tr.appendChild(td);

			td = document.createElement("td");
			if (connection.from.delay && connection.from.delay > 0) {
				td.innerHTML = "+" + connection.from.delay;
				td.className = "bright red departure-delay";
			}
			tr.appendChild(td);

			if (showFrom) {
				td = document.createElement("td");
				td.innerHTML = connection.from.station.name;
				td.className = "dimmed station-name"
				tr.appendChild(td);
			}

			for (let sectionIndex = 0; sectionIndex < maxSections; sectionIndex++) {
				if (sectionIndex < connection.sections.length && (showWalk || !connection.sections[sectionIndex].walk)) {
					var section = connection.sections[sectionIndex];

					if (showFrom || sectionIndex > 0) {
						td = document.createElement("td");
						if (section.departure) {
							var mom = moment(section.departure.departure);
							td.innerHTML = mom.format(timeFormat);
							td.className = "dimmed xsmall departure-time";
						}
						tr.appendChild(td);

						td = document.createElement("td");
						if (section.delay && section.delay > 0) {
							td.innerHTML = "+" + section.delay;
							td.className = "bright xsmall red departure-delay";
						}
						tr.appendChild(td);

						td = document.createElement("td");
						td.innerHTML = section.departure.station.name;
						td.className = "xsmall align-left station-name";
						tr.appendChild(td);
					} else {
						td = document.createElement("td");
						tr.appendChild(td);

						td = document.createElement("td");
						tr.appendChild(td);

						td = document.createElement("td");
						tr.appendChild(td);
					}

					if (section.walk) {
						td = document.createElement("td");
						td.className = "fa fa-walking bright"
						tr.appendChild(td);

						td = document.createElement("td");
						tr.appendChild(td);
					} else if (section.journey) {
						td = document.createElement("td");
						td.innerHTML = section.journey.category;
						td.className = "bright journey-category";
						tr.appendChild(td);

						td = document.createElement("td");
						td.innerHTML = section.journey.number;
						td.className = "bright align-left journey-number";
						tr.appendChild(td);
					}
				} else {
					td = document.createElement("td");
					tr.appendChild(td);
					td = document.createElement("td");
					tr.appendChild(td);
					td = document.createElement("td");
					tr.appendChild(td);
					td = document.createElement("td");
					tr.appendChild(td);
					td = document.createElement("td");
					tr.appendChild(td);
				}
			}

			if (showTo) {
				td = document.createElement("td");
				td.innerHTML = connection.to.station.name;
				td.className = "station-name";
				tr.appendChild(td);
			}

			td = document.createElement("td");
			if (connection.to.arrival) {
				var mom = moment(connection.to.arrival);
				td.innerHTML = mom.format(timeFormat);
				td.className = "arrival-time";
			}
			td.className = "bright"
			tr.appendChild(td);

			td = document.createElement("td");
			var durationFields = connection.duration.split(/[d:]/);
			if (durationFields[0] > 0) {
				var span = document.createElement("span");
				span.innerHTML = parseInt(durationFields[0]) + self.translate("DAYS_SHORT") + " ";
				span.className = "journey-duration-days";
				td.appendChild(span);
			}
			if (durationFields[1] > 0) {
				var span = document.createElement("span");
				span.innerHTML = parseInt(durationFields[1]) + self.translate("HOURS_SHORT") + " ";
				span.className = "journey-duration-hours";
				td.appendChild(span);
			}
			if (durationFields[2] > 0) {
				var span = document.createElement("span");
				span.innerHTML = durationFields[2] + self.translate("MINUTES_SHORT") + " ";
				span.className = "journey-duration-minutes";
				td.appendChild(span);
			}
			td.className = "dimmed xsmall journey-duration";
			tr.appendChild(td);

			tr.appendChild(td);
		}

		return table;
	},

	padDigits: function (v, length) {
		return v.toString().padStart(length, '0');
	},

	humanizeDepartureMillis: function (millis) {
		var self = this;

		var isInFuture = true;
		if (millis < 0) {
			millis = -millis;
			isInFuture = false;
		}

		millis = millis + 30*1000;

		var hours = Math.floor(millis / 1000/60/60);
		var minutes = Math.floor((millis - hours * 1000*60*60) /1000/60);
		if (hours == 0 && minutes == 0) {
			return self.translate("TIME_NOW");
		}

		var text = "";
		if (hours > 0) {
			text += hours + self.translate("HOURS_SHORT");
		}
		if (hours > 0 && minutes > 0) {
			text += " ";
			if (minutes < 10) {
				text += "0";
			}
		}
		if (minutes > 0) {
			text += minutes + self.translate("MINUTES_SHORT");
		}

		if (isInFuture) {
			return self.translate("TIME_IN", {time: text});
		} else {
			return self.translate("TIME_AGO", {time: text});
		}
	},

	firstValue: function() {
		for (arg of arguments) {
			if (arg != null) {
				return arg;
			}
		}
		return null;
	},

	getTimeTable: function() {
		var self = this;

		if (self.timetableUrls && self.timetableUrls.length > 0) {
			for (i = 0; i < self.timetableUrls.length; i++) {
				self.sendSocketNotification('GET_TIMETABLE', {
					index: i,
					url: self.timetableUrls[i]
				});
			}
		}
	},

	notificationReceived: function(notification, payload, sender) {
		var self = this;

		switch(notification) {
			case "DOM_OBJECTS_CREATED":
				self.getTimeTable();

				var timer = setInterval(()=>{
					self.updateDom();
				}, self.config.refreshScreenMinutes*60*1000 + self.config.refreshScreenSeconds*1000);

				var timer = setInterval(()=>{
					self.getTimeTable();
				}, self.config.refreshHours*60*60*1000 + self.config.refreshMinutes*60*1000);
				break;
			}
	},

	socketNotificationReceived: function(notification, payload) {
		var self = this;

		if (notification === 'TIMETABLE_RESULT') {
			self.timetables[payload.index] = payload.timetable;
			self.updateDom();
		}
	},

})
