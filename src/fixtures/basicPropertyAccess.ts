import { Query } from './schema';

function getMovies() {
  const movie = Query.movie();
  console.log(`${movie.id} ${movie.title}`);
}

getMovies();