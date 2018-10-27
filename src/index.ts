// This is a server that calls godoc to get source code examples for Go built-in functions.
// Mike Hewett    mhewett@github
// 26 Oct 2018

import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import * as express from 'express'
import * as asyncHandler from 'express-async-handler'
import * as fs from 'fs'

const LANG_SERVER_PORT = '8844';

interface TextDocument {
    uri: string
    text: string
}

interface Position {
    line: number
    character: number
}

async function makeGQLService(text: string): Promise<{ path: string }> {
    return new Promise<{ path: string }>(() => {
        const path = 'schema.gql';
        fs.writeFileSync(path, text)
    })
}

async function hover(doc: TextDocument, pos: Position): Promise<any> {
    const { path } = await makeGQLService(doc.text);
    return {
        sourceText: doc.text,
        sourcePath: path,
        position: {
            line: pos.line + 1,
            column: pos.character + 1,
        },
    }
}

async function definition(doc: TextDocument, pos: Position): Promise<any> {
    const { path } = await makeGQLService(doc.text);
    const definition = {
        sourceText: doc.text,
        sourcePath: path,
        position: {
            line: pos.line + 1,
            column: pos.character + 1,
        },
        start: {
            line: 1,
            column: 25
        },
        end: {
            line: 100,
            column: 75
        }
    };

    return (
        definition && {
            uri: doc.uri,
            start: {
                line: definition.start.line - 1,
                character: definition.start.column - 1,
            },
            end: { line: definition.end.line - 1, character: definition.end.column - 1 },
        }
    )
}

/**
 * pkg can be one class or an array of them.
 *
 * @param language 'Go', 'Java', etc.
 * @param pkg Either a package name such as 'io' or an array of package names
 * @param funcOrClass the name of a function or class
 * @param methodName an optional method name or function name inside a class or function
 * @param document the document being viewed
 * @param position the position in the document {line: n, column: n}
 * @param format 'html', 'text', or 'raw' with html as the default
 * @param res the response to send information to
 */
function processRequest(language: string, pkg: string[], funcOrClass:string, methodName:string, document:string, position:string, res:any, format:string) : void {

    console.log(`lang: ${language}, ${pkg} ${funcOrClass}`);

    const lang = language.toLowerCase();

    if (lang === 'go') {
        res.send('Returning Go example');  // await hover(req.body.doc, req.body.pos))
    }
    else
        if (lang === 'java') {
        res.send('Returning Java example');    // await definition(req.body.doc, req.body.pos))
    }
    else
        if (lang === 'lisp') {
            res.send('Returning LISP example');
        }
    else {
        res.send({ error: `Unknown language: ${lang}` });
    }
}

function main(): any {
    const app = express();

    let portnum = LANG_SERVER_PORT;

    // Parse command-line args
    for (let i = 0; i < process.argv.length; ++i) {
        if (process.argv[i] === '-port') {
            portnum = process.argv[i + 1];   // need error check here
        }
    }
    app.use(bodyParser.json({limit: '10mb'}));
    app.use(cors());
    // app.use(compression);

    app.get('/ping', (req, res) => {
        res.send({pong: 'pong'});
    });

    // These have the form /language/package[/subpackage]*/classOrFunction?method=methodName&languageVersion=n&format={html,text,json}&document=doc&position=position

    // Must have at least one package to match.
    app.get('/:lang/:package*/:function',
        asyncHandler(async (req, res) => {
            const pkgs = (req.params[0]) ? req.params[0].split('/') : ['foo'];
            pkgs[0] = req.params.package;

            processRequest(req.params.lang, pkgs,
                req.params.function, req.params.methodName,
                req.params.document, req.params.position,
                res, req.query.format);
        }));


    // The no-package case.  Not sure if this one will ever happen in Go or Java.
    app.get('/:lang/:function',
        asyncHandler(async (req, res) => {
            processRequest(req.params.lang, [],
                req.params.function, req.params.methodName,
                req.params.document, req.params.position,
                res, req.query.format);
        }));

    app.listen(LANG_SERVER_PORT, () => {
        console.log('Listening for HTTP requests on port ' + portnum);
    })
}

main();
