# MMM-timetable-switzerland

Public transportation timetable for Switzerland based on http://transport.opendata.ch/

## Installation

```shell
# go to the MagicMirror installation
cd MagicMirror

# go to the modules directory
cd modules

# clone the git repository
git clone https://github.com/eobermuhlner/MMM-timetable-switzerland.git
```

## Configuration

The timetable has two basic modes:
- stationboard : show all public transport leaving a specified station
- connections : show all connections between two specified stations or addresses

### Stationboard

Show all public transport leaving a specified station.

Edit the `MagicMirror/config/config.js` file:
```json5
  modules: [
    {
      module: 'MMM-timetable-switzerland',
      position: 'top_right',
      header: 'Zürich',
      config: {
        type: 'stationboard',
        station: 'Zürich'
      }
    }
  ],
```

Mandatory configurations for the `stationboard` are:
- `station` : The station to show all outgoing public transport

Optional configurations for the `stationboard` are:
- `showNextStops` How many next smaller stations should be shown.

  Default: 3

- `showFrom` Controls whether the `from` station should be shown in every row.

  Default: false


### Connections

Show all connections between two specified stations or addresses.

Edit the `MagicMirror/config/config.js` file:
```json5
  modules: [
    {
      module: 'MMM-timetable-switzerland',
      position: 'top_right',
      header: 'Landesmuseum Zürich - Bundeshaus, Bern',
      config: {
        type: "connections",
        from: 'Landesmuseum,Zürich', // from station or address
        to: 'Bundeshaus,Bern' // target station or address
      }
    }
  ],
```

The shown connections will include the estimated walking times.
Use the `showWalk: true` option to make the details of the walking times.

## Screenshots

### Stationboard

```json5
      config: {
        type: 'stationboard',
        station: 'Zürich'
      }
```

![](screenshots/screenshot_stationboard.png)

```json5
      config: {
        type: 'stationboard',
        station: 'Zürich',
        showNextStops: 0
      }
```

![](screenshots/screenshot_stationboard_showNextStops=0.png)

### Connections

```json5
      config: {
        type: "connections",
        from: 'Landesmuseum,Zürich', // from station or address
        to: 'Bundeshaus,Bern' // target station or address
      }
```

![](screenshots/screenshot_connections.png)

```json5
      config: {
        type: "connections",
        from: 'Landesmuseum,Zürich', // from station or address
        to: 'Bundeshaus,Bern', // target station or address
        showWalk: true
      }
```

![](screenshots/screenshot_connections_showWalk.png)


