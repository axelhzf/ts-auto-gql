interface Person {
  name: string;
}

interface Movie {
  __gql: boolean;
  id: string;
  title: string;
  year: number;
  director: Person;
}

interface Query {
  movie(): Movie;
}

export const Query: Query = undefined as any;
