import { Query } from './schema';

function getMovies() {
  const q = Query.movie();
  console.log(`${q.id} ${q.title}`);
}

getMovies();