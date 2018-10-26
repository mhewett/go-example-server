# godoc-based local server for Go examples

This is the server component for [https://github.com/mhewett/sourcegraph-coding-examples](https://github.com/mhewett/sourcegraph-coding-examples).

## Prerequisites
1. Install Go on your local machine.
1. Install Node.js on your local machine
    1. This was built using Node v8.11.3

## Running this server
1. `npm run serve`
    1. Defaults to port 8844
    1. Use `-port nnnn` to change the port: `npm run serve -port 9999`

## Example web service calls
**Note: The current implementation is a proof of concept and only supports Go for now.**
```
http://localhost:8844/go/io/MultiReader
http://localhost:8844/java/util/concurrent/ConcurrentHashMap
```
You can optionally specify a language version with `languageVersion`.  
This will refer to the language or library version, depending on the language and symbol requested.
```
http://localhost:8844/go/io/MultiReader?languageVersion=1
http://localhost:8844/go/io/MultiReader?languageVersion=0.5
http://localhost:8844/java/util/concurrent/ConcurrentHashMap?languageVersion=7
http://localhost:8844/java/util/concurrent/ConcurrentHashMap?languageVersion=latest
http://localhost:8844/lisp/signum?languageVersion=cltl2
```
If multiple versions of the desired language are not available, the `languageVersion` option is ignored.
If the server can determine that the class or function is not available in the specified version
(e.g. ConcurrentHashMap in Java prior to v1.5),  
the server will respond with an 
appropriate message (this may change to a 404 error in the future).

## Output format
Normally, output is in HTML format.  Use the `format=text` or `format=json` options to get raw text or JSON output, respectively.
```
http://localhost:8844/go/io/MultiReader?format=html     (default)
http://localhost:8844/go/io/MultiReader?format=json
http://localhost:8844/go/io/MultiReader?format=text
```
