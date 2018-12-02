import { Query } from './schema';

function getMovies() {
  const movie = Query.movie();
  const director = movie.director;
  console.log(director.name);
}

getMovies();