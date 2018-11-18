import * as ts from 'typescript';
import { CompilerOptions } from 'typescript';

function getTransformer(/*opts?: Opts*/) {
  function visitor(ctx: ts.TransformationContext, sf: ts.SourceFile) {
    const visitor: ts.Visitor = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node)) {
        // function declaration
        const queries: any = [];
        const functionVisitor: ts.Visitor = (node: ts.Node) => {
          const queryDefinition = getQueryDefinition(node);
          if (queryDefinition) {
            console.log('found in first pass', queryDefinition);
            queries.push(queryDefinition);
            (node as any).initializer.query = queryDefinition;
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

              console.log((node as any).query);

              return ts.createTaggedTemplate(
                ts.createIdentifier('gql'),
                [],
                ts.createNoSubstitutionTemplateLiteral('query { movies { id }}')
              );
            }
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

function getQueryExpression(node: ts.Node) {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'Query'
  ) {
    return { base: node.expression.name.text };
  }
}

function getQueryDefinition(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    if (!node.initializer) return;
    const variableName = node.name.text;
    const query = getQueryExpression(node.initializer);
    if (!query) return;
    return { variableName, query };
  }
}

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
  const options: CompilerOptions = {};
  const program = ts.createProgram(files, options, compilerHost);

  let emitResult = program.emit(undefined, undefined, undefined, undefined, {
    before: [getTransformer()]
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
