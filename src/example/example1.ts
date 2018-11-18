function getMovies() {
    const movie = Query.movie();
    console.log(movie.id);
    console.log(movie.title)
}


type Movie = {
    id: string;
    title: string;
    year: number;
}

const Query = {
    movie() {
        return {} as Movie;
    }
};

console.log(getMovies());
