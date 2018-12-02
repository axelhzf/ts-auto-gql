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
          // console.log('node', node.getText(sf), node.kind);

          function visitEachChild() {
            return ts.visitEachChild(node, functionVisitor, ctx);
          }

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
                const data = { query, fields: {}, isRootQuery: true };
                treeData.setNodeData(node, data);
                treeData.setNodeData(node.initializer, data); // TODO remove this when simplify generation
              }
            }

            // Don't visit child here, let it pass
          }

          if (ts.isIdentifier(node)) {
            const symbol = checker.getSymbolAtLocation(node);
            if (symbol) {
              const declarations = symbol.getDeclarations();
              if (declarations) {
                const data = treeData.getNodeData(declarations[0]);
                if (data) {
                  const nodeData = {
                    query: data.query,
                    fields: {}
                  };
                  treeData.setNodeData(node, data);
                  console.log('identifier', node.getText(sf), nodeData);
                }
              }
            }
          }

          if (ts.isPropertyAccessExpression(node)) {
            const result = visitEachChild();
            const data = treeData.getNodeData(node.expression);
            if (data) {
              const field = node.name.text;
              const symbol = checker.getSymbolAtLocation(node);
              if (symbol) {
                // TODO better detection of array methods. Check if type it is a method of Array or ReadOnlyArray
                if (symbol.getName() === 'map') {
                  treeData.setNodeData(node, data); // propagate the data but don't add array method as a field
                  return result;
                }
              }
              const nestedField = {};
              data.fields[field] = nestedField;
              const nodeData = {
                query: `${data.query}.${field}`,
                fields: nestedField
              };
              treeData.setNodeData(node, nodeData);
              console.log('property access', node.getText(sf), nodeData);
            }
            return result;
          }

          if (ts.isVariableDeclaration(node)) {
            const result = visitEachChild();
            if (node.initializer) {
              const data = treeData.getNodeData(node.initializer);
              if (data) {
                treeData.setNodeData(node, data);
              }
            }
            return result;
          }

          if (ts.isFunctionExpression(node)) {
            const type = checker.getTypeAtLocation(node);
            if (type) {
              const callSignature = type.getCallSignatures()[0];
              const parameters = callSignature.getParameters();
              const parameter = parameters[0];
              const parameterType = checker.getTypeOfSymbolAtLocation(
                parameters[0],
                node
              );
              // TODO Detect parameter type using type information
              const data = {
                query: `fragment#${parameter.getName()}`,
                fields: {}
              };
              treeData.setNodeData(node.parameters[0], data); // Set data to parameter for access inside the function
              treeData.setNodeData(node, data); // Set data to function expression to access outside the function
            }
            //console.log('function expression parent', node);

            return visitEachChild();
          }

          if (ts.isCallExpression(node)) {
            const result = ts.visitEachChild(node, functionVisitor, ctx);

            const expressionData = treeData.getNodeData(node.expression);
            if (expressionData) {
              const argument = node.arguments[0];
              if (argument) {
                const argumentData = treeData.getNodeData(argument);
                if (argumentData) {
                  Object.assign(expressionData.fields, argumentData.fields);
                  treeData.setNodeData(node, expressionData);
                }
              }
            }

            return result;
          }

          return visitEachChild();
        };

        ts.visitEachChild(node, functionVisitor, ctx);
      }

      if (ts.isCallExpression(node)) {
        const data = treeData.getNodeData(node);
        if (data && data.isRootQuery) {
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
  isRootQuery?: boolean;
};

class TreeData {
  store: NodeData[] = [];

  setNodeData(node: ts.Node, data: NodeData) {
    // @ts-ignore
    node['gqlData'] = data;
    this.store.push(data);
  }

  getNodeData(node: ts.Node): NodeData {
    // @ts-ignore
    return node['gqlData'];
  }
}
