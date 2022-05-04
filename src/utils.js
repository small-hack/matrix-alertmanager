const utils = {

    getRoomForReceiver: receiver => {
        /*
        Get the right roomId for the given receiver from MATRIX_ROOMS configuration item.

        For is <receiver/roomId> separated by pipe for multiple receiver/rooms.
         */
        const roomConfigs = process.env.MATRIX_ROOMS.split('|')
        let roomId = false
        for (let config of roomConfigs) {
            const roomConfig = config.split('/')
            if (roomConfig[0] === receiver) {
                roomId = roomConfig[1]
                break
            }
        }
        return roomId
    },

    formatAlert: (data, externalURL) => {
        /*
        Format a single alert into a message string.
         */
        let parts = []

        if (data.status === 'firing') {
            if (process.env.MENTION_ROOM === "1") {
                parts.push('@room', '<br>')
            }
            let color = (function(severity) {
                switch(severity) {
                  case 'critical':
                    return '#dc3545'; // red
                  case 'warning':
                    return '#ffc107'; // orange
                  case 'info':
                    return '#17a2b8'; // blue
                  default:
                    return '#999999'; // grey
                }
              })(data.labels.severity);
            parts.push('<strong><font color=\"' + color + '\">FIRING:</font></strong>')
        } else if (data.status === 'resolved') {
            parts.push('<strong><font color=\"#33cc33\">RESOLVED:</font></strong>')
        } else {
            parts.push(data.status.toUpperCase() + ':')
        }

        parts.push('<br>');

        Object.keys(data.labels).forEach((label) => {
            parts.push('<b>' + label + '</b>: ' + data.labels[label] + '<br>')
        });

        Object.keys(data.annotations).forEach((annotation) => {
            parts.push('<b>' + annotation + '</b>: ' + data.annotations[annotation] + '<br>')
        })

        parts.push('<br><a href="', externalURL + data.generatorURL,'">Alert link</a>')

        return parts.join(' ')
    },

    parseAlerts: data => {
        /*
        Parse AlertManager data object into an Array of message strings.
         */
        if (!data.alerts) {
            return []
        }

        console.log(data)

        let alerts = []

        data.alerts.forEach(alert => {
            alerts.push(utils.formatAlert(alert, data.externalURL))
        })
        return alerts
    },
}

module.exports = utils
