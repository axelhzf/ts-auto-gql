interface Movie {
  __gql: boolean;
  id: string;
  title: string;
  year: number;
}

interface Query {
  movie(): Movie;
}

export const Query: Query = undefined as any;
