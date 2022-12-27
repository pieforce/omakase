import React from 'react';
import Grid from '@mui/material/Grid';
import Header from '../Header/Header';
import SearchField from '../SearchField/SearchField';
import { useNavigate  } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const searchQuery = React.createRef();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(`/search?q=${searchQuery.current.state.q}`);
    navigate(`/search?q=${searchQuery.current.state.q}`);
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
        <Grid item p={1}>
          <Header />
        </Grid>   
        <Grid
          item p={1}
          sx={{ width: '25%', minWidth: '300px' }}
        >
          <SearchField onSubmit={ handleSubmit } ref={ searchQuery }/>
        </Grid>
      </Grid> 
    </div>
  );
}
