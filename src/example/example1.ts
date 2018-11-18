import { Query } from './schema';

function getMovies() {
  const movie = Query.movie();
  console.log(movie.id);
  console.log(movie.title);
  console.log(movie.year);
}

console.log(getMovies());
