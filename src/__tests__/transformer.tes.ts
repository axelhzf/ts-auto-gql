import * as ts from 'typescript';
import { CompilerOptions } from 'typescript';
import { getTransformer } from '../transformer';
import * as path from 'path';

describe('transformer', () => {
  it('basicPropertyAccess', async function() {
    jest.setTimeout(10000);

    const file = `${__dirname}/../fixtures/basicPropertyAccess.ts`;
    const result = await compile(file);
    expect(result).toMatchInlineSnapshot(`
"\\"use strict\\";
exports.__esModule = true;
var schema_1 = require(\\"./schema\\");
function getMovies() {
    var movie = gql \`\\\\n                  query { \\\\n                    Movie { \\\\n                      id\\\\ntitle \\\\n                    }\\\\n                  }\\\\n                \`;
    console.log(movie.id);
    console.log(movie.title);
}
console.log(getMovies());
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
      noUnusedLocals: true,
      noUnusedParameters: true,
      stripInternal: true,
      target: ts.ScriptTarget.ES2018
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
          resolve(data);
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

    allDiagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start!
        );
        let message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          '\n'
        );
        console.log(
          `${diagnostic.file.fileName} (${line + 1},${character +
            1}): ${message}`
        );
      } else {
        console.log(
          `${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
        );
      }
    });
  });
}

function fileWithoutExtension(file: string) {
  return path.basename(file, path.extname(file));
}
