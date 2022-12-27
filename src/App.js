import Home from './Home/Home';
import Search from './SearchPage/SearchPage';
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom';

export default function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route exact path='/' element={ <Home /> } />
        <Route exact path='/search' element={ <Search /> } />
      </Routes>
    </BrowserRouter>
  );
}
