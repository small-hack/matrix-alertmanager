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

        let summary = ""
        if (data.annotations.hasOwnProperty("description")) {
            summary = data.annotations.description.split('.')[0];
        } else if (data.labels.hasOwnProperty("alertname")) {
            summary = data.labels.alertname;
        }

        parts.push('<details>')

        let env = data.labels.env ? " (" + data.labels.env + ")" : ""

        if (data.status === 'firing') {
            if (process.env.MENTION_ROOM === "1") {
                parts.push('@room', '<br>')
            }
            let color = (function (severity) {
                switch (severity) {
                    case 'critical':
		        if (process.env.COLOR_CRITICAL) {
			    return process.env.COLOR_CRITICAL;
			} else {
                            return '#f2748a'; // red
			}
                    case 'error':
		        if (process.env.COLOR_ERROR) {
			    return process.env.COLOR_ERROR;
			} else {
                            return '#f289f9'; // magenta
			}
                    case 'warning':
		        if (process.env.COLOR_WARNING) {
			    return process.env.COLOR_WARNING;
			} else {
                            return '#fdcd36'; // yellow
			}
                    case 'info':
		        if (process.env.COLOR_INFO) {
			    return process.env.COLOR_INFO;
			} else {
                            return '#7aa2f7'; // blue
			}
                    default:
		        if (process.env.COLOR_DEFAULT) {
			    return process.env.COLOR_DEFAULT;
			} else {
                            return '#7aa2f7'; // grey
			}
                }
            })(data.labels.severity);
            parts.push('<summary><font color=\"' + color + '\"><b>FIRING</b>: ' + summary + env + '</font></summary>')
        } else if (data.status === 'resolved') {

            // determine best logging color for resolved alerts
	    let resolved_color = "#a8fd57";
	    if (process.env.COLOR_RECOVERED) {
                console.log("COLOR_RECOVERED env contains something for resolved color");
		let resolved_color = process.env.COLOR_RECOVERED;
	    };
            console.log("color process.env.COLOR_RECOVERED is");
            console.log(resolved_color);

            parts.push('<summary><font color=\"' + resolved_color + '\"><b>RESOLVED</b>: ' + summary + env + '</font></summary>')
        } else {
            parts.push('<summary>' + data.status.toUpperCase() + ': ' + summary + env + '</summary>')
        }

        parts.push('<br />\n')

        Object.keys(data.labels).forEach((label) => {
            parts.push('<font color=\"#bdd8ff\"><b>' + label + '</b></font>: ' + data.labels[label] + '<br>\n')
        });

        parts.push('<br />\n')

        Object.keys(data.annotations).forEach((annotation) => {
            if (annotation != "summary" && annotation != "runbook_url" && !annotation.startsWith("logs_")) {
                parts.push('<font color=\"#bdd8ff\"><b>' + annotation + '</b></font>: ' + data.annotations[annotation] + '<br>\n')
            }
        })
        parts.push('</details>')
        parts.push('<br />\n')

        // link generation code
        let url = externalURL + data.generatorURL;
        if (process.env.GRAFANA_URL != "") {
            const left = {
                "datasource": process.env.GRAFANA_DATASOURCE,
                "queries": [
                    {
                        "refId": "A",
                        "expr": new URL(url).searchParams.get('g0.expr'),
                    }
                ],
                "range": { "from": "now-1h", "to": "now" }
            };
            url = process.env.GRAFANA_URL + "/explore?orgId=1&left=" + encodeURIComponent(JSON.stringify(left))
        }
        parts.push('<a href="', url, '">📈 Alert link</a>')

        let logs_url;
        if (!!process.env.GRAFANA_URL &&
            !!process.env.GRAFANA_LOKI_DATASOURCE) {

            let left;
            if (data.labels.hasOwnProperty("env") &&
                data.labels.hasOwnProperty("cluster_id") &&
                data.labels.hasOwnProperty("namespace") &&
                data.labels.hasOwnProperty("pod")) {

                left = {
                    "datasource": process.env.GRAFANA_LOKI_DATASOURCE,
                    "queries": [
                        {
                            "refId": "A",
                            "expr": `{env="${data.labels.env}",cluster_id="${data.labels.cluster_id}",namespace="${data.labels.namespace}",pod="${data.labels.pod}"}`,
                        }
                    ],
                    "range": { "from": "now-15m", "to": "now" }
                };
            } else if (data.labels.hasOwnProperty("env") &&
                data.labels.hasOwnProperty("cluster_id") &&
                data.labels.hasOwnProperty("nodename") &&
                data.labels.hasOwnProperty("exported_job") &&
                data.labels.hasOwnProperty("level")) {

                left = {
                    "datasource": process.env.GRAFANA_LOKI_DATASOURCE,
                    "queries": [
                        {
                            "refId": "A",
                            "expr": `{env="${data.labels.env}",cluster_id="${data.labels.cluster_id}",nodename="${data.labels.nodename}",job="${data.labels.exported_job}",level="${data.labels.level}"}`,
                        }
                    ],
                    "range": { "from": "now-15m", "to": "now" }
                };
            }

            if (!!left) {
                logs_url = process.env.GRAFANA_URL + "/explore?orgId=1&left=" + encodeURIComponent(JSON.stringify(left))
            }
        }

        if(data.annotations.hasOwnProperty("logs_url")) {
            logs_url = data.annotations.logs_url;
        } else if (data.annotations.hasOwnProperty("logs_template")) {
            const now = new Date().getTime();
            const range_ms = (parseInt(data.annotations.logs_minutes) || 15) * 60 * 1000;

            const left = {
                "datasource": data.annotations.logs_datasource || "Loki Core",
                "queries": [{
                    "refId": "A",
                    "expr": data.annotations.logs_template.replace(/\$([a-z0-9_]+)/g, function(_, label) {
                        return data.labels[label] || "";
                    }),
                }],
                "range": {
                    "from": (now - range_ms) + "",
                    "to": now + "",
                },
            };

            logs_url = process.env.GRAFANA_URL + "/explore?orgId=1&left=" + encodeURIComponent(JSON.stringify(left));
        }

        if (process.env.ALERTMANAGER_URL != "") {
            let filter = [];
            Object.keys(data.labels).forEach((label) => {
                filter.push(label + "=\"" + data.labels[label] + "\"");
            })
            let silenceUrl = process.env.ALERTMANAGER_URL + "/#/silences/new?filter={" + encodeURIComponent(filter.join(',')) + "}";
            parts.push('| <a href="' + silenceUrl + '">🔇 Silence</a>')
        }

        if(data.annotations.hasOwnProperty("dashboard_url")) {
            let url = data.annotations.dashboard_url.replace(/\$([a-z0-9_]+)/g, function(_, label) {
                return data.labels[label] || "";
            });

            parts.push('| <a href="', url, '">🚦 Dashboard</a>');
        }

        if(data.annotations.hasOwnProperty("runbook_url")) {
            parts.push('| <a href="', data.annotations.runbook_url, '">🏃 Runbook</a>')
        }

        if(logs_url) {
            parts.push('| <a href="', logs_url, '">🗒️ Logs</a>')
        }

        return parts.join(' ')
    },

    parseAlerts: data => {
        /*
        Parse AlertManager data object into an Array of message strings.
         */
        if (!data.alerts) {
            return []
        }

        console.log(JSON.stringify(data))

        let alerts = []

        data.alerts.forEach(alert => {
            alerts.push(utils.formatAlert(alert, data.externalURL))
        })
        return alerts
    },
}

module.exports = utils
