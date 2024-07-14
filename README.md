<a href="https://github.com/small-hack/matrix-alertmanager/releases"><img src="https://img.shields.io/github/v/release/small-hack/matrix-alertmanager?style=plastic&labelColor=blue&color=green&logo=GitHub&logoColor=white"></a> [![](https://img.shields.io/docker/pulls/jessebot/matrix-alertmanager-bot.svg)](https://cloud.docker.com/u/jessebot/repository/docker/jessebot/matrix-alertmanager-bot)

# Matrix-Alertmanager

A bot to receive Prometheus Alertmanager webhook events and forward them to chosen matrix rooms.

<img width="705" alt="Screenshot of matrix markdown formatted alertmanager bot with collapsed short description of alert" src="https://github.com/user-attachments/assets/b2f96f63-f89e-4953-a572-7541a1cf6f19">

<details>
  <summary>Click me to see what the alerts look like when they're not collapsed</summary>

<img width="701" alt="Screenshot of matrix markdown formatted alertmanager bot with expanded info on each alert" src="https://github.com/user-attachments/assets/7cc008a6-1309-4df9-96e8-66f07e179f20">

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

We host a docker image that builds nightly here: [jessebot/matrix-alertmanager-bot](https://hub.docker.com/repository/docker/jessebot/matrix-alertmanager-bot). Nightly builds are tagged with `main`. Checkout out [`.env.default`](./.env.default) for the possible env vars to pass in.

## Registering the Application Service with matrix
Matrix has a concept of [application services](https://spec.matrix.org/v1.11/application-service-api/) (often called an appservice), for bot services/users. To register this bot as an application service, you need to create a registration yaml file, such as `alertmanager.yaml` that's accessible locally to your matrix homeserver (such as synapse), and it should have the following contents:

```yaml
# A unique, user-defined ID of the application service which will never change.
id: alertmanager
# The URL for the application service. May include a path after the domain name.
# Optionally set to null if no traffic is required.
# this is an example but it can be whatever URL and port you host this bot at
url: http://matrix-stack-bridge-alertmanager:3000
#  Whether requests from masqueraded users are rate-limited. The sender is excluded.
rate_limited: false
# The localpart of the user associated with the application service.
# Events will be sent to the AS if this user is the target of the event, or is a
# joined member of the room where the event occurred.
sender_localpart: alertmanager
# A secret token that the application service will use to authenticate requests to the homeserver.
as_token: "soemthingverysecurebutdefinitelynotthisexactstringuseyourbestjudgementwitharandomgenerator"
# A secret token that the homeserver will use authenticate requests to the application service.
hs_token: "soemthingelseverysecurebutdefinitelynotthisexactstringuseyourbestjudgementwitharandomgenerator"
# The namespaces that the application service is interested in.
# https://spec.matrix.org/v1.11/application-service-api/#definition-registration_namespaces
namespaces:
  # https://spec.matrix.org/v1.11/application-service-api/#definition-registration_namespace
  users:
    - exclusive: true
      regex: "^@alertmanager.*:mymatrix.server.tld$"
    - exclusive: true
      regex: "^@:mymatrix.server.tld$"
```

Then, in your `homeserver.yaml`, you need to include reference to the above registration yaml file, so for example, if you saved that file to `/bridges/alertmanager.yaml`, you'd add the following to your homeserver config:

```yaml
# A list of application service config files to use
app_service_config_files:
  - "/bridges/alertmanager.yaml"
```

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

[small-hack/matrix-chart](https://github.com/small-hack/matrix-chart) is a matrix stack for Kubernetes that includes this bot. In your values.yaml include:

```yaml
bridges:
  alertmanager:
    enabled: true
    image:
      # -- alertmanager bridge docker image
      repository: "jessebot/matrix-alertmanager-bot"
      # -- alertmanager bridge docker image tag
      tag: "0.11.0"
      # -- alertmanager bridge docker image pull policy. If tag is "latest", set tag to "Always"
      pullPolicy: IfNotPresent

    service:
      # -- service type for the alertmanager bridge
      type: ClusterIP

    # -- alertmanager bridge pod replicas
    replicaCount: 1

    # -- set the revisionHistoryLimit to decide how many replicaSets are
    # kept when you change a deployment. Explicitly setting this field to 0,
    # will result in cleaning up all the history of your Deployment thus that
    # Deployment will not be able to roll back.
    revisionHistoryLimit: 2

    existingSecret:
      registration: ""

    # this section is for registering the application service with matrix
    # read more about application services here:
    # https://spec.matrix.org/v1.11/application-service-api/
    registration:
      # -- name of the application service
      id: "alertmanager"
      # -- url of the alertmanager service. if not provided, we will template it
      # for you like http://matrix-alertmanager-service:3000
      url: ""
      # -- should this bot be rate limited?
      rate_limited: false
      # -- localpart of the user associated with the application service.
      # Events will be sent to the AS if this user is the target of the event,
      # or is a joined member of the room where the event occurred.
      sender_localpart: "alertmanager"
      # A secret token that the application service will use to authenticate
      # requests to the homeserver.
      as_token: ""
      # -- Use an existing Kubernetes Secret to store your own generated appservice
      # and homeserver tokens. If this is not set, we'll generate them for you.
      # Setting this won't override the ENTIRE registration.yaml we generate for
      # the synapse pod to authenticate mautrix/discord. It will only replaces the tokens.
      # To replaces the ENTIRE registration.yaml, use
      # bridges.alertmanager.existingSecret.registration
      existingSecret: ""
      existingSecretKeys:
        # -- key in existingSecret for as_token (application service token). If
        # provided and existingSecret is set, ignores bridges.alertmanager.registration.as_token
        as_token: "as_token"
        # -- key in existingSecret for hs_token (home server token)
        hs_token: "hs_token"

    encryption: false

    config:
      # -- appservice port?
      app_port: 3000
      # -- secret key for the webhook events, I don't know what this is
      app_alertmanager_secret: ""
      # -- your homeserver url, e.g. https://homeserver.tld
      homeserver_url: ""

      bot:
        # -- user in matrix for the the alertmanager bot e.g. alertmanager
        # which becomes @alertmanager:homeserver.tld
        user: ""
        # -- optional: display name to set for the bot user
        display_name: ""
        # -- optional: mxc:// avatar to set for the bot user
        avatar_url: ""
        # -- rooms to send alerts to, separated by a |
        # Each entry contains the receiver name (from alertmanager) and the
        # internal id (not the public alias) of the Matrix channel to forward to.
        rooms: ""
        # -- Set this to true to make firing alerts do a `@room` mention.
        # NOTE! Bot should also have enough power in the room for this to be useful.
        mention_room: false

      # -- set to enable Grafana links, e.g. https://grafana.example.com
      grafana_url: ""
      # -- grafana data source, e.g. default
      grafana_datasource: ""
      # -- set to enable silence link, e.g. https://alertmanager.example.com
      alertmanager_url: ""
```

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
