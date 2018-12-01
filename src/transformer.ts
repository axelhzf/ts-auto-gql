import * as ts from 'typescript';
import * as _ from 'lodash';

// https://astexplorer.net/#/gist/62bc09174807d87fd95f2017ac1fd5e4/2ede6a7032c7a33f27a5ede888177678ea238484
export function getTransformer(checker: ts.TypeChecker) {
  function visitor(ctx: ts.TransformationContext, sf: ts.SourceFile) {
    const visitor: ts.Visitor = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node)) {
        // function declaration
        const queries: any[] = [];
        const functionVisitor: ts.Visitor = (node: ts.Node) => {
          if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
            if (node.initializer) {
              const variableName = node.name.text;
              const initializer = node.initializer;

              // TODO this is too fixed?
              if (
                ts.isCallExpression(initializer) &&
                ts.isPropertyAccessExpression(initializer.expression) &&
                ts.isIdentifier(initializer.expression.expression) &&
                initializer.expression.expression.text === 'Query'
              ) {
                const base = initializer.expression.name.text;
                const queryDefinition: any = {
                  node: node,
                  base: base,
                  properties: {},
                  variableName
                };
                queries.push(queryDefinition);
                (node as any).initializer.query = queryDefinition;
              }
            }
          }

          // checker.getRootSymbols(checker.getSymbolAtLocation(node))
          // checker.getSymbolAtLocation(node.expression).getDeclarations()
          if (ts.isPropertyAccessExpression(node)) {
            const paths = [];
            let current: any = node;
            while (ts.isPropertyAccessExpression(current)) {
              paths.unshift(current.name.text);
              current = current.expression;
            }

            if (ts.isIdentifier(current)) {
              const symbol = checker.getSymbolAtLocation(current);
              if (!symbol) return;
              const declarations = symbol.getDeclarations();
              if (!declarations) return;
              const declaration = declarations[0];
              const query = queries.find(q => q.node === declaration);
              if (query) {
                let obj = query.properties;
                paths.forEach(path => {
                  if (!obj[path]) {
                    obj[path] = {}
                  }
                  obj = obj[path];
                });
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
              const query = (node as any).query as Query;

              function toQuery(obj: any): string {
                return _.map(obj, (value, key) => {
                  if (_.isEmpty(value)) return key;
                  return `${key} { ${toQuery(value)} }`
                }).join('\n');
              }

              return ts.createTaggedTemplate(
                ts.createIdentifier('gql'),
                [],
                ts.createNoSubstitutionTemplateLiteral(`
                  query { 
                    ${query.base} { 
                      ${toQuery(query.properties)} 
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
