'use strict';
exports.__esModule = true;
var schema_1 = require('./schema');

function getMovies() {
  var movie = gql`
    query {
      Movie {
        id
        title
      }
    }
  `;
  console.log(movie.id);
  console.log(movie.title);
}

console.log(getMovies());
