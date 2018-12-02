import * as ts from 'typescript';
import * as _ from 'lodash';

// https://astexplorer.net/#/gist/62bc09174807d87fd95f2017ac1fd5e4/2ede6a7032c7a33f27a5ede888177678ea238484
export function getTransformer(checker: ts.TypeChecker) {
  const treeData = new TreeData();

  function visitor(ctx: ts.TransformationContext, sf: ts.SourceFile) {
    const visitor: ts.Visitor = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node)) {
        // function declaration
        const functionVisitor: ts.Visitor = (node: ts.Node) => {
          if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
            if (node.initializer) {
              const initializer = node.initializer;
              // TODO this is too fixed?
              if (
                ts.isCallExpression(initializer) &&
                ts.isPropertyAccessExpression(initializer.expression) &&
                ts.isIdentifier(initializer.expression.expression) &&
                initializer.expression.expression.text === 'Query'
              ) {
                const query = initializer.expression.name.text;
                const data = { query, fields: {} };
                treeData.setNodeData(node, data);
                treeData.setNodeData(node.initializer, data); // TODO remove this when simplify generation
              }
            }
          }

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
              const data = treeData.getNodeData(declarations[0]);
              if (data) {
                let fields = data.fields;
                paths.forEach(path => {
                  if (!fields[path]) {
                    fields[path] = {};
                  }
                  fields = fields[path];
                });

                treeData.setNodeData(node, {
                  query: `${data.query}#${paths.join('.')}`,
                  fields: fields
                });
              }
            }
          }

          if (ts.isVariableDeclaration(node)) {
            if (
              node.initializer &&
              ts.isPropertyAccessExpression(node.initializer)
            ) {
              ts.visitEachChild(node, functionVisitor, ctx);
              const data = treeData.getNodeData(node.initializer);
              if (data) {
                treeData.setNodeData(node, data);
              }
            }
          }

          return ts.visitEachChild(node, functionVisitor, ctx);
        };

        ts.visitEachChild(node, functionVisitor, ctx);
      }

      if (ts.isCallExpression(node)) {
        const data = treeData.getNodeData(node);
        if (data) {
          function toQuery(obj: any): string {
            return _.map(obj, (value, key) => {
              if (_.isEmpty(value)) return key;
              return `${key} { ${toQuery(value)} }`;
            }).join('\n');
          }

          return ts.createTaggedTemplate(
            ts.createIdentifier('gql'),
            [],
            ts.createNoSubstitutionTemplateLiteral(`
              query { 
                ${data.query} { 
                  ${toQuery(data.fields)} 
                }
              }
            `)
          );
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
    return (sf: ts.SourceFile) => {
      const result = ts.visitNode(sf, visitor(ctx, sf));
      // console.log(JSON.stringify(treeData, null, 2));
      return result;
    };
  };
}

type FieldAccess = { [key: string]: FieldAccess | {} };

type NodeData = {
  query: string;
  fields: FieldAccess;
};

class TreeData {
  store: NodeData[] = [];

  setNodeData(node: ts.Node, data: NodeData) {
    // @ts-ignore
    node["gqlData"] = data;
    this.store.push(data);
  }

  getNodeData(node: ts.Node) {
    // @ts-ignore
    return node["gqlData"];
  }
}