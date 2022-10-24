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

```json
{
  "sort-keys-shorthand/sort-keys-shorthand": [
    "error",
    "asc",
    {
      "caseSensitive": true,
      "minKeys": 2,
      "natural": false,
      "ignoreSingleLine": false,
      "allCaps": "ignore",
      "shorthand": "ignore",
      "overrides": [],
    }
  ]
}
```

Additional properties that can be set in the 2nd option object supported are as follows:

- `ignoreSingleline` - if `true`, this rule is ignored on single line objects. Default is `false`.
- `allCaps` handling for `ALL_CAPS` properties
  - `ignore` no rules for all caps
  - `first` all caps properties must be first
  - `last` all caps properties must be last
- `shorthand` handling for shorthand properties
  - `ignore` no rules for shorthands
  - `first` shorthand properties must be first
  - `last` shrothand properties must be last

`shorthand` is checked after `allCaps`, so ALL_CAPS will be before shorthand when both are `'first'`.

- `overrides` allows custom orders for specific sets of keys, or sub-objects with a specific parent key. [See below](#overrides) for configuration.

### ignoreSingleLine

Examples of **incorrect** code for the `{ignoreSingleLine: true}` option:

```js
/*eslint sort-keys-plus/sort-keys: ["error", "asc", {ignoreSingleLine: true}]*/
/*eslint-env es6*/
let obj = {
  e: 1,
  c: 3,
  C: 4,
  b: 2
};
```

Examples of **correct** code for the `{ignoreSingleLine: true}` option:

```js
/*eslint sort-keys-plus/sort-keys: ["error", "asc", {ignoreSingleLine: true}]*/
/*eslint-env es6*/
let obj = { e: 1, b: 2, c: 3, C: 4 };
```

### allCaps

Examples of **incorrect** code for the `{allCaps: 'first'}` option:

```js
/*eslint sort-keys-plus/sort-keys: ["error", "asc", {allCaps: 'first'}]*/
/*eslint-env es6*/
let obj = {
  a: 1,
  B_CONSTANT: 2, // not sorted correctly (should be 1st key)
  c: 3,
  d: 4
};
```

Examples of **correct** code for the `{allCaps: 'first'}` option:

```js
/*eslint sort-keys-plus/sort-keys: ["error", "asc", {allCaps: 'first'}]*//
/*eslint-env es6*/
let obj = {
    B_CONSTANT: 2,
    a: 1,
    c: 3,
};
```

### shorthand

Examples of **incorrect** code for the `{shorthand: 'first'}` option:

```js
/*eslint sort-keys-plus/sort-keys: ["error", "asc", {shorthand: 'first'}]*/
/*eslint-env es6*/
const b = 2;
let obj = {
  a: 1,
  b, // not sorted correctly (should be 1st key)
  c: 3,
  d: 4
};
```

Examples of **correct** code for the `{shorthand: 'first'}` option:

```js
/*eslint sort-keys-plus/sort-keys: ["error", "asc", {shorthand: 'first'}]*//
/*eslint-env es6*/
const b = 2;
let obj = {
    b,
    a: 1,
    c: 3,
};
```

### overrides

Configuration:

```json
      "overrides": [
        {
          "order": ["title", "description"],
          "message": "`title` should be before `description`",
        },
        {
          "
        }
      ],
```

* `order` define the property keys that should be ordered
* `properties` define parent property key for this rule. If this is not provided, the override will apply to all objects with a subset of the keys in `order`
* `message` optional custom message when the rule is violated

Examples of **incorrect** code for the `{overrides: [{order: ['b', 'a', 'd']}]}` option:

```js
/*eslint sort-keys-plus/sort-keys: ["error", "asc", {overrides: [{order: ['b', 'a', 'd']}]}]*/
/*eslint-env es6*/
let obj = {
  a: 1,
  b: 2, // not sorted correctly (should be 1st key)
  d: 4
};
```

Examples of **correct** code for the `{overrides: [{order: ['b', 'a', 'd']}]}` option:

```js
/*eslint sort-keys-plus/sort-keys: ["error", "asc", {overrides: [{order: ['b', 'a', 'd']}]}]*/
/*eslint-env es6*/
let obj = {
  b: 2,
  a: 1,
  d: 4
};
// has additional properties
let obj = {
  a: 1,
  b: 2,
  c: 3,
  d: 4
};
```

Examples of **incorrect** code for the `{overrides: [{properties: ['a'], order: ['b', 'a', 'd']}]}` option:

```js
/*eslint sort-keys-plus/sort-keys: ["error", "asc", {overrides: [{properties: ['a'], order: ['b', 'a', 'd']}]}]*/
/*eslint-env es6*/
let obj = { a:
  {
    a: 1,
    b: 2, // not sorted correctly (should be 1st key)
    c: 3,
    d: 4  // not sorted correctly (should be 3rd key)
  };
```

Examples of **correct** code for the `{overrides: [{overrides: [{properties: ['a'], order: ['b', 'a', 'd']}]}` option:

```js
/*eslint sort-keys-plus/sort-keys: ["error", "asc", {overrides: [{overrides: [{properties: ['a'], order: ['b', 'a', 'd']}]}*/
/*eslint-env es6*/
let obj = {
  b: 2,
  a: 1,
  d: 4,
  c: 3
};
```
