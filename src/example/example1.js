"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
exports.__esModule = true;
function getMovies() {
    var movie = gql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n                  query { \n                    movie { \n                      id\ntitle\nyear \n                    }\n                  }\n                "], [""])));
    console.log(movie.id);
    console.log(movie.title);
    console.log(movie.year);
}
console.log(getMovies());
var templateObject_1;
