// This is a server that calls godoc to get source code examples for Go built-in functions.
// Mike Hewett    mhewett@github
// 26 Oct 2018

import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import * as express from 'express'
import * as asyncHandler from 'express-async-handler'
const { exec } = require('child_process');

const LANG_SERVER_PORT = '8844';
let DEBUG = false;

/*
interface TextDocument {
    uri: string
    text: string
}

interface Position {
    line: number
    character: number
}
*/

/*
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
*/

/**
 * Returns a 404 error for an unsupported language, method, etc.
 * @param res the Express response
 * @param valueType the type of item that is not supported, e.g. 'language'
 * @param value the value that is not supported, e.g. 'Python'
 */
function unsupported(res: any, valueType: string, value: string): void {
    res.status(404).send({ error: `Unsupported ${valueType}: ${value}`});
}

/**
 * pkg can be one class or an array of them.
 *
 * @param language 'Go', 'Java', etc.
 * @param pkg The package
 * @param symbol the name of a function or class
 * @param format 'html', 'text', or 'raw' with html as the default
 * @param res the response to send information to
 */
function processRequest(language: string, pkg: string, symbol:string, format:string, res:any) : void {

    if (DEBUG) {
        console.log(`lang: ${language}, ${pkg} ${symbol}`);
    }

    const lang = language.toLowerCase();

    if (lang === 'go') {
        returnGoExample(pkg, symbol, format, res);
    }
    else {
        unsupported(res, 'language', lang);
    }
    /*
        if (lang === 'java') {
        res.send('Returning Java example');    // await definition(req.body.doc, req.body.pos))
    }
    else
        if (lang === 'lisp') {
            res.send('Returning LISP example');
        }
    else {
        res.send({ error: `Unknown language: ${lang}` });
    } */
}

function formatExampleAsHtml(language: string, str: string): string {
    // Assuming godoc-formatted output for now.
    let formatted = `${str.replace(/\n/g, '<br>')}</h2>`;
    formatted = formatted.replace('Example:', '<h2>Example</h2>');

    return formatted;
}

/**
 * Returns a Go coding example formatted in HTML, JSON, or raw text.
 * The examples are from the <code>godoc</code> command <code>godoc -ex pkg function</code>.
 * Go must be installed on the local machine.
 *
 * @param pkg The package name
 * @param symbol the name of a function or class
 * @param format 'html', 'text', or 'raw' with html as the default
 * @param res the response to send information toasync function getGoExample(pkg: string[], funcOrClass:string, methodName:string, document:string, position:string, res:any, format:string) : void {
 */
function returnGoExample(pkg: string, symbol:string, format:string, res:any) : void {

    // The package can be aaa.bbb or aaa/bbb or maybe even aaa.bbb/ccc, I'm not sure.
    // We need to split on periods but keep slashes together
    const packages = pkg ? pkg.replace(/\./g, ' ') : '';

    // Run the godoc command
    const docCommand = `godoc -ex ${packages} ${symbol}`;
    if (DEBUG) {
        console.log(docCommand);
    }

    exec(docCommand, (err, stdout, stderr) => {
        if (err) {
            res.status(500).send({error: 'Error running godoc.  Is it installed? ' + stderr});
        } else {
            // The output from the command is in stdout
            // The example has documentation starting with 'func' and an Example starting with 'Example'
            let exampleCode = '';
            let documentation = '';
            const funcIndex = stdout.indexOf('func');
            const exampleIndex = stdout.indexOf('Example', funcIndex);
            if (funcIndex >= 0) {
                if (exampleIndex > funcIndex) {
                    documentation = stdout.substring(funcIndex, exampleIndex);
                } else {
                    documentation = stdout.substring(funcIndex);
                }
            }
            if (exampleIndex >= 0) {
                exampleCode = stdout.substring(exampleIndex);
            }

            // Return the example if possible, else return the documentation
            // TODO: Some symbols such as net/http.Handler have multiple func and Example entries.  Figure out how to handle those.
            if (exampleCode.length > 0) {
                res.status(200);
                if (format === 'text') {
                    res.type('text/plain').send(exampleCode);
                } else if (format === 'html') {
                    res.type('text/html').send(formatExampleAsHtml('go', exampleCode));
                } else {
                    res.type('application/json').send({example: exampleCode, doc: documentation});
                }
            } else if (documentation.length > 0) {
                res.status(200);
                if (format === 'text') {
                    res.type('text/plain').send(documentation);
                } else if (format === 'html') {
                    res.type('text/html').send(formatExampleAsHtml('go', documentation));
                } else {
                    res.type('application/json').send({example: '', doc: documentation});
                }
            } else {
                res.status(404).send({error: `No example available for ${pkg}.${symbol}`});
            }
        }
    });
}

/**
 * Parses arguments, starts the server, etc.
 * Use '-port nnnn' to change the port number.
 */
function main(): any {
    const app = express();

    let portnum = LANG_SERVER_PORT;

    // Parse command-line args
    for (let i = 0; i < process.argv.length; ++i) {
        if (process.argv[i] === '-port') {
            ++i;
            portnum = process.argv[i];   // need error check on argument length here
        } else if (process.argv[i] === '-debug') {
            DEBUG = true;
        }
    }

    // Set up Express
    app.use(bodyParser.json({limit: '10mb'}));
    app.use(cors());
    // app.use(compression);

    app.get('/ping', (req, res) => {
        res.send({pong: 'pong'});
    });

    // These have the form /language/package[/subpackage]*/classOrFunction?method=methodName&languageVersion=n&format={html,text,json}&document=doc&position=position

    // This is the main web service
    app.get('/:lang/:symbol',
        asyncHandler(async (req, res) => {
            processRequest(req.params.lang,
                req.query.package,
                req.params.symbol,
                req.query.format,
                res);
        }));

    app.listen(LANG_SERVER_PORT, () => {
        console.log('Listening for HTTP requests on port ' + portnum);
    })
}

main();
