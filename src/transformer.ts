import * as ts from 'typescript';
import { CompilerOptions } from 'typescript';

// https://astexplorer.net/#/gist/62bc09174807d87fd95f2017ac1fd5e4/2ede6a7032c7a33f27a5ede888177678ea238484
function getTransformer(checker: ts.TypeChecker) {
  function visitor(ctx: ts.TransformationContext, sf: ts.SourceFile) {
    const visitor: ts.Visitor = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node)) {
        // function declaration
        const queries: any[] = [];
        const functionVisitor: ts.Visitor = (node: ts.Node) => {
          if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
            const type = checker.getTypeAtLocation(node);
            if (type) {
              const property = type.getProperty('__gql');
              if (property) {
                // slice detected
                const queryDefinition: any = {
                  node: node,
                  base: type.symbol.getName(),
                  properties: []
                };
                //console.log('found in first pass', queryDefinition);
                queries.push(queryDefinition);
                (node as any).initializer.query = queryDefinition;
              }
            }
          }


          // checker.getRootSymbols(checker.getSymbolAtLocation(node))
          // checker.getSymbolAtLocation(node.expression).getDeclarations()
          if (ts.isPropertyAccessExpression(node)) {
            if (ts.isIdentifier(node.expression)) {
              const symbol = checker.getSymbolAtLocation(node.expression);
              if (!symbol) return;
              const declarations = symbol.getDeclarations();
              if (!declarations) return;
              const declaration = declarations[0];
              const query = queries.find(q => q.node === declaration);
              if (query) {
                query.properties.push(node.name.text);
                console.log(query.properties);
              }
            }
          }

          return ts.visitEachChild(node, functionVisitor, ctx);
        };

        ts.visitEachChild(node, functionVisitor, ctx);
      }

      if (ts.isCallExpression(node)) {
        if (ts.isPropertyAccessExpression(node.expression)) {
          if (ts.isIdentifier(node.expression.expression)) {
            if (node.expression.expression.text === 'Query') {
              console.log('found in second pass');

              const query = (node as any).query as Query;

              return ts.createTaggedTemplate(
                ts.createIdentifier('gql'),
                [],
                ts.createNoSubstitutionTemplateLiteral(`
                  query { 
                    ${query.base} { 
                      ${query.properties.join('\n')} 
                    }
                  }
                `)
              );
            }
          }
        }
      }

      if (ts.isImportDeclaration(node)) {
        if (ts.isStringLiteral(node.moduleSpecifier)) {
          const text = node.moduleSpecifier.getText();
          if (text.match(/schema/)) {
            return undefined;
          }
        }
      }
      return ts.visitEachChild(node, visitor, ctx);
    };
    return visitor;
  }

  return (ctx: ts.TransformationContext) => {
    return (sf: ts.SourceFile) => ts.visitNode(sf, visitor(ctx, sf));
  };
}

type Query = {
  variableName: string;
  base: string;
  properties: string[];
};

function compile() {
  const files: string[] = [`${__dirname}/example/example1.ts`];
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
  const program = ts.createProgram(files, options, compilerHost);
  const checker = program.getTypeChecker();

  let emitResult = program.emit(undefined, undefined, undefined, undefined, {
    after: [getTransformer(checker)]
  });

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
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      );
    } else {
      console.log(
        `${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
      );
    }
  });
}

compile();
