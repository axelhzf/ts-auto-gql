interface Person {
  name: string;
}

interface Movie {
  id: string;
  title: string;
  year: number;
  director: Person;
  actors: ReadonlyArray<Person>;
}

interface Query {
  movie(): Movie;
}

export const Query: Query = undefined as any;
