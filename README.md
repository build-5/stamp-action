# Build5 stamp action
This action stamps a selected folder with build5

## Important
This action assumes that you have actions/checkout@3 before running it.

## Inputs

### `path`

**Required** A paht to a folder to stamp. Default `./`.

### `node`
**Required** Url of the iota node.

### `mnemonic`
**Required** Mnemomic of the address to fund the stamp request

### `otr_address`
**Required** Build5 OTR address.

### `days`
**Required** File will be stamped for this many days. Default is 1.

## Example usage

```yaml
- name: Checkout repository
  uses: actions/checkout@v3
- name: Run my custom action
  uses: ./
  with:
    path: ./
    mnemonic: health attract search scrub man age festival boat gravity install limit luxury day release table castle glimpse high resource swim denial member ski season
    days: 1
```