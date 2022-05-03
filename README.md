# Auto Refunds

This repository contains the **Auto Refunds** plugin.

## Introduction

Expired HTLC Locks need to be manually refunded by sending a respective HTLC Refund transaction. This plugin takes that burden off you, by refunding all matching locks it finds automatically.

## Installation

The plugin can be installed by executing the following command:

```sh
ark plugin:install @dpos-info/core-auto-refunds
```

Enable the plugin by adding the following entry to the `core` or `relay` section of your `app.json` file:

```json
{
    "package": "@dpos-info/core-auto-refunds",
    "options": {
        "enabled": true,
        "passphrase": "passphrase",
        "publicKeys": ["publicKey_1", "publicKey_2"]
    }
}
```

## Configuration

The following options can be configured.

### `enabled: boolean`

Indicates whether the plugin should be enabled or not.

Default: `true`

### `passphrase: string`

The passphrase used to sign the HTLC Refund transactions. Since the transactions are fee-less, any non-empty value can be used.

Default: `undefined`

### `publicKeys: Array<string>`

An array of public keys. If defined, the plugins will send HTLC Refund transactions only for expired HTLC Locks sent by one of the public keys.

Default: `["*"]`

## Credits

-   [All Contributors](../../contributors)

## License

[MIT](LICENSE) © [Edgar Goetzendorff](https://github.com/dpos-info)
