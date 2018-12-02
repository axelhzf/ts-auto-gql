import { Query } from './schema';

function getMovies() {
  const movie = Query.movie();
  movie.actors.map(actor => {
    console.log(actor.name);
  });
}

getMovies();