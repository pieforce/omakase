import React, { useEffect, useState, useRef  } from 'react';
import Grid from '@mui/material/Grid';
import SearchField from '../SearchField/SearchField';
import { useSearchParams } from 'react-router-dom';

export default function Search() {
  const searchQuery = React.createRef();
  const [search, setSearch] = useSearchParams();
  const q = search.get('q');

  useEffect(() => {
    console.log(Math.random());
    console.log(q);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(searchQuery.current.state.q)
  }

  return (
    <div className="app">
      <Grid
        container
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ minHeight: '100vh' }}
      >
        <Grid
          item p={1}
          sx={{ width: '25%', minWidth: '300px' }}
        >
          <SearchField onSubmit={ handleSubmit } ref={ searchQuery }/>
          <p>Search results for "{q}"</p>
        </Grid>
      </Grid> 
    </div>
  );
}

;
