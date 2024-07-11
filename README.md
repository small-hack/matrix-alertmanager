[![](https://img.shields.io/docker/pulls/jessebot/matrix-alertmanager-bot.svg)](https://cloud.docker.com/u/jessebot/repository/docker/jessebot/matrix-alertmanager-bot)

# Matrix-Alertmanager

![](./screenshot.png)

A bot to receive Prometheus Alertmanager webhook events and forward them to chosen matrix rooms.

Main features:

* Uses pre-created Matrix user to send alerts using token auth.
* Configurable room per alert receiver.
* Automatic joining of configured rooms. Private rooms require an invite.
* Secret key authentication with Alertmanager.
* HTML formatted messages.
* Optionally mentions `@room` on firing alerts

## How to use

### Configuration

Whether running manually or via the Docker image, the configuration is set
via environment variables. When running manually, copy `.env.default`
into `.env`, set the values and they will be loaded automatically.
When using the Docker image, set the environment variables when running
the container.

### Docker


### Alertmanager

You will need to configure a webhook receiver in Alertmanager. It should looks something like this:

```yaml
receivers:
- name: 'myreceiver'
  webhook_configs:
  - url: 'https://my-matrix-alertmanager.tld/alerts?secret=veryverysecretkeyhere'
```

The secret key obviously should match the one in the alertmanager configuration.

### Prometheus rules

Add some styling to your prometheus rules

```yaml
rules:
- alert: High Memory Usage of Container
  annotations:
    description: Container named <strong>{{\$labels.container_name}}</strong> in <strong>{{\$labels.pod_name}}</strong> in <strong>{{\$labels.namespace}}</strong> is using more than 75% of Memory Limit
  expr: |
    ((( sum(container_memory_usage_bytes{image!=\"\",container_name!=\"POD\", namespace!=\"kube-system\"}) by (namespace,container_name,pod_name, instance)  / sum(container_spec_memory_limit_bytes{image!=\"\",container_name!=\"POD\",namespace!=\"kube-system\"}) by (namespace,container_name,pod_name, instance) ) * 100 ) < +Inf ) > 75
  for: 5m
  labels:
    team: dev
```

NOTE! Currently the bot cannot talk HTTPS, so you need to have a reverse proxy in place to terminate SSL, or use unsecure unencrypted connections.

## TODO

* Registering an account instead of having to use an existing account

## Tech

- Node 22
- Express
- Matrix JS SDK

## Status

This project was originally created by [Jason Robinson](https://jasonrobinson.me) / @jaywink:federator.dev

It is now maintained by [small-hack](https://github.com/small-hack) and [@jessebot](https://github.com/jessebot).

## License

[MIT](./LICENSE)
