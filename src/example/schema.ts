
    
    
    
  
    type Movie = {
      id: string;
title: string;
year: number;
    }
  
  
    type Query = {
      movie(): Movie;
    }
  
    export const Query: Query = undefined as any;
  