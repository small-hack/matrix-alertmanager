<a href="https://github.com/small-hack/matrix-alertmanager/releases"><img src="https://img.shields.io/github/v/release/small-hack/matrix-alertmanager?style=plastic&labelColor=blue&color=green&logo=GitHub&logoColor=white"></a> [![](https://img.shields.io/docker/pulls/jessebot/matrix-alertmanager-bot.svg)](https://cloud.docker.com/u/jessebot/repository/docker/jessebot/matrix-alertmanager-bot)

# Matrix-Alertmanager

A bot to receive Prometheus Alertmanager webhook events and forward them to chosen matrix rooms.

<img width="705" alt="Screenshot of matrix markdown formatted alertmanager bot with collapsed short description of alert" src="https://github.com/small-hack/matrix-alertmanager/assets/2389292/1ce99573-5115-4f57-bbcd-3378fd55dd1d">

<details>
  <summary>Click me to see what the alerts look like when they're not collapsed</summary>

<img width="701" alt="Screenshot of matrix markdown formatted alertmanager bot with expanded info on each alert" src="https://github.com/small-hack/matrix-alertmanager/assets/2389292/d1544193-e86b-4971-a1d2-809eb227a1b4">

</details>

### Main features

* Uses pre-created Matrix user to send alerts using token auth
  * you can also use an [application service](https://spec.matrix.org/v1.11/application-service-api/) to register a new user
* Configurable room per alert receiver
* Automatic joining of configured rooms. Private rooms require an invite
* Secret key authentication with Alertmanager
* HTML formatted messages
* Optionally mentions `@room` on firing alerts
* Optionally set the bot user's display name and avatar

# How to use

## Running the bot in a Docker container

We host a docker image that builds nightly here: [jessebot/matrix-alertmanager-bot](https://hub.docker.com/repository/docker/jessebot/matrix-alertmanager-bot). Checkout out [`.env.default`](./.env.default) for the possible env vars to pass in.

## Setting up Alertmanager

You will need to configure a webhook receiver in Alertmanager. It should looks something like this:

```yaml
receivers:
- name: 'myreceiver'
  webhook_configs:
  - url: 'https://my-matrix-alertmanager.tld/alerts?secret=veryverysecretkeyhere'
```

The secret key obviously should match the one in the alertmanager configuration.

## Styling Prometheus rules

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

## Running in Kubernetes

[small-hack/matrix-chart](https://github.com/small-hack/matrix-chart) is a matrix stack for Kubernetes that includes this bot.

## TODO

* Registering an account instead of having to use an existing account

## Tech

- Node 22
- Express
- Matrix JS SDK

## Authors and Maintainers

This project was originally created by [Jason Robinson](https://jasonrobinson.me) and then it was forked by [beeper/matrix-alertmanager] but they didn't add their own copyright notice, and then I, [@jessebot](https://github.com/jessebot), from [@small-hack](https://github.com/small-hack) forked it as well.

I've started cleaning up the security alerts and adding plan on renovatebot to keep it all up to date. I'll try to also create some PRs to update the other codebases as well :)

## License

[MIT](./LICENSE)
