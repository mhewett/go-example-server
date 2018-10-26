// This is a server that calls godoc to get source code examples for Go built-in functions.
// Mike Hewett    mhewett@github
// 26 Oct 2018

import { GQLService } from '@playlyfe/gql'
import * as fs from 'fs'
import * as express from 'express'
import * as asyncHandler from 'express-async-handler'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'

interface TextDocument {
    uri: string
    text: string
}

interface Position {
    line: number
    character: number
}

async function makeGQLService(text: string): Promise<{ path: string; gqlService: GQLService }> {
    return new Promise<{ path: string; gqlService: GQLService }>(resolve => {
        const path = 'schema.gql'
        fs.writeFileSync(path, text)

        const gqlService = new GQLService({
            onInit: () => resolve({ path, gqlService }),
        })
    })
}

async function hover(doc: TextDocument, pos: Position) {
    const { path, gqlService } = await makeGQLService(doc.text)
    return gqlService.getInfo({
        sourceText: doc.text,
        sourcePath: path,
        position: {
            line: pos.line + 1,
            column: pos.character + 1,
        },
    })
}

async function definition(doc: TextDocument, pos: Position) {
    const { path, gqlService } = await makeGQLService(doc.text)
    const definition = gqlService.getDef({
        sourceText: doc.text,
        sourcePath: path,
        position: {
            line: pos.line + 1,
            column: pos.character + 1,
        },
    })
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

function main() {
    const app = express()
    app.use(bodyParser.json({ limit: '10mb' }))
    app.use(cors())
    app.get('/ping', (req, res) => {
        res.send({ pong: 'pong' })
    })
    app.post(
        '/',
        asyncHandler(async (req, res) => {
            if (req.body.method === 'hover') {
                res.send(await hover(req.body.doc, req.body.pos))
            } else if (req.body.method === 'definition') {
                res.send(await definition(req.body.doc, req.body.pos))
            } else {
                res.send({
                    error: 'unknown method ' + req.body.method + ' (expected body to look like {"method":"hover"})',
                })
            }
        })
    )
    app.listen(1234, () => {
        console.log('Listening for HTTP requests on port 1234')
    })
}

main()