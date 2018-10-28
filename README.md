# A godoc-based local server for Go examples

This is an example server component for the [https://github.com/mhewett/sourcegraph-coding-examples](https://github.com/mhewett/sourcegraph-coding-examples) extension.
It is architected to be a general language server but currently only works on examples generated by `godoc` installed on the local server.

## Prerequisites
1. Install Go on your local machine (the Go package includes `godoc`).
1. Install Node.js on your local machine
    1. This server is currently built using Node v8.11.3

## Building and running this server
1. `npm run build`
    1. Runs `npm install` and `tsc` to compile the code
1. `npm run server` or `node src/index.js`
    1. Runs `tsc` to compile the code and then starts the server
    1. Defaults to **port 8844**
    1. Use `-port nnnn` to change the port:
        1. `npm run server -- -port 9999`
        1. `node src/index.js -port 9999`
    1. Use `-debug` to print debug statements

## Example web service calls
General form: `http://localhost:8844/<language>/<symbol>?package=<package>`

**parameters**
- **language** the language, such as Go, Java, or Python (*required*)
- **symbol** the class, type, function, or method, such as `MultiReader` or `ConcurrentHashMap` (*required*)
    - For a Java method, use the method name as the symbol and include the Class in the package, e.g. `java.lang.Math`
- **package** the package the symbol is in (*required* except for base language symbols such as `switch`)
- **format**  the desired return format (*optional*) defaults to `json`, other options are `html` and `text` 

**Note: The current implementation is a proof of concept and only supports Go.**
```
http://localhost:8844/go/MultiReader?package=io
http://localhost:8844/go/ResponseWriter?package=net/http
http://localhost:8844/java/ConcurrentHashMap?package=java.util.concurrent
```
### languageVersion: Not Yet Implemented
You can optionally specify a language version with `languageVersion`.  
This will refer to the language or library version, as appropriate for the language and symbol requested.
```
http://localhost:8844/go/io/MultiReader?languageVersion=1
http://localhost:8844/go/io/MultiReader?languageVersion=1.09
http://localhost:8844/java/java/util/concurrent/ConcurrentHashMap?languageVersion=7
http://localhost:8844/java/java/util/concurrent/ConcurrentHashMap?languageVersion=latest
http://localhost:8844/java/switch?languageVersion=latest
http://localhost:8844/lisp/signum?languageVersion=cltl2
```
If multiple versions of the desired language are not available, the `languageVersion` option is ignored.
If the server can determine that the class or function is not available in the specified version
(e.g. ConcurrentHashMap in Java prior to v1.5),  
the server will respond with a 404 error.

## Examples
###Call
`http://localhost:8844/go/CopyN?package=io`
###Output (200)
```
{
  "example": "Example:\n r := strings.NewReader(\"some io.Reader stream to be read\")\n\n if _, err := io.CopyN(os.Stdout, r, 5); err != nil {\n log.Fatal(err)\n }\n\n // Output:\n // some\n\n\n",
  "doc": "func CopyN(dst Writer, src Reader, n int64) (written int64, err error)\n CopyN copies n bytes (or until an error) from src to dst. It returns the\n number of bytes copied and the earliest error encountered while copying.\n On return, written == n if and only if err == nil.\n\n If dst implements the ReaderFrom interface, the copy is implemented\n using it.\n\n "
}
```
###Call
`http://localhost:8844/go/CopyFoo?package=io`
###Output (404)
```
{
  "error": "io.CopyFoo not found"
}
```

## HTTP status codes
1. **200** successful response
1. **404** unsupported language or unknown class, function, or method.  Returns an object with an 'error' field whose value is an error message (string). 
1. **500** The expected example server is not available, for example `godoc` for Go examples.  Returns an object with an 'error' field containing an explanation.

## Output format
Normally, the output is in JSON format and has the fields `example` and `doc`. 
Use the `format=text` or `format=html` options to get raw text or HTML output, respectively.
In the non-JSON formats the server returns only the example text.

The `Content-Type` header is set appropriately for the response format.
```
http://localhost:8844/go/io/MultiReader?format=html
http://localhost:8844/go/io/MultiReader?format=json     (default)
http://localhost:8844/go/io/MultiReader?format=text
```
