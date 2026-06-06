# typespec-json-type-definition

A [TypeSpec](https://typespec.io) emitter that turns TypeSpec models, enums, and
unions into a [JSON Type Definition](https://jsontypedef.com/) (JTD,
[RFC 8927](https://datatracker.ietf.org/doc/html/rfc8927)) document.

JSON Type Definition is a small, portable schema language for JSON. It is a
good fit when you want code generation across many languages (via tools such as
[`jtd-codegen`](https://jsontypedef.com/docs/jtd-codegen/)) or fast validation
(via [Ajv](https://ajv.js.org/json-type-definition.html)) from a single
TypeSpec source of truth.

## Installation

```bash
npm install --save-dev typespec-json-type-definition
```

This package declares `@typespec/compiler` as a peer dependency, so make sure it
is installed in your TypeSpec project as well.

## Usage

Select the emitter in your `tspconfig.yaml`:

```yaml
emit:
  - typespec-json-type-definition
options:
  typespec-json-type-definition:
    output-file: schema.jtd.json
```

Then compile:

```bash
npx tsp compile .
```

Or run it directly from the CLI without touching `tspconfig.yaml`:

```bash
npx tsp compile . --emit typespec-json-type-definition
```

## Example

Given this TypeSpec:

```typespec
@doc("A blog post.")
model Post {
  id: string;
  title: string;
  tags: string[];
  status: "draft" | "published";
  author: Author;
  comments?: Record<Comment>;
}

@doc("A person who writes posts.")
model Author {
  name: string;
  age?: uint8;
}

model Comment {
  body: string;
  createdAt: utcDateTime;
}
```

the emitter produces:

```json
{
  "definitions": {
    "Post": {
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" },
        "tags": { "elements": { "type": "string" } },
        "status": { "enum": ["draft", "published"] },
        "author": { "ref": "Author" }
      },
      "optionalProperties": {
        "comments": { "values": { "ref": "Comment" } }
      },
      "metadata": { "description": "A blog post." }
    },
    "Author": {
      "properties": { "name": { "type": "string" } },
      "optionalProperties": { "age": { "type": "uint8" } },
      "metadata": { "description": "A person who writes posts." }
    },
    "Comment": {
      "properties": {
        "body": { "type": "string" },
        "createdAt": { "type": "timestamp" }
      }
    }
  }
}
```

A larger, runnable example that exercises every supported construct lives in
[`samples/`](./samples) — compile it with `npx tsp compile . --config tspconfig.yaml`.

## What gets emitted

Every named **model**, **enum**, and **named union** declared in your program
becomes an entry in the root `definitions` map. Wherever one declared type
references another, the JTD [`ref`](https://jsontypedef.com/docs/jtd-in-5-minutes/#ref-form)
form is used.

| TypeSpec                            | JTD form                                                      |
| ----------------------------------- | ------------------------------------------------------------- |
| `model { a: T }`                    | `properties` / `optionalProperties` (optional `?` properties) |
| `model extends Base`                | inherited properties are flattened into the child             |
| `T[]`                               | `elements`                                                    |
| `Record<T>`                         | `values`                                                      |
| `enum`                              | `enum` (string members)                                       |
| `"a" \| "b"` (string-literal union) | `enum`                                                        |
| `T \| null`                         | the schema for `T` with `nullable: true`                      |
| `@discriminator` model inheritance  | `discriminator` + `mapping`                                   |
| `@discriminated` union              | `discriminator` + `mapping`                                   |
| `@doc("…")`                         | `metadata.description`                                        |

### Scalar mapping

| TypeSpec scalar(s)                                             | JTD `type`  |
| -------------------------------------------------------------- | ----------- |
| `boolean`                                                      | `boolean`   |
| `string`, `url`, `bytes`, `plainDate`, `plainTime`, `duration` | `string`    |
| `int8` / `int16` / `int32`                                     | same        |
| `uint8` / `uint16` / `uint32`                                  | same        |
| `float32`                                                      | `float32`   |
| `float64`, `float`, `numeric`                                  | `float64`   |
| `utcDateTime`, `offsetDateTime`                                | `timestamp` |

JTD has no 64-bit integer or arbitrary-precision number type, so `int64`,
`uint64`, `integer`, `safeint`, `decimal`, and `decimal128` are emitted as
`string` (the JSON-safe representation) together with a build warning. Custom
scalars are resolved through their `extends` chain to the nearest supported base
scalar.

## Options

| Option                  | Type      | Default           | Description                                                          |
| ----------------------- | --------- | ----------------- | -------------------------------------------------------------------- |
| `output-file`           | `string`  | `schema.jtd.json` | Name of the emitted file, relative to the emitter output directory.  |
| `indent`                | `integer` | `2`               | Spaces used to indent the JSON. Use `0` for a single minified line.  |
| `additional-properties` | `boolean` | `false`           | Emit `additionalProperties: true` on every `properties` form schema. |
| `include-doc`           | `boolean` | `true`            | Copy `@doc` strings into JTD `metadata.description`.                 |

## Editor warnings (linter)

The emitter degrades a few constructs (see the tables above) and only reports
that at `tsp compile` time. To get the same warnings **live in your editor**
(VS Code TypeSpec extension), enable the bundled linter — the language server
runs it as you type, no compile needed:

```yaml
# tspconfig.yaml
linter:
  extends:
    - typespec-json-type-definition/recommended
```

| Rule                                                  | Warns when…                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `typespec-json-type-definition/no-unsupported-scalar` | a property uses a scalar with no JTD equivalent (`int64`, `decimal`, …) that degrades to `string` |
| `typespec-json-type-definition/no-unsupported-union`  | a union is neither `T \| null`, a union of string literals, nor discriminated                     |
| `typespec-json-type-definition/no-tuple`              | a tuple type is used (JTD has no tuple form)                                                      |
| `typespec-json-type-definition/no-numeric-enum`       | an enum has numeric members (JTD enums are string-only)                                           |

Enable or silence individual rules with `linter.enable` / `linter.disable`, or
suppress a single occurrence with `#suppress`.

## Development

This repo pins its toolchain with [mise](https://mise.jdx.dev/) /
[asdf](https://asdf-vm.com/) via [`.tool-versions`](./.tool-versions)
(Node.js and [pinact](https://github.com/suzuki-shunsuke/pinact)).

```bash
npm ci             # install dependencies
npm run build      # compile TypeScript to dist/
npm run format     # format with prettier + tsp
npm test           # build + run the vitest suite
npm run coverage   # build + run tests with coverage
```

## License

[MIT](./LICENSE)
