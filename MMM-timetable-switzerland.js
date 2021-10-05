Module.register("MMM-timetable-switzerland", {
	defaults: {
		refreshHours: 0, // request timetable every x hours (plus refreshMinutes)
		refreshMinutes: 5,  // request timetable every x minutes (plus refreshHours)
		refreshScreenMinutes: 0, // refresh screen timetable every x minutes (plus refreshScreenSeconds)
		refreshScreenSeconds: 1, // refresh screen timetable every x seconds (plus refreshScreenSeconds)
		type: "stationboard", // allowed: "stationboard", "connections"
		station: "Zürich", // in "stationboard" show this station
		from: "Zürich", // in "connections" use this departure station or address
		to: "Basel", // in "connections" use this arrival station or address
		limit: 10, // limit requested number of entries (should be at least limitDisplay)
		limitDisplay: 5, // limit displayed number of entries
		opacityFactor: 0.8, // fade out later entries by this factor
		timeFormat: "HH:mm", // time format to display
		showFrom: false, // show the name of departure station
		showTo: false, // show the name of arrival station
		showWalk: false, // show the walking parts of the connection
		showNextStops: 3, // show the number of next stops in "stationboard"
		showTimeUntilDeparture: true, // show the relative time until departure (e.g. "in 2m 15s")
		showTimeUntilDepartureLessThanMinutes: 60, // show the relative time until departure when less than x minutes
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

		self.url = "http://transport.opendata.ch/v1";
		if (self.config.type === 'stationboard') {
			self.url += "/stationboard";
			self.url += "?station=" + self.config.station;
		}
		if (self.config.type === 'connections') {
			self.url += "/connections";
			self.url += "?from=" + self.config.from;
			self.url += "&to=" + self.config.to;
		}
		if (self.config.limit) {
			self.url += "&limit=" + self.config.limit;
		}

		self.timetable = null;
	},

	getDom: function() {
		var self = this;

		var wrapper = document.createElement("div");

		if (!self.timetable) {
			wrapper.innerHTML = self.translate("LOADING");
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (self.timetable.stationboard) {
			dom = self.getStationboardDom(self.timetable);
			wrapper.appendChild(dom);
		}
		if (self.timetable.connections) {
			dom = self.getConnectionsDom(self.timetable);
			wrapper.appendChild(dom);
		}

		return wrapper;
	},

	getStationboardDom: function(data) {
		var self = this;

		var now = moment();

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
				if (millisUntilDeparture <= 0) {
					continue;
				}
			}

			if (displayCount++ >= self.config.limitDisplay) {
				continue;
			}

			tr = document.createElement("tr");
			tr.style.opacity = opacity;
			opacity = opacity * self.config.opacityFactor;
			tbody.appendChild(tr);

			td = document.createElement("td");
			if (journey.stop.departure && self.config.showTimeUntilDeparture) {
				var mom = moment(journey.stop.departure);
				if (journey.stop.delay && journey.stop.delay > 0) {
					mom.add(connection.from.delay, 'minutes');
				}
				var millisUntilDeparture = mom.diff(now);
				td.innerHTML = self.humanizeDepartureMillis(millisUntilDeparture);
				td.className = "dimmed xsmall time-until-departure";
				td.style.min
				if (millisUntilDeparture < self.config.showTimeUntilDepartureRedLessThanMinutes*60*1000) {
					td.className += " red";
				} else if (millisUntilDeparture < self.config.showTimeUntilDepartureOrangeLessThanMinutes*60*1000) {
					td.className += " orange";
				}
			}
			tr.appendChild(td);

			td = document.createElement("td");
			if (journey.stop.departure) {
				var mom = moment(journey.stop.departure);
				td.innerHTML = mom.format(self.config.timeFormat);
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

			if (self.config.showNextStops > 0) {
				for (let stopIndex = 0; stopIndex < self.config.showNextStops; stopIndex++) {
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

	getConnectionsDom: function(data) {
		var self = this;

		var now = moment();

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
				if (millisUntilDeparture <= 0) {
					continue;
				}
			}

			if (displayCount++ >= self.config.limitDisplay) {
				continue;
			}

			tr = document.createElement("tr");
			tr.style.opacity = opacity;
			opacity = opacity * self.config.opacityFactor;
			tbody.appendChild(tr);

			td = document.createElement("td");
			if (connection.from.departure && self.config.showTimeUntilDeparture) {
				var mom = moment(connection.from.departure);
				if (connection.from.delay && connection.from.delay > 0) {
					mom.add(connection.from.delay, 'minutes');
				}
				var millisUntilDeparture = mom.diff(now);
				td.innerHTML = self.humanizeDepartureMillis(millisUntilDeparture);
				td.className = "dimmed xsmall time-until-departure";
				if (millisUntilDeparture < self.config.showTimeUntilDepartureRedLessThanMinutes*60*1000) {
					td.className += " red";
				} else if (millisUntilDeparture < self.config.showTimeUntilDepartureOrangeLessThanMinutes*60*1000) {
					td.className += " orange";
				}
			}
			tr.appendChild(td);

			td = document.createElement("td");
			if (connection.from.departure) {
				var mom = moment(connection.from.departure);
				td.innerHTML = mom.format(self.config.timeFormat);
				td.className = "bright departure-time";
			}
			tr.appendChild(td);

			td = document.createElement("td");
			if (connection.from.delay && connection.from.delay > 0) {
				td.innerHTML = "+" + connection.from.delay;
				td.className = "bright red departure-delay";
			}
			tr.appendChild(td);

			if (self.config.showFrom) {
				td = document.createElement("td");
				td.innerHTML = connection.from.station.name;
				td.className = "dimmed station-name"
				tr.appendChild(td);
			}

			for (let sectionIndex = 0; sectionIndex < maxSections; sectionIndex++) {
				if (sectionIndex < connection.sections.length && (self.config.showWalk || !connection.sections[sectionIndex].walk)) {
					var section = connection.sections[sectionIndex];

					if (self.config.showFrom || sectionIndex > 0) {
						td = document.createElement("td");
						if (section.departure) {
							var mom = moment(section.departure.departure);
							td.innerHTML = mom.format(self.config.timeFormat);
							td.className = "dimmed departure-time";
						}
						tr.appendChild(td);

						td = document.createElement("td");
						if (section.delay && section.delay > 0) {
							td.innerHTML = "+" + section.delay;
							td.className = "bright red departure-delay";
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

			if (self.config.showTo) {
				td = document.createElement("td");
				td.innerHTML = connection.to.station.name;
				td.className = "station-name";
				tr.appendChild(td);
			}

			td = document.createElement("td");
			if (connection.to.arrival) {
				var mom = moment(connection.to.arrival);
				td.innerHTML = mom.format(self.config.timeFormat);
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

		if (Math.abs(millis) <= 1*1000) {
			return self.translate("TIME_NOW");
		} else if (millis < 0) {
			return self.translate("TIME_AGO", {time: self.humanizeMillis(-millis)});
		} else if (millis < self.config.showTimeUntilDepartureLessThanMinutes*60*1000) {
			return self.translate("TIME_IN", {time: self.humanizeMillis(millis)});
		} else {
			return self.translate("TIME_FAR_FUTURE", {time: self.humanizeMillis(millis)});
		}
	},

	humanizeMillis: function (millis) {
		var self = this;

		var hours = Math.floor(millis / 1000/60/60);
		var minutes = Math.floor((millis - hours * 1000*60*60) /1000/60);
		var seconds = Math.floor((millis - hours * 1000*60*60 - minutes * 1000*60) / 1000);
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
		if (minutes > 0 && seconds > 0) {
			text += " ";
			if (seconds < 10) {
				text += "0";
			}
		}
		if (seconds > 0) {
			text += seconds + self.translate("SECONDS_SHORT");
		}
		return text;
	},

	getTimeTable: function() {
		var self = this;
		self.sendSocketNotification('GET_TIMETABLE', self.url);
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

	processTimeTable: function(data) {
		var self = this;

		self.timetable = data;
	},

	socketNotificationReceived: function(notification, payload) {
		var self = this;

		if (notification === 'TIMETABLE_RESULT') {
			self.processTimeTable(payload);
			self.updateDom();
		}
	},

})
