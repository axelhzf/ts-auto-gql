interface Person {
  name: string;
}

interface Movie2 {
  __gql: boolean;
  id: string;
  title: string;
  year: number;
  director: Person;
}

/*
  @query movie
 */
type MovieQuery = Movie2;

interface Query {
  movie(): MovieQuery;
}

export const Query: Query = undefined as any;
