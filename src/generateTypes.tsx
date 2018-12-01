import {
  buildSchema,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType
} from 'graphql';
import { readFileSync, writeFileSync } from 'fs';
import * as _ from 'lodash';
import prettier from 'prettier';

function readSchema() {
  const path = `${__dirname}/example/schema.graphql`;
  const schemaSDL = readFileSync(path, 'utf-8');
  const gqlSchema = buildSchema(schemaSDL);
  return gqlSchema;
}

const generated = new Set<string>();

function renderType(type: GraphQLObjectType): string {
  const name = type.name;
  if (generated.has(name)) return '';

  const fields = type.getFields();

  const dependentTypes: string[] = [];

  const fieldsStr = _.map(fields, field => {
    if (field.type instanceof GraphQLNonNull) {
      const t = field.type as GraphQLNonNull<any>;
      const nonNullType = t.ofType;
      if (nonNullType instanceof GraphQLScalarType) {
        return `${field.name}: ${renderScalarType(nonNullType)};`;
      } else if (nonNullType instanceof GraphQLObjectType) {
        dependentTypes.push(renderType(nonNullType));
        return `${field.name}(): ${nonNullType.name};`;
      }
    }
  });

  const out = `
    ${dependentTypes.join('\n\n')}
  
    type ${type.name} = {
      ${fieldsStr.join('\n')}
    }
  `;

  return out;
}

function renderQueryType(type: GraphQLObjectType): string {
  renderType(type);
  const out = `
    ${renderType(type)}
    export const Query: ${type.name} = undefined as any;
  `;
  return out;
}

function renderScalarType(type: GraphQLScalarType) {
  const scalarName = type.name;
  if (scalarName === 'String') return 'string';
  if (scalarName === 'Int') return 'number';
  throw new Error('Invalid scalar type');
}

const gqlSchema = readSchema();
let content = renderQueryType(gqlSchema.getQueryType()!);
content = prettier.format(content, { singleQuote: true, parser: 'typescript' });

writeFileSync(
  `${__dirname}/example/schema.ts`,
  content,
  { encoding: 'utf-8' }
);
