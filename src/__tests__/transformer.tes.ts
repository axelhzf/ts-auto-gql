import * as ts from 'typescript';
import { CompilerOptions } from 'typescript';
import { getTransformer } from '../transformer';
import * as path from 'path';
import prettier from 'prettier';

describe('transformer', () => {
  it('basicPropertyAccess', async function() {
    const file = `${__dirname}/../fixtures/basicPropertyAccess.ts`;
    const result = await compile(file);
    expect(result).toMatchInlineSnapshot(`
"'use strict';
exports.__esModule = true;
var schema_1 = require('./schema');
function getMovies() {
  var q = gql\`
    query {
      movie {
        id
        title
      }
    }
  \`;
  console.log(q.id + ' ' + q.title);
}
getMovies();
"
`);
  });

  it('nestedPropertyAccess', async function() {
    const file = `${__dirname}/../fixtures/nestedPropertyAccess.ts`;
    const result = await compile(file);
    expect(result).toMatchInlineSnapshot(`
"'use strict';
exports.__esModule = true;
var schema_1 = require('./schema');
function getMovies() {
  var movie = gql\`
    query {
      movie {
        director {
          name
        }
      }
    }
  \`;
  console.log(movie.director.name);
}
getMovies();
"
`);
  });

  it('variableAssign', async function() {
    const file = `${__dirname}/../fixtures/variableAssign.ts`;
    const result = await compile(file);
    expect(result).toMatchInlineSnapshot(`
"'use strict';
exports.__esModule = true;
var schema_1 = require('./schema');
function getMovies() {
  var movie = gql\`
    query {
      movie {
        director {
          name
        }
      }
    }
  \`;
  var director = movie.director;
  console.log(director.name);
}
getMovies();
"
`);
  });
});

function compile(file: string) {
  return new Promise((resolve, reject) => {
    const absPath = path.resolve(file);
    const compilerHost = ts.createCompilerHost({
      experimentalDecorators: true,
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      noEmitOnError: false,
      stripInternal: true,
      target: ts.ScriptTarget.Latest,
      removeComments: true
    });
    const options: CompilerOptions = {
      skipLibCheck: true
    };
    const program = ts.createProgram([file], options, compilerHost);
    const checker = program.getTypeChecker();

    let emitResult = program.emit(
      undefined,
      (fileName: string, data: string) => {
        if (fileWithoutExtension(fileName) === fileWithoutExtension(absPath)) {
          resolve(
            prettier.format(data, { singleQuote: true, parser: 'typescript' })
          );
        }
      },
      undefined,
      undefined,
      {
        after: [getTransformer(checker)]
      }
    );

    let allDiagnostics = ts
      .getPreEmitDiagnostics(program)
      .concat(emitResult.diagnostics);

    const errorMessages = allDiagnostics.map(diagnostic => {
      if (diagnostic.file) {
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start!
        );
        let message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          '\n'
        );
        return `${diagnostic.file.fileName} (${line + 1},${character +
          1}): ${message}`;
      } else {
        return `${ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          '\n'
        )}`;
      }
    });

    if (errorMessages.length > 0) {
      reject(new Error(errorMessages.join('\n\n')));
    }
  });
}

function fileWithoutExtension(file: string) {
  return path.basename(file, path.extname(file));
}
