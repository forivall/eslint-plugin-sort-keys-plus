# eslint-plugin-sort-keys-plus

Fork of eslint rule that sorts keys in objects (https://eslint.org/docs/rules/sort-keys) with autofix enabled

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-sort-keys-plus`:

```
$ npm install eslint-plugin-sort-keys-plus --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-sort-keys-plus` globally.

## Usage

Add `sort-keys-plus` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
  "plugins": [
    "sort-keys-plus"
  ]
}
```


Then add sort-keys-plus rule under the rules section.

```json
{
    "rules": {
        "sort-keys-plus/sort-keys": "warn"
    }
}
```

Often it makes sense to enable `sort-keys-plus` only for certain files/directories. For cases like that, use override key of eslint config:

```jsonc
{
  "rules": {
    // ...
  },
  "overrides": [
    {
      "files": ["src/alphabetical.js", "bin/*.js", "lib/*.js"],
      "rules": {
        "sort-keys-plus/sort-keys-plus": "warn"
      }
    }
  ]
}
```

In some cases, there should be a specific order for some properties of an
object, such as with mongodb aggregations. For that, use the override key of
the configuration:

```json
{
  "rules": {
    "sort-keys-plus/sort-keys": ["warn", "asc", {
      "overrides": [
        {
          "properties": ["$lookup"],
          "order": ["from", "localField", "foreignField", "as"]
        }
      ]
    }]
  }
}
```

## Rule configuration

For available config options, see [official sort-keys reference](https://eslint.org/docs/rules/sort-keys#require-object-keys-to-be-sorted-sort-keys). All options supported by `sort-keys` are supported by `sort-keys-plus`.





