var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
function getMovies() {
    var movie = gql(__makeTemplateObject(["query { movies { id }}"], [""]));
    console.log(movie.id);
    console.log(movie.title);
}
var Query = {
    movie: function () {
        return {};
    }
};
console.log(getMovies());
