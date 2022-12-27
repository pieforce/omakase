import React from 'react';
import FormControl from '@mui/material/FormControl';
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton/IconButton";
import SearchIcon from '@mui/icons-material/Search';

class SearchField extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      q: '',
    };
    this.searchQuery = React.createRef();
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(e) {
    this.setState({ q: e.target.value });
  }

  render() {
    return (
      <form onSubmit={ this.props.onSubmit }>
        <FormControl fullWidth>
          <TextField
            id="search"
            ref={ this.searchQuery }
            onChange={ this.handleChange }
            placeholder="sushi, burgers, donuts, ..."
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit">
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </FormControl>
      </form>
    );
  }
}

export default SearchField;
